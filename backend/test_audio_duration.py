"""Regression tests for full-length TTS output (not just non-empty files)."""

from gtts import gTTS

from tts.audio_utils import expected_min_speech_duration_seconds, probe_audio_duration_seconds


LONG_PARAGRAPH = (
    "This regression test paragraph must produce audio well beyond one point five seconds. "
    "The spoken output should cover every sentence in this block without truncation. "
) * 6


import pytest
def test_gtts_paragraph_audio_duration_is_not_truncated(tmp_path):
    import shutil
    if not shutil.which('ffprobe'): pytest.skip('ffprobe not installed')
    """Would fail if synthesis or file writing only preserved ~1.5s of audio."""
    filepath = tmp_path / "paragraph.mp3"
    tts = gTTS(LONG_PARAGRAPH, lang="en")
    tts.save(str(filepath))

    duration = probe_audio_duration_seconds(str(filepath))
    expected_min = expected_min_speech_duration_seconds(LONG_PARAGRAPH)

    assert duration > 3.0, f"audio too short ({duration:.2f}s) — likely truncated playback/generation bug"
    assert duration >= expected_min * 0.6, (
        f"audio {duration:.2f}s shorter than expected minimum {expected_min:.2f}s for text length"
    )

