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
    document_id: int
    voice_tier: str
    force: bool = False


class TTSJobQueue:
    """Process exactly one document's audio-generation job at a time."""

    def __init__(self) -> None:
        self._mutex = threading.Lock()
        self._queue: Deque[AudioJob] = deque()
        self._active_job: Optional[AudioJob] = None
        self._active_document_id: Optional[int] = None
        self._worker_thread: Optional[threading.Thread] = None
        self._synthesis_fn: Optional[Callable[[int, str], None]] = None
        self._stop = False

    def configure(self, synthesis_fn: Callable[[int, str], None]) -> None:
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

        job = AudioJob(document_id=document_id, voice_tier=voice_tier, force=force)

        with self._mutex:
            if self._active_document_id == document_id:
                return JobSubmitResult.ALREADY_PROCESSING, None

            if any(existing.document_id == document_id for existing in self._queue):
                return JobSubmitResult.ALREADY_QUEUED, self._queue_position(document_id)

            if self._active_job is not None:
                self._queue.append(job)
                self._ensure_worker()
                return JobSubmitResult.QUEUED, self._queue_position(document_id)

            self._active_job = job
            self._active_document_id = document_id
            self._ensure_worker()
            return JobSubmitResult.PROCESSING, None

    def get_snapshot(self, document_id: Optional[int] = None) -> dict:
        with self._mutex:
            queued_ids = [job.document_id for job in self._queue]
            position = self._queue_position(document_id) if document_id else None
            return {
                "active_document_id": self._active_document_id,
                "queued_document_ids": queued_ids,
                "queue_position": position,
            }

    def _queue_position(self, document_id: int) -> Optional[int]:
        """How many documents are ahead of this one in line."""
        ahead = (
            1
            if self._active_document_id is not None and self._active_document_id != document_id
            else 0
        )
        for idx, job in enumerate(self._queue):
            if job.document_id == document_id:
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
                    self._active_document_id = job.document_id

            if job is None:
                time.sleep(0.05)
                continue

            try:
                if self._synthesis_fn is None:
                    raise RuntimeError("TTS job queue synthesis function not configured")
                logger.info("TTS queue processing document %s", job.document_id)
                self._synthesis_fn(job.document_id, job.voice_tier)
            except Exception as exc:
                logger.error("TTS queue failed for document %s: %s", job.document_id, exc)
            finally:
                with self._mutex:
                    if self._active_job and self._active_job.document_id == job.document_id:
                        self._active_job = None
                        self._active_document_id = None


# Module-level singleton used by the API
tts_job_queue = TTSJobQueue()
