"""Streaming voice-cloned synthesis with chunked generation."""

import logging
from dataclasses import dataclass
from typing import Generator

import numpy as np

from .crossfade import crossfade_chunks
from .metrics import StreamMetrics
from .service import VoiceCloneService
from .text_utils import split_into_chunks

logger = logging.getLogger(__name__)


@dataclass
class AudioChunk:
    index: int
    waveform: np.ndarray
    sample_rate: int
    text: str
    is_last: bool


def stream_synthesize(
    text: str,
    reference_audio_path: str,
    chunk_max_chars: int = 100,
    conditioning_path: str | None = None,
) -> Generator[tuple[AudioChunk, StreamMetrics], None, None]:
    """
    Stream voice-cloned audio in sentence chunks.
    Each chunk is synthesized independently for low TTFA; the client
    stitches playback. Use concatenate_chunks() for a seamless full file.
    """
    service = VoiceCloneService.get_instance()
    service.prepare_speaker(reference_audio_path, conditioning_path=conditioning_path)

    chunks = split_into_chunks(text, max_chars=chunk_max_chars)
    if not chunks:
        raise ValueError("No text to synthesize.")

    metrics = StreamMetrics()

    for i, chunk_text in enumerate(chunks):
        waveform, sample_rate = service.synthesize_chunk(chunk_text)
        duration = len(waveform) / sample_rate
        metrics.add_audio_duration(duration)

        if i == 0:
            metrics.mark_first_chunk()

        yield AudioChunk(
            index=i,
            waveform=waveform,
            sample_rate=sample_rate,
            text=chunk_text,
            is_last=i == len(chunks) - 1,
        ), metrics

    metrics.mark_done()


def concatenate_chunks(chunks: list[np.ndarray], sample_rate: int = 24000) -> np.ndarray:
    """Concatenate streamed chunks with crossfade smoothing at seams."""
    if not chunks:
        return np.array([], dtype=np.float32)
    result = chunks[0]
    for chunk in chunks[1:]:
        result = crossfade_chunks(result, chunk)
    return result
