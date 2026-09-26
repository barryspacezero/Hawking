"""Voice cloning API endpoints."""

import asyncio
import base64
import json
import logging
from typing import AsyncGenerator, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from starlette.datastructures import UploadFile
from fastapi.responses import Response, StreamingResponse

from database import get_db
import models
from upload_limits import MAX_MULTIPART_PART_SIZE
from voice_clone.service import VoiceCloneService
from voice_clone.streaming import stream_synthesize
from routers.voice_profiles import get_profile_conditioning_path, get_profile_reference_path

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/voice-clone", tags=["voice-clone"])

MAX_TEXT_LENGTH = 5000
MAX_REF_SIZE = 10 * 1024 * 1024  # 10MB


def _persist_conditioning_cache(db: Session, profile_id: int) -> None:
    profile = db.query(models.VoiceProfile).filter(models.VoiceProfile.id == profile_id).first()
    if profile and not profile.conditioning_path:
        profile.conditioning_path = f"{profile_id}/conditionals.pt"
        db.commit()


async def _read_voice_clone_form(
    request: Request,
    db: Session,
) -> tuple[str, str, Optional[str], Optional[int]]:
    try:
        form = await request.form(max_part_size=MAX_MULTIPART_PART_SIZE)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to read upload: {exc}")

    text = form.get("text")
    if not isinstance(text, str) or not text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty.")

    profile_id_raw = form.get("profile_id")
    if profile_id_raw not in (None, ""):
        try:
            profile_id = int(profile_id_raw)
        except (TypeError, ValueError):
            raise HTTPException(status_code=400, detail="Invalid profile_id.")

        profile = db.query(models.VoiceProfile).filter(models.VoiceProfile.id == profile_id).first()
        if not profile:
            raise HTTPException(status_code=404, detail="Voice profile not found.")
        ref_path = get_profile_reference_path(profile)
        cond_path = get_profile_conditioning_path(profile)
        return text, ref_path, cond_path, profile_id

    reference_audio = form.get("reference_audio")
    if reference_audio is None or not isinstance(reference_audio, UploadFile):
        raise HTTPException(status_code=400, detail="Reference audio file or profile_id is required.")

    ref_bytes = await reference_audio.read()
    if len(ref_bytes) > MAX_REF_SIZE:
        raise HTTPException(status_code=413, detail="Reference audio too large (max 10MB).")
    if len(ref_bytes) == 0:
        raise HTTPException(status_code=400, detail="Reference audio file is empty.")

    service = VoiceCloneService.get_instance()
    ref_path = service.save_reference_upload(ref_bytes, reference_audio.filename or "reference.wav")
    return text, ref_path, None, None


@router.post("/synthesize")
async def synthesize_voice_clone(request: Request, db: Session = Depends(get_db)):
    """Full-file voice-cloned synthesis from a saved profile or reference upload."""
    text, ref_path, cond_path, profile_id = await _read_voice_clone_form(request, db)
    if len(text) > MAX_TEXT_LENGTH:
        raise HTTPException(status_code=400, detail=f"Text exceeds {MAX_TEXT_LENGTH} character limit.")

    service = VoiceCloneService.get_instance()
    try:
        cached = service.prepare_speaker(ref_path, conditioning_path=cond_path)
        if cached and profile_id is not None:
            _persist_conditioning_cache(db, profile_id)

        waveform, sample_rate = service.clone_and_synthesize(text, ref_path, conditioning_path=cond_path)
        wav_bytes = service.waveform_to_wav_bytes(waveform, sample_rate)
        return Response(
            content=wav_bytes,
            media_type="audio/wav",
            headers={"Content-Disposition": 'attachment; filename="voice-clone.wav"'},
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        logger.error("Voice clone synthesis failed: %s", exc)
        raise HTTPException(status_code=500, detail=f"Synthesis failed: {exc}")


def _sse_payload(event: dict) -> str:
    return f"data: {json.dumps(event)}\n\n"


async def _sse_voice_stream(
    text: str,
    ref_path: str,
    cond_path: Optional[str] = None,
    profile_id: Optional[int] = None,
    db: Optional[Session] = None,
) -> AsyncGenerator[str, None]:
    """Generate SSE events with audio chunks and metrics."""
    service = VoiceCloneService.get_instance()
    final_metrics = None
    loop = asyncio.get_running_loop()
    chunk_iter = stream_synthesize(text, ref_path, conditioning_path=cond_path)

    def _next_chunk():
        try:
            return next(chunk_iter)
        except StopIteration:
            return None

    try:
        yield _sse_payload({
            "type": "status",
            "message": "Loading voice model — first run can take up to a minute on CPU...",
        })

        while True:
            result = await loop.run_in_executor(None, _next_chunk)
            if result is None:
                break
            chunk, metrics = result

            if chunk.index == 0 and profile_id is not None and db is not None:
                _persist_conditioning_cache(db, profile_id)

            final_metrics = metrics
            wav_bytes = service.waveform_to_wav_bytes(chunk.waveform, chunk.sample_rate)
            yield _sse_payload({
                "type": "audio",
                "chunk_index": chunk.index,
                "is_last": chunk.is_last,
                "text": chunk.text,
                "sample_rate": chunk.sample_rate,
                "data": base64.b64encode(wav_bytes).decode("ascii"),
            })

        if final_metrics:
            yield _sse_payload({"type": "metrics", **final_metrics.to_dict()})

        yield _sse_payload({"type": "done"})
    except Exception as exc:
        logger.error("Streaming synthesis failed: %s", exc)
        yield _sse_payload({"type": "error", "message": str(exc)})


@router.post("/stream")
async def stream_voice_clone(request: Request, db: Session = Depends(get_db)):
    """Stream voice-cloned audio chunks via Server-Sent Events."""
    text, ref_path, cond_path, profile_id = await _read_voice_clone_form(request, db)
    if len(text) > MAX_TEXT_LENGTH:
        raise HTTPException(status_code=400, detail=f"Text exceeds {MAX_TEXT_LENGTH} character limit.")

    service = VoiceCloneService.get_instance()
    try:
        service.validate_reference_audio(ref_path)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    return StreamingResponse(
        _sse_voice_stream(text, ref_path, cond_path, profile_id, db),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/health")
def voice_clone_health():
    """Check if voice cloning dependencies are available."""
    try:
        import torch
        from chatterbox.tts import ChatterboxTTS
        return {
            "status": "available",
            "engine": "chatterbox-tts",
            "device": "cpu" if not torch.cuda.is_available() else "cuda",
        }
    except ImportError as exc:
        return {"status": "unavailable", "error": str(exc)}
