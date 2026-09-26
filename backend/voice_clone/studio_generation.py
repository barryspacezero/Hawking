"""Queued voice-clone studio audio generation."""

from __future__ import annotations

import logging
import os
import uuid

import soundfile as sf

from database import SessionLocal
import models
from voice_clone.profile_store import profile_conditioning_abs, profile_reference_abs
from voice_clone.service import VoiceCloneService

logger = logging.getLogger(__name__)

STUDIO_AUDIO_DIR = os.path.join(
    os.path.dirname(os.path.dirname(__file__)), "data", "studio_audio"
)
os.makedirs(STUDIO_AUDIO_DIR, exist_ok=True)


def generate_studio_audio(studio_job_id: int) -> None:
    """Synthesize studio audio for a queued job using the saved voice profile."""
    db = SessionLocal()
    try:
        job = db.query(models.StudioGeneration).filter(
            models.StudioGeneration.id == studio_job_id
        ).first()
        if not job:
            logger.error("Studio job %s not found", studio_job_id)
            return

        job.status = "processing"
        job.error_message = None
        db.commit()

        profile = db.query(models.VoiceProfile).filter(
            models.VoiceProfile.id == job.voice_profile_id
        ).first()
        if not profile:
            raise ValueError("Voice profile not found.")

        ref_path = profile_reference_abs(profile)
        cond_path = profile_conditioning_abs(profile)
        text = (job.input_text or "").strip()
        if not text:
            raise ValueError("No text to synthesize.")

        service = VoiceCloneService.get_instance()
        waveform, sample_rate = service.clone_and_synthesize(
            text,
            ref_path,
            conditioning_path=cond_path,
        )

        filename = f"studio_{studio_job_id}_{uuid.uuid4().hex[:8]}.wav"
        filepath = os.path.join(STUDIO_AUDIO_DIR, filename)
        sf.write(filepath, waveform, sample_rate)

        if job.audio_path:
            old_path = os.path.join(STUDIO_AUDIO_DIR, job.audio_path)
            if os.path.exists(old_path):
                try:
                    os.remove(old_path)
                except OSError as exc:
                    logger.warning("Failed to remove old studio audio %s: %s", old_path, exc)

        job.audio_path = filename
        job.status = "done"
        db.commit()
        logger.info("Studio job %s completed", studio_job_id)
    except Exception as exc:
        logger.error("Studio job %s failed: %s", studio_job_id, exc)
        job = db.query(models.StudioGeneration).filter(
            models.StudioGeneration.id == studio_job_id
        ).first()
        if job:
            job.status = "failed"
            job.error_message = str(exc)
            db.commit()
    finally:
        db.close()
