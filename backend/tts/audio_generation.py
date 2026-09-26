"""Synthesize per-block audio for a single document."""

from __future__ import annotations

import json
import logging
import os
import uuid

from database import SessionLocal
import models
from tts.kokoro_service import AUDIO_DIR, KokoroService

logger = logging.getLogger(__name__)


def generate_audio_for_document(document_id: int, voice_tier: str) -> None:
    """Generate audio for all non-done blocks in a document (sequential, one doc at a time)."""
    from faster_whisper import WhisperModel

    db = SessionLocal()
    whisper_model = None

    try:
        blocks = (
            db.query(models.DocumentBlock)
            .filter(
                models.DocumentBlock.document_id == document_id,
                models.DocumentBlock.audio_status != "done",
            )
            .order_by(models.DocumentBlock.block_index)
            .all()
        )

        if not blocks:
            return

        logger.info("Loading faster-whisper tiny.en for document %s", document_id)
        whisper_model = WhisperModel("tiny.en", device="cpu", compute_type="int8")
        tts_service = KokoroService.get_instance()

        for block in blocks:
            old_audio_path = block.audio_path
            block.audio_status = "generating"
            db.commit()

            try:
                safe_text = block.text[:1500]

                if voice_tier == "gtts":
                    from gtts import gTTS

                    tts = gTTS(safe_text, lang="en")
                    filename = f"block_{block.id}_{uuid.uuid4().hex[:8]}.mp3"
                    filepath = os.path.join(AUDIO_DIR, filename)
                    tts.save(filepath)
                    block.audio_voice = "gtts_standard"
                else:
                    voice_map = {
                        "kokoro_female_1": "af_heart",
                        "kokoro_female_2": "af_bella",
                        "kokoro_male_1": "am_michael",
                        "kokoro_male_2": "am_adam",
                    }
                    voice_name = voice_map.get(voice_tier, "af_sky")
                    wav_bytes = tts_service.synthesize(safe_text, voice=voice_name)
                    filename = f"block_{block.id}_{uuid.uuid4().hex[:8]}.wav"
                    filepath = os.path.join(AUDIO_DIR, filename)
                    with open(filepath, "wb") as handle:
                        handle.write(wav_bytes)
                    block.audio_voice = voice_name

                words = []
                try:
                    segments, _ = whisper_model.transcribe(filepath, word_timestamps=True)
                    for segment in segments:
                        for word in segment.words:
                            words.append({"word": word.word, "start": word.start, "end": word.end})
                    block.word_timestamps = json.dumps(words)
                except Exception as whisper_error:
                    logger.warning("Whisper failed for block %s: %s", block.id, whisper_error)

                if words:
                    block.audio_duration = words[-1]["end"]
                else:
                    block.audio_duration = max(1.0, float(len(safe_text.split()) / 2.5))

                block.audio_path = filename
                block.audio_status = "done"
                db.commit()

                if old_audio_path and old_audio_path != filename:
                    old_filepath = os.path.join(AUDIO_DIR, old_audio_path)
                    if os.path.exists(old_filepath):
                        try:
                            os.remove(old_filepath)
                        except OSError as rm_error:
                            logger.warning("Failed to remove old audio %s: %s", old_audio_path, rm_error)

            except Exception as block_error:
                logger.error("Failed to generate audio for block %s: %s", block.id, block_error)
                block.audio_status = "failed"
                db.commit()
    finally:
        db.close()
