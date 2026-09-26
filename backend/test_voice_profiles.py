import io
import os
import wave
from unittest.mock import patch

from fastapi.testclient import TestClient

from database import get_db, SessionLocal
from main import app, Base, engine
from voice_clone.profile_store import VOICE_PROFILES_DIR, profile_dir

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


@patch("routers.voice_profiles.VoiceCloneService")
def test_voice_profile_crud_and_file_cleanup(mock_service_cls):
    service = mock_service_cls.get_instance.return_value
    service.validate_reference_audio.return_value = None
    service.prepare_speaker.return_value = os.path.join("1", "conditionals.pt")

    wav_bytes = _make_wav_bytes()
    create_res = client.post(
        "/voice-clone/profiles",
        files={"reference_audio": ("sample.wav", wav_bytes, "audio/wav")},
        data={"name": "Test Voice"},
    )
    assert create_res.status_code == 201
    profile = create_res.json()
    profile_id = profile["id"]
    assert profile["name"] == "Test Voice"
    assert profile["reference_audio_path"].startswith(f"{profile_id}/")

    list_res = client.get("/voice-clone/profiles")
    assert list_res.status_code == 200
    assert any(p["id"] == profile_id for p in list_res.json())

    rename_res = client.patch(
        f"/voice-clone/profiles/{profile_id}",
        json={"name": "Renamed Voice"},
    )
    assert rename_res.status_code == 200
    assert rename_res.json()["name"] == "Renamed Voice"

    profile_path = profile_dir(profile_id)
    assert os.path.isdir(profile_path)

    delete_res = client.delete(f"/voice-clone/profiles/{profile_id}")
    assert delete_res.status_code == 200
    assert not os.path.exists(profile_path)

    missing_res = client.get("/voice-clone/profiles")
    assert all(p["id"] != profile_id for p in missing_res.json())


@patch("routers.voice_profiles.VoiceCloneService")
def test_default_voice_name(mock_service_cls):
    service = mock_service_cls.get_instance.return_value
    service.validate_reference_audio.return_value = None
    service.prepare_speaker.return_value = None

    wav_bytes = _make_wav_bytes()
    res = client.post(
        "/voice-clone/profiles",
        files={"reference_audio": ("sample.wav", wav_bytes, "audio/wav")},
    )
    assert res.status_code == 201
    name = res.json()["name"]
    assert name.startswith("Voice ")

    profile_id = res.json()["id"]
    client.delete(f"/voice-clone/profiles/{profile_id}")
