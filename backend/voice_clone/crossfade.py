"""Audio chunk crossfade utilities."""

import numpy as np


def crossfade_chunks(
    prev_chunk: np.ndarray,
    next_chunk: np.ndarray,
    fade_samples: int = 480,
) -> np.ndarray:
    """
    Join two audio chunks with a raised-cosine crossfade to avoid clicks at seams.
    Returns the combined audio (prev_chunk with its tail faded into next_chunk).
    """
    if len(prev_chunk) == 0:
        return next_chunk.copy()
    if len(next_chunk) == 0:
        return prev_chunk.copy()

    fade_samples = min(fade_samples, len(prev_chunk), len(next_chunk))
    if fade_samples <= 0:
        return np.concatenate([prev_chunk, next_chunk])

    fade_out = 0.5 * (1 + np.cos(np.linspace(0, np.pi, fade_samples)))
    fade_in = 0.5 * (1 - np.cos(np.linspace(0, np.pi, fade_samples)))

    overlap = prev_chunk[-fade_samples:] * fade_out + next_chunk[:fade_samples] * fade_in
    return np.concatenate([prev_chunk[:-fade_samples], overlap, next_chunk[fade_samples:]])


def seam_discontinuity(prev_chunk: np.ndarray, next_chunk: np.ndarray) -> float:
    """Measure amplitude jump at the seam between two chunks."""
    if len(prev_chunk) == 0 or len(next_chunk) == 0:
        return 0.0
    return abs(float(prev_chunk[-1] - next_chunk[0]))
