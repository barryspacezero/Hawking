"""CRUD endpoints for saved voice clone profiles."""

import logging
import os
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import func
from sqlalchemy.orm import Session
from starlette.datastructures import UploadFile

from database import get_db
import models
import schemas
from upload_limits import MAX_MULTIPART_PART_SIZE
from voice_clone.profile_store import (
    conditioning_path,
    delete_profile_files,
    ensure_profile_dir,
    reference_path,
    relative_conditioning_path,
    relative_reference_path,
    resolve_profile_path,
)
from voice_clone.service import VoiceCloneService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/voice-clone/profiles", tags=["voice-profiles"])

MAX_REF_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_EXTENSIONS = {".wav", ".mp3", ".ogg", ".flac", ".m4a", ".webm"}


def _default_profile_name(db: Session) -> str:
    count = db.query(func.count(models.VoiceProfile.id)).scalar() or 0
    return f"Voice {count + 1}"


def _profile_to_schema(profile: models.VoiceProfile) -> schemas.VoiceProfileSchema:
    return schemas.VoiceProfileSchema.model_validate(profile)


@router.get("", response_model=list[schemas.VoiceProfileSchema])
def list_voice_profiles(db: Session = Depends(get_db)):
    profiles = db.query(models.VoiceProfile).order_by(models.VoiceProfile.created_at.desc()).all()
    return [_profile_to_schema(p) for p in profiles]


@router.post("", response_model=schemas.VoiceProfileSchema, status_code=201)
async def create_voice_profile(request: Request, db: Session = Depends(get_db)):
    try:
        form = await request.form(max_part_size=MAX_MULTIPART_PART_SIZE)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to read upload: {exc}")

    reference_audio = form.get("reference_audio")
    if reference_audio is None or not isinstance(reference_audio, UploadFile):
        raise HTTPException(status_code=400, detail="Reference audio file is required.")

    name_raw = form.get("name")
    name = name_raw.strip() if isinstance(name_raw, str) and name_raw.strip() else _default_profile_name(db)

    ref_bytes = await reference_audio.read()
    if len(ref_bytes) > MAX_REF_SIZE:
        raise HTTPException(status_code=413, detail="Reference audio too large (max 10MB).")
    if len(ref_bytes) == 0:
        raise HTTPException(status_code=400, detail="Reference audio file is empty.")

    ext = Path(reference_audio.filename or "reference.wav").suffix.lower() or ".wav"
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Unsupported audio format. Use WAV, MP3, OGG, or FLAC.")

    profile = models.VoiceProfile(
        name=name,
        reference_audio_path="",
        conditioning_path=None,
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)

    ensure_profile_dir(profile.id)
    dest = reference_path(profile.id, ext)
    with open(dest, "wb") as handle:
        handle.write(ref_bytes)

    service = VoiceCloneService.get_instance()
    cond_rel = relative_conditioning_path(profile.id)
    cond_abs = conditioning_path(profile.id)
    try:
        service.validate_reference_audio(dest)
        cached = service.prepare_speaker(dest, conditioning_path=cond_abs)
        profile.reference_audio_path = relative_reference_path(profile.id, ext)
        profile.conditioning_path = cond_rel if cached else None
        db.commit()
        db.refresh(profile)
    except ValueError as exc:
        delete_profile_files(profile.id)
        db.delete(profile)
        db.commit()
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        delete_profile_files(profile.id)
        db.delete(profile)
        db.commit()
        logger.error("Failed to prepare voice profile: %s", exc)
        raise HTTPException(status_code=500, detail=f"Failed to prepare voice profile: {exc}")

    return _profile_to_schema(profile)


@router.patch("/{profile_id}", response_model=schemas.VoiceProfileSchema)
def rename_voice_profile(
    profile_id: int,
    request: schemas.VoiceProfileUpdateRequest,
    db: Session = Depends(get_db),
):
    profile = db.query(models.VoiceProfile).filter(models.VoiceProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Voice profile not found.")

    name = request.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name cannot be empty.")

    profile.name = name
    db.commit()
    db.refresh(profile)
    return _profile_to_schema(profile)


@router.delete("/{profile_id}")
def delete_voice_profile(profile_id: int, db: Session = Depends(get_db)):
    profile = db.query(models.VoiceProfile).filter(models.VoiceProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Voice profile not found.")

    delete_profile_files(profile_id)
    db.delete(profile)
    db.commit()
    return {"message": "Voice profile deleted."}


def get_profile_reference_path(profile: models.VoiceProfile) -> str:
    from voice_clone.profile_store import profile_reference_abs
    try:
        return profile_reference_abs(profile)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Voice profile reference audio is missing.")


def get_profile_conditioning_path(profile: models.VoiceProfile) -> Optional[str]:
    from voice_clone.profile_store import profile_conditioning_abs
    return profile_conditioning_abs(profile)


