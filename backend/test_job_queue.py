"""Tests for the sequential TTS job queue (mock synthesis — no real Kokoro)."""

import threading
import time

from tts.job_queue import AudioJob, JobSubmitResult, TTSJobQueue


def test_two_documents_process_one_at_a_time():
    call_order: list[int] = []
    active_lock = threading.Lock()
    currently_active: list[int] = []
    overlap_detected = False

    def mock_synthesis(document_id: int, _voice_tier: str) -> None:
        nonlocal overlap_detected
        with active_lock:
            if currently_active:
                overlap_detected = True
            currently_active.append(document_id)
        call_order.append(document_id)
        time.sleep(0.05)
        with active_lock:
            currently_active.remove(document_id)

    queue = TTSJobQueue()
    queue.configure(mock_synthesis)

    result_a, _ = queue.submit(1, "gtts", all_blocks_done=False)
    result_b, pos_b = queue.submit(2, "gtts", all_blocks_done=False)

    assert result_a == JobSubmitResult.PROCESSING
    assert result_b == JobSubmitResult.QUEUED
    assert pos_b == 1  # one document ahead in the wait line

    deadline = time.time() + 5
    while time.time() < deadline:
        snapshot = queue.get_snapshot()
        if not snapshot["active_document_id"] and not snapshot["queued_document_ids"]:
            break
        time.sleep(0.05)

    assert call_order == [1, 2]
    assert overlap_detected is False


def test_already_done_without_force():
    queue = TTSJobQueue()
    queue.configure(lambda _doc_id, _tier: None)

    result, _ = queue.submit(10, "gtts", all_blocks_done=True, force=False)
    assert result == JobSubmitResult.ALREADY_DONE


def test_force_regenerates_when_done():
    queue = TTSJobQueue()
    queue.configure(lambda _doc_id, _tier: time.sleep(0.01))

    result, _ = queue.submit(11, "gtts", all_blocks_done=True, force=True)
    assert result == JobSubmitResult.PROCESSING


def test_no_double_queue_same_document():
    queue = TTSJobQueue()
    queue.configure(lambda _doc_id, _tier: time.sleep(0.2))

    first, _ = queue.submit(20, "gtts", all_blocks_done=False)
    second, _ = queue.submit(20, "gtts", all_blocks_done=False)

    assert first == JobSubmitResult.PROCESSING
    assert second == JobSubmitResult.ALREADY_PROCESSING
