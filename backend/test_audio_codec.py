import numpy as np
import pytest

from audio_codec.codec import encode_audio, decode_tokens, roundtrip_audio


def test_roundtrip_preserves_duration():
    sr = 24000
    duration = 1.0
    t = np.linspace(0, duration, int(sr * duration), endpoint=False)
    waveform = 0.5 * np.sin(2 * np.pi * 440 * t)

    reconstructed, out_sr = roundtrip_audio(waveform, sr)

    assert out_sr == 24000
    ratio = len(reconstructed) / len(waveform)
    assert 0.95 <= ratio <= 1.05


def test_roundtrip_preserves_energy():
    sr = 24000
    t = np.linspace(0, 0.5, int(sr * 0.5), endpoint=False)
    waveform = 0.3 * np.sin(2 * np.pi * 330 * t)

    reconstructed, _ = roundtrip_audio(waveform, sr)

    orig_rms = np.sqrt(np.mean(waveform ** 2))
    recon_rms = np.sqrt(np.mean(reconstructed ** 2))
    assert recon_rms > 0.01
    assert abs(orig_rms - recon_rms) / orig_rms < 0.5


def test_encode_decode_short_audio():
    sr = 24000
    waveform = np.random.randn(int(sr * 0.5)).astype(np.float32) * 0.1
    tokens = encode_audio(waveform, sr)
    assert len(tokens) > 0
    decoded, out_sr = decode_tokens(tokens)
    assert out_sr == 24000
    assert len(decoded) > 0
