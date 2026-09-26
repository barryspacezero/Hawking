import numpy as np

from voice_clone.crossfade import crossfade_chunks, seam_discontinuity


def test_crossfade_reduces_seam_discontinuity():
    chunk_a = np.ones(1000, dtype=np.float32) * 0.8
    chunk_b = np.ones(1000, dtype=np.float32) * -0.8

    raw_seam = seam_discontinuity(chunk_a, chunk_b)
    joined = crossfade_chunks(chunk_a, chunk_b, fade_samples=48)

    assert len(joined) > 0
    assert raw_seam > 1.0
    assert len(joined) == len(chunk_a) + len(chunk_b) - 48
    # The overlap region should be smoother than a hard cut
    overlap_mid = joined[1000 - 24]
    assert abs(overlap_mid) < 0.8


def test_crossfade_empty_chunks():
    chunk = np.array([0.5, 0.3, 0.1], dtype=np.float32)
    assert len(crossfade_chunks(np.array([]), chunk)) == len(chunk)
    assert len(crossfade_chunks(chunk, np.array([]))) == len(chunk)
