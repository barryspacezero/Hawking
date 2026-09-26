"""Helpers for inspecting generated audio files."""

from __future__ import annotations

import shutil
import subprocess


def probe_audio_duration_seconds(filepath: str) -> float:
    """Return media duration in seconds using ffprobe (falls back to 0 if unavailable)."""
    if not shutil.which("ffprobe"):
        raise RuntimeError("ffprobe is required for audio duration checks")

    result = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            filepath,
        ],
        capture_output=True,
        text=True,
        check=True,
    )
    return float(result.stdout.strip())


def expected_min_speech_duration_seconds(text: str, *, words_per_second: float = 2.5) -> float:
    """Conservative lower bound for how long text should take to speak."""
    word_count = len(text.split())
    return max(1.0, word_count / words_per_second)
