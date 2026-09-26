"""Dispatch queued TTS jobs to document or studio handlers."""

from tts.audio_generation import generate_audio_for_document
from tts.job_queue import AudioJob
from voice_clone.studio_generation import generate_studio_audio


def dispatch_tts_job(job: AudioJob) -> None:
    if job.kind == "studio":
        if job.studio_job_id is None:
            raise ValueError("Studio job missing studio_job_id")
        generate_studio_audio(job.studio_job_id)
        return

    if job.document_id is None:
        raise ValueError("Document job missing document_id")
    generate_audio_for_document(job.document_id, job.voice_tier)
