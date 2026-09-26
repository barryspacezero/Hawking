import pytest
import os
from tts.kokoro_service import KokoroService

def test_synthesize_valid():
    service = KokoroService.get_instance()
    # It will download the models during the test if not exist
    audio_bytes = service.synthesize("Hello this is a short test.", voice="af_heart")
    assert audio_bytes is not None
    assert len(audio_bytes) > 1000  # Should be non-empty WAV header + audio

def test_synthesize_empty():
    service = KokoroService.get_instance()
    with pytest.raises(ValueError):
        service.synthesize("   ", voice="af_heart")
