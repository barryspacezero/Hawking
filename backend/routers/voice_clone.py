"""Voice cloning API endpoints."""

import base64
import json
import logging
from typing import AsyncGenerator

from fastapi import APIRouter, HTTPException, Request
from starlette.datastructures import UploadFile
from fastapi.responses import Response, StreamingResponse

from upload_limits import MAX_MULTIPART_PART_SIZE
from voice_clone.service import VoiceCloneService
from voice_clone.streaming import stream_synthesize

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/voice-clone", tags=["voice-clone"])

MAX_TEXT_LENGTH = 5000
MAX_REF_SIZE = 10 * 1024 * 1024  # 10MB


async def _read_voice_clone_form(request: Request) -> tuple[str, UploadFile]:
    try:
        form = await request.form(max_part_size=MAX_MULTIPART_PART_SIZE)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read upload: {str(e)}")

    text = form.get("text")
    reference_audio = form.get("reference_audio")
    if not isinstance(text, str) or not text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty.")
    if reference_audio is None or not isinstance(reference_audio, UploadFile):
        raise HTTPException(status_code=400, detail="Reference audio file is required.")
    return text, reference_audio


@router.post("/synthesize")
async def synthesize_voice_clone(request: Request):
    """Full-file voice-cloned synthesis from reference audio + text."""
    text, reference_audio = await _read_voice_clone_form(request)
    if not text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty.")
    if len(text) > MAX_TEXT_LENGTH:
        raise HTTPException(status_code=400, detail=f"Text exceeds {MAX_TEXT_LENGTH} character limit.")

    ref_bytes = await reference_audio.read()
    if len(ref_bytes) > MAX_REF_SIZE:
        raise HTTPException(status_code=413, detail="Reference audio too large (max 10MB).")
    if len(ref_bytes) == 0:
        raise HTTPException(status_code=400, detail="Reference audio file is empty.")

    service = VoiceCloneService.get_instance()
    ref_path = None
    try:
        ref_path = service.save_reference_upload(ref_bytes, reference_audio.filename or "reference.wav")
        waveform, sample_rate = service.clone_and_synthesize(text, ref_path)
        wav_bytes = service.waveform_to_wav_bytes(waveform, sample_rate)
        return Response(
            content=wav_bytes,
            media_type="audio/wav",
            headers={"Content-Disposition": 'attachment; filename="voice-clone.wav"'},
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Voice clone synthesis failed: {e}")
        raise HTTPException(status_code=500, detail=f"Synthesis failed: {str(e)}")


async def _sse_voice_stream(text: str, ref_path: str) -> AsyncGenerator[str, None]:
    """Generate SSE events with audio chunks and metrics."""
    service = VoiceCloneService.get_instance()
    final_metrics = None

    try:
        for chunk, metrics in stream_synthesize(text, ref_path):
            final_metrics = metrics
            wav_bytes = service.waveform_to_wav_bytes(chunk.waveform, chunk.sample_rate)
            event_data = {
                "type": "audio",
                "chunk_index": chunk.index,
                "is_last": chunk.is_last,
                "text": chunk.text,
                "sample_rate": chunk.sample_rate,
                "data": base64.b64encode(wav_bytes).decode("ascii"),
            }
            yield f"data: {json.dumps(event_data)}\n\n"

        if final_metrics:
            metrics_event = {"type": "metrics", **final_metrics.to_dict()}
            yield f"data: {json.dumps(metrics_event)}\n\n"

        yield f"data: {json.dumps({'type': 'done'})}\n\n"
    except Exception as e:
        logger.error(f"Streaming synthesis failed: {e}")
        yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"


@router.post("/stream")
async def stream_voice_clone(request: Request):
    """Stream voice-cloned audio chunks via Server-Sent Events."""
    text, reference_audio = await _read_voice_clone_form(request)
    if not text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty.")
    if len(text) > MAX_TEXT_LENGTH:
        raise HTTPException(status_code=400, detail=f"Text exceeds {MAX_TEXT_LENGTH} character limit.")

    ref_bytes = await reference_audio.read()
    if len(ref_bytes) > MAX_REF_SIZE:
        raise HTTPException(status_code=413, detail="Reference audio too large (max 10MB).")
    if len(ref_bytes) == 0:
        raise HTTPException(status_code=400, detail="Reference audio file is empty.")

    service = VoiceCloneService.get_instance()
    try:
        ref_path = service.save_reference_upload(ref_bytes, reference_audio.filename or "reference.wav")
        service.validate_reference_audio(ref_path)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return StreamingResponse(
        _sse_voice_stream(text, ref_path),
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
    except ImportError as e:
        return {"status": "unavailable", "error": str(e)}
