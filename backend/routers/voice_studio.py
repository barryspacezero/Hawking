"""Voice Clone Studio — queued generation from text, documents, or uploads."""

import logging
import os
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from starlette.datastructures import UploadFile

from database import get_db
import models
import schemas
from tts.job_queue import JobSubmitResult, tts_job_queue
from upload_limits import MAX_MULTIPART_PART_SIZE
from voice_clone.studio_generation import STUDIO_AUDIO_DIR
from voice_clone.studio_input import (
    MAX_STUDIO_TEXT_CHARS,
    text_from_document,
    text_from_typed_input,
    text_from_upload,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/voice-clone/studio", tags=["voice-clone-studio"])


def _derive_studio_status(job: models.StudioGeneration) -> str:
    if job.status in {"done", "failed"}:
        return job.status

    snapshot = tts_job_queue.get_snapshot(studio_job_id=job.id)
    if snapshot.get("active_studio_job_id") == job.id:
        return "processing"
    if job.id in snapshot.get("queued_studio_job_ids", []):
        return "queued"
    return job.status or "queued"


def _job_to_schema(job: models.StudioGeneration) -> schemas.StudioGenerationSchema:
    snapshot = tts_job_queue.get_snapshot(studio_job_id=job.id)
    status = _derive_studio_status(job)
    return schemas.StudioGenerationSchema(
        id=job.id,
        voice_profile_id=job.voice_profile_id,
        input_type=job.input_type,
        source_document_id=job.source_document_id,
        source_filename=job.source_filename,
        text_preview=job.input_text[:200],
        status=status,
        queue_position=snapshot.get("queue_position"),
        active_studio_job_id=snapshot.get("active_studio_job_id"),
        error_message=job.error_message,
        created_at=job.created_at,
        has_audio=bool(job.audio_path and job.status == "done"),
    )


@router.post("/generate", response_model=schemas.StudioGenerationSchema, status_code=201)
async def create_studio_generation(request: Request, db: Session = Depends(get_db)):
    try:
        form = await request.form(max_part_size=MAX_MULTIPART_PART_SIZE)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to read request: {exc}")

    profile_id_raw = form.get("voice_profile_id")
    input_mode = form.get("input_mode")
    if profile_id_raw in (None, ""):
        raise HTTPException(status_code=400, detail="voice_profile_id is required.")
    if not isinstance(input_mode, str) or input_mode not in {"text", "document", "file"}:
        raise HTTPException(status_code=400, detail="input_mode must be text, document, or file.")

    try:
        voice_profile_id = int(profile_id_raw)
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="Invalid voice_profile_id.")

    profile = db.query(models.VoiceProfile).filter(models.VoiceProfile.id == voice_profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Voice profile not found.")

    source_document_id: Optional[int] = None
    source_filename: Optional[str] = None

    try:
        if input_mode == "text":
            text_raw = form.get("text")
            if not isinstance(text_raw, str) or not text_raw.strip():
                raise ValueError("Text cannot be empty.")
            input_text = text_from_typed_input(text_raw)
        elif input_mode == "document":
            doc_id_raw = form.get("document_id")
            try:
                document_id = int(doc_id_raw)
            except (TypeError, ValueError):
                raise ValueError("document_id is required for document input.")
            input_text, source_filename = text_from_document(db, document_id)
            source_document_id = document_id
        else:
            upload = form.get("file")
            if upload is None or not isinstance(upload, UploadFile):
                raise ValueError("file is required for file input.")
            content = await upload.read()
            source_filename = upload.filename or "upload.txt"
            input_text = text_from_upload(source_filename, content)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    job = models.StudioGeneration(
        voice_profile_id=voice_profile_id,
        input_type=input_mode,
        source_document_id=source_document_id,
        source_filename=source_filename,
        input_text=input_text,
        status="queued",
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    result, _ = tts_job_queue.submit_studio(job.id)
    if result == JobSubmitResult.PROCESSING:
        job.status = "processing"
    db.commit()
    db.refresh(job)

    return _job_to_schema(job)


@router.get("/jobs/{job_id}", response_model=schemas.StudioGenerationSchema)
def get_studio_generation(job_id: int, db: Session = Depends(get_db)):
    job = db.query(models.StudioGeneration).filter(models.StudioGeneration.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Studio job not found.")
    return _job_to_schema(job)


@router.get("/jobs/{job_id}/audio")
def get_studio_audio(job_id: int, db: Session = Depends(get_db)):
    job = db.query(models.StudioGeneration).filter(models.StudioGeneration.id == job_id).first()
    if not job or not job.audio_path or job.status != "done":
        raise HTTPException(status_code=404, detail="Studio audio not available.")

    filepath = os.path.join(STUDIO_AUDIO_DIR, job.audio_path)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Studio audio file missing on disk.")

    label = (job.source_filename or "studio-output").rsplit(".", 1)[0]
    return FileResponse(
        filepath,
        media_type="audio/wav",
        filename=f"{label}-cloned.wav",
    )


@router.get("/limits")
def studio_limits():
    return {
        "max_text_chars": MAX_STUDIO_TEXT_CHARS,
        "max_file_bytes": 10 * 1024 * 1024,
    }
