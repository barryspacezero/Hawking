"""Neural audio codec encode/decode using Meta EnCodec."""

import io
import logging
from typing import Tuple

import numpy as np
import soundfile as sf
import torch
from encodec import EncodecModel
from encodec.utils import convert_audio

logger = logging.getLogger(__name__)

TARGET_BANDWIDTH = 6.0
DEFAULT_SAMPLE_RATE = 24000

_model: EncodecModel | None = None


def _get_model() -> EncodecModel:
    global _model
    if _model is None:
        _model = EncodecModel.encodec_model_24khz()
        _model.set_target_bandwidth(TARGET_BANDWIDTH)
        _model.eval()
    return _model


def _to_mono_tensor(waveform: np.ndarray, sample_rate: int) -> Tuple[torch.Tensor, int]:
    if waveform.ndim == 1:
        tensor = torch.from_numpy(waveform).float().unsqueeze(0).unsqueeze(0)
    elif waveform.ndim == 2:
        mono = waveform.mean(axis=0) if waveform.shape[0] > 1 else waveform[0]
        tensor = torch.from_numpy(mono).float().unsqueeze(0).unsqueeze(0)
    else:
        raise ValueError(f"Unsupported waveform shape: {waveform.shape}")

    model = _get_model()
    tensor = convert_audio(tensor, sample_rate, model.sample_rate, model.channels)
    return tensor, model.sample_rate


def encode_audio(waveform: np.ndarray, sample_rate: int) -> list:
    """Encode waveform to discrete codec tokens. Returns nested list [batch, codebooks, time]."""
    tensor, _ = _to_mono_tensor(waveform, sample_rate)
    model = _get_model()
    with torch.no_grad():
        encoded = model.encode(tensor)
        codes = encoded[0][0].cpu().numpy().tolist()
    return codes


def decode_tokens(tokens: list) -> Tuple[np.ndarray, int]:
    """Decode codec tokens back to a waveform."""
    model = _get_model()
    codes = torch.tensor(tokens, dtype=torch.long)
    if codes.dim() == 2:
        codes = codes.unsqueeze(0)
    with torch.no_grad():
        decoded = model.decode([(codes, None)])
        waveform = decoded[0].squeeze().cpu().numpy()
    return waveform, model.sample_rate


def roundtrip_audio(waveform: np.ndarray, sample_rate: int) -> Tuple[np.ndarray, int]:
    """Encode then decode audio, returning the reconstructed waveform."""
    tokens = encode_audio(waveform, sample_rate)
    return decode_tokens(tokens)


def load_wav_bytes(data: bytes) -> Tuple[np.ndarray, int]:
    audio, sr = sf.read(io.BytesIO(data), always_2d=False)
    return np.asarray(audio, dtype=np.float32), sr


def save_wav_bytes(waveform: np.ndarray, sample_rate: int) -> bytes:
    buf = io.BytesIO()
    sf.write(buf, waveform, sample_rate, format="WAV")
    return buf.getvalue()
