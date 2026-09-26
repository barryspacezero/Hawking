"""
Sequential in-process TTS job queue.

Why not Celery/Redis? This app runs as a single FastAPI process with one Kokoro
singleton. A lightweight thread + deque is enough to guarantee one document at
a time without extra infrastructure. At scale (many concurrent users), we would
move to Redis + Celery/RQ and likely separate TTS workers.
"""

from __future__ import annotations

import logging
import threading
import time
from collections import deque
from dataclasses import dataclass
from enum import Enum
from typing import Callable, Deque, Optional

logger = logging.getLogger(__name__)


class JobSubmitResult(str, Enum):
    PROCESSING = "processing"
    QUEUED = "queued"
    ALREADY_DONE = "already_done"
    ALREADY_QUEUED = "already_queued"
    ALREADY_PROCESSING = "already_processing"


@dataclass(frozen=True)
class AudioJob:
    kind: str = "document"  # document | studio
    document_id: Optional[int] = None
    studio_job_id: Optional[int] = None
    voice_tier: str = "gtts"
    force: bool = False


class TTSJobQueue:
    """Process exactly one audio-generation job at a time."""

    def __init__(self) -> None:
        self._mutex = threading.Lock()
        self._queue: Deque[AudioJob] = deque()
        self._active_job: Optional[AudioJob] = None
        self._worker_thread: Optional[threading.Thread] = None
        self._synthesis_fn: Optional[Callable[[AudioJob], None]] = None
        self._stop = False

    def configure(self, synthesis_fn: Callable[[AudioJob], None]) -> None:
        self._synthesis_fn = synthesis_fn

    def submit(
        self,
        document_id: int,
        voice_tier: str,
        *,
        force: bool = False,
        all_blocks_done: bool = False,
    ) -> tuple[JobSubmitResult, Optional[int]]:
        """
        Enqueue a document for audio generation.

        Returns (result, queue_position). queue_position counts how many
        documents are ahead when queued (1 = one document ahead).
        """
        if not force and all_blocks_done:
            return JobSubmitResult.ALREADY_DONE, None

        job = AudioJob(
            kind="document",
            document_id=document_id,
            voice_tier=voice_tier,
            force=force,
        )
        return self._enqueue(job)

    def submit_studio(self, studio_job_id: int) -> tuple[JobSubmitResult, Optional[int]]:
        job = AudioJob(kind="studio", studio_job_id=studio_job_id)
        return self._enqueue(job)

    def _enqueue(self, job: AudioJob) -> tuple[JobSubmitResult, Optional[int]]:
        with self._mutex:
            if self._is_active(job):
                return JobSubmitResult.ALREADY_PROCESSING, None

            if self._is_queued(job):
                return JobSubmitResult.ALREADY_QUEUED, self._queue_position(job)

            if self._active_job is not None:
                self._queue.append(job)
                self._ensure_worker()
                return JobSubmitResult.QUEUED, self._queue_position(job)

            self._active_job = job
            self._ensure_worker()
            return JobSubmitResult.PROCESSING, None

    def get_snapshot(
        self,
        document_id: Optional[int] = None,
        studio_job_id: Optional[int] = None,
    ) -> dict:
        with self._mutex:
            queued_document_ids = [
                job.document_id for job in self._queue if job.kind == "document" and job.document_id
            ]
            queued_studio_job_ids = [
                job.studio_job_id for job in self._queue if job.kind == "studio" and job.studio_job_id
            ]
            return {
                "active_document_id": self._active_job.document_id
                if self._active_job and self._active_job.kind == "document"
                else None,
                "active_studio_job_id": self._active_job.studio_job_id
                if self._active_job and self._active_job.kind == "studio"
                else None,
                "queued_document_ids": queued_document_ids,
                "queued_studio_job_ids": queued_studio_job_ids,
                "queue_position": self._queue_position_for(document_id, studio_job_id),
            }

    def _job_key(self, job: AudioJob) -> tuple[str, int]:
        if job.kind == "studio":
            return ("studio", job.studio_job_id or -1)
        return ("document", job.document_id or -1)

    def _is_active(self, job: AudioJob) -> bool:
        return self._active_job is not None and self._job_key(self._active_job) == self._job_key(job)

    def _is_queued(self, job: AudioJob) -> bool:
        key = self._job_key(job)
        return any(self._job_key(existing) == key for existing in self._queue)

    def _queue_position(self, job: AudioJob) -> Optional[int]:
        return self._queue_position_for(
            job.document_id if job.kind == "document" else None,
            job.studio_job_id if job.kind == "studio" else None,
        )

    def _queue_position_for(
        self,
        document_id: Optional[int],
        studio_job_id: Optional[int],
    ) -> Optional[int]:
        target_key = None
        if document_id is not None:
            target_key = ("document", document_id)
        elif studio_job_id is not None:
            target_key = ("studio", studio_job_id)
        if target_key is None:
            return None

        ahead = 1 if self._active_job is not None and self._job_key(self._active_job) != target_key else 0
        for idx, job in enumerate(self._queue):
            if self._job_key(job) == target_key:
                return ahead + idx
        return None

    def _ensure_worker(self) -> None:
        if self._worker_thread and self._worker_thread.is_alive():
            return
        self._worker_thread = threading.Thread(target=self._worker_loop, daemon=True)
        self._worker_thread.start()

    def _worker_loop(self) -> None:
        while not self._stop:
            job: Optional[AudioJob] = None
            with self._mutex:
                if self._active_job is not None:
                    job = self._active_job
                elif self._queue:
                    job = self._queue.popleft()
                    self._active_job = job

            if job is None:
                time.sleep(0.05)
                continue

            try:
                if self._synthesis_fn is None:
                    raise RuntimeError("TTS job queue synthesis function not configured")
                label = (
                    f"studio job {job.studio_job_id}"
                    if job.kind == "studio"
                    else f"document {job.document_id}"
                )
                logger.info("TTS queue processing %s", label)
                self._synthesis_fn(job)
            except Exception as exc:
                logger.error("TTS queue failed for %s: %s", job, exc)
            finally:
                with self._mutex:
                    if self._active_job and self._job_key(self._active_job) == self._job_key(job):
                        self._active_job = None


# Module-level singleton used by the API
tts_job_queue = TTSJobQueue()
