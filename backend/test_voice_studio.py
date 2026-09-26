"""Tests for Voice Clone Studio queued generation."""

import io
import struct
import wave
from unittest.mock import patch

import numpy as np
from fastapi.testclient import TestClient

from database import get_db, SessionLocal
from main import app, Base, engine
import models

Base.metadata.create_all(bind=engine)


def override_get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


def _make_wav_bytes(duration_s: float = 3.5, sample_rate: int = 16000) -> bytes:
    frames = int(duration_s * sample_rate)
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(sample_rate)
        wav.writeframes(b"\x00\x01" * frames)
    return buf.getvalue()


def _make_fake_wav_file(path: str, duration_s: float = 0.5, sample_rate: int = 24000) -> None:
    frames = int(duration_s * sample_rate)
    samples = (np.sin(np.linspace(0, 12, frames)) * 0.2).astype(np.float32)
    with wave.open(path, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(sample_rate)
        wav.writeframes(struct.pack(f"<{frames}h", *np.clip(samples * 32767, -32768, 32767).astype(int)))


@patch("voice_clone.service.VoiceCloneService")
def _create_profile(mock_service_cls) -> int:
    service = mock_service_cls.get_instance.return_value
    service.validate_reference_audio.return_value = None
    service.prepare_speaker.return_value = None

    res = client.post(
        "/voice-clone/profiles",
        files={"reference_audio": ("sample.wav", _make_wav_bytes(), "audio/wav")},
        data={"name": "Studio Test Voice"},
    )
    assert res.status_code == 201
    return res.json()["id"]


@patch("voice_clone.studio_generation.VoiceCloneService")
def test_studio_generate_from_text(mock_service_cls):
    profile_id = _create_profile()
    service = mock_service_cls.get_instance.return_value
    service.clone_and_synthesize.return_value = (
        np.zeros(24000, dtype=np.float32),
        24000,
    )

    res = client.post(
        "/voice-clone/studio/generate",
        data={
            "voice_profile_id": str(profile_id),
            "input_mode": "text",
            "text": "Hello from the voice clone studio.",
        },
    )
    assert res.status_code == 201
    job = res.json()
    assert job["input_type"] == "text"
    assert job["status"] in {"processing", "done", "queued"}

    deadline = 10
    import time
    start = time.time()
    while time.time() - start < deadline:
        status_res = client.get(f"/voice-clone/studio/jobs/{job['id']}")
        assert status_res.status_code == 200
        payload = status_res.json()
        if payload["status"] == "done":
            audio_res = client.get(f"/voice-clone/studio/jobs/{job['id']}/audio")
            assert audio_res.status_code == 200
            assert audio_res.headers["content-type"].startswith("audio/")
            assert len(audio_res.content) > 1000
            break
        if payload["status"] == "failed":
            raise AssertionError(payload.get("error_message"))
        time.sleep(0.1)
    else:
        raise AssertionError("Studio text job did not complete in time")


@patch("voice_clone.studio_generation.VoiceCloneService")
def test_studio_generate_from_existing_document(mock_service_cls):
    profile_id = _create_profile()
    service = mock_service_cls.get_instance.return_value
    service.clone_and_synthesize.return_value = (
        np.zeros(24000, dtype=np.float32),
        24000,
    )

    doc_res = client.post(
        "/documents/text",
        json={"title": "Studio Doc", "text": "Paragraph one.\n\nParagraph two for studio."},
    )
    assert doc_res.status_code == 200
    document_id = doc_res.json()["id"]

    res = client.post(
        "/voice-clone/studio/generate",
        data={
            "voice_profile_id": str(profile_id),
            "input_mode": "document",
            "document_id": str(document_id),
        },
    )
    assert res.status_code == 201
    job_id = res.json()["id"]

    import time
    start = time.time()
    while time.time() - start < 10:
        payload = client.get(f"/voice-clone/studio/jobs/{job_id}").json()
        if payload["status"] == "done":
            audio_res = client.get(f"/voice-clone/studio/jobs/{job_id}/audio")
            assert audio_res.status_code == 200
            assert len(audio_res.content) > 1000
            return
        if payload["status"] == "failed":
            raise AssertionError(payload.get("error_message"))
        time.sleep(0.1)
    raise AssertionError("Studio document job did not complete in time")


@patch("voice_clone.studio_generation.VoiceCloneService")
def test_studio_generate_from_file_upload(mock_service_cls):
    profile_id = _create_profile()
    service = mock_service_cls.get_instance.return_value
    service.clone_and_synthesize.return_value = (
        np.zeros(24000, dtype=np.float32),
        24000,
    )

    txt = b"Uploaded studio text from a plain file.\n\nSecond paragraph here."
    res = client.post(
        "/voice-clone/studio/generate",
        data={"voice_profile_id": str(profile_id), "input_mode": "file"},
        files={"file": ("studio.txt", txt, "text/plain")},
    )
    assert res.status_code == 201
    job_id = res.json()["id"]

    import time
    start = time.time()
    while time.time() - start < 10:
        payload = client.get(f"/voice-clone/studio/jobs/{job_id}").json()
        if payload["status"] == "done":
            audio_res = client.get(f"/voice-clone/studio/jobs/{job_id}/audio")
            assert audio_res.status_code == 200
            assert len(audio_res.content) > 1000
            return
        if payload["status"] == "failed":
            raise AssertionError(payload.get("error_message"))
        time.sleep(0.1)
    raise AssertionError("Studio file job did not complete in time")
