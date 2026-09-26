"""Voice cloning service using Chatterbox TTS."""

import hashlib
import logging
import os
import tempfile
from pathlib import Path

import numpy as np
import soundfile as sf
import torch

logger = logging.getLogger(__name__)

VOICE_REFS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "voice_refs")
os.makedirs(VOICE_REFS_DIR, exist_ok=True)

MIN_REF_DURATION = 3.0
MAX_REF_DURATION = 30.0


class VoiceCloneService:
    _instance = None

    def __init__(self):
        self._model = None
        self._device = "cpu"
        self._conditionals_cache: dict[str, str] = {}

    @classmethod
    def get_instance(cls) -> "VoiceCloneService":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def load_model(self):
        if self._model is None:
            from chatterbox.tts import ChatterboxTTS
            logger.info("Loading Chatterbox TTS model for voice cloning...")
            self._model = ChatterboxTTS.from_pretrained(device=self._device)
            logger.info("Chatterbox TTS model loaded.")
        return self._model

    def validate_reference_audio(self, audio_path: str) -> None:
        import librosa
        duration = librosa.get_duration(path=audio_path)
        if duration < MIN_REF_DURATION:
            raise ValueError(f"Reference audio must be at least {MIN_REF_DURATION}s (got {duration:.1f}s).")
        if duration > MAX_REF_DURATION:
            raise ValueError(f"Reference audio must be under {MAX_REF_DURATION}s (got {duration:.1f}s).")

        audio, _ = librosa.load(audio_path, sr=None, mono=True)
        rms = float(np.sqrt(np.mean(audio ** 2)))
        if rms < 0.001:
            raise ValueError("Reference audio appears to be silent or too quiet.")

    def _cache_key(self, reference_audio_path: str) -> str:
        with open(reference_audio_path, "rb") as f:
            return hashlib.md5(f.read()).hexdigest()

    def prepare_speaker(self, reference_audio_path: str) -> None:
        """Cache speaker conditioning for a reference clip."""
        self.validate_reference_audio(reference_audio_path)
        key = self._cache_key(reference_audio_path)
        if key in self._conditionals_cache:
            return
        model = self.load_model()
        model.prepare_conditionals(reference_audio_path)
        self._conditionals_cache[key] = reference_audio_path

    def clone_and_synthesize(self, text: str, reference_audio_path: str) -> tuple[np.ndarray, int]:
        """Full-file voice-cloned synthesis. Returns (waveform, sample_rate)."""
        if not text.strip():
            raise ValueError("Text cannot be empty.")

        self.prepare_speaker(reference_audio_path)
        model = self.load_model()

        wav_tensor = model.generate(text, audio_prompt_path=reference_audio_path)
        waveform = wav_tensor.squeeze().numpy()
        return waveform, model.sr

    def synthesize_chunk(self, text: str) -> tuple[np.ndarray, int]:
        """Synthesize a single chunk using already-prepared speaker conditionals."""
        if not text.strip():
            raise ValueError("Text cannot be empty.")
        model = self.load_model()
        if model.conds is None:
            raise RuntimeError("Speaker conditionals not prepared. Call prepare_speaker first.")

        wav_tensor = model.generate(text)
        waveform = wav_tensor.squeeze().numpy()
        return waveform, model.sr

    def save_reference_upload(self, file_bytes: bytes, filename: str) -> str:
        ext = Path(filename).suffix.lower() or ".wav"
        if ext not in (".wav", ".mp3", ".ogg", ".flac", ".m4a", ".webm"):
            raise ValueError("Unsupported audio format. Use WAV, MP3, OGG, or FLAC.")

        ref_id = hashlib.md5(file_bytes[:4096] + str(len(file_bytes)).encode()).hexdigest()[:12]
        dest = os.path.join(VOICE_REFS_DIR, f"ref_{ref_id}{ext}")
        with open(dest, "wb") as f:
            f.write(file_bytes)
        return dest

    def waveform_to_wav_bytes(self, waveform: np.ndarray, sample_rate: int) -> bytes:
        import io
        buf = io.BytesIO()
        sf.write(buf, waveform, sample_rate, format="WAV")
        return buf.getvalue()

    def save_temp_wav(self, waveform: np.ndarray, sample_rate: int) -> str:
        fd, path = tempfile.mkstemp(suffix=".wav", dir=VOICE_REFS_DIR)
        os.close(fd)
        sf.write(path, waveform, sample_rate)
        return path
