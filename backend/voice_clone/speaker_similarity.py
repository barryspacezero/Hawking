"""Speaker similarity evaluation using Resemblyzer."""

import logging
import numpy as np

logger = logging.getLogger(__name__)


def compute_speaker_similarity(reference_path: str, generated_path: str) -> float:
    """Return cosine similarity between reference and generated speaker embeddings."""
    try:
        from resemblyzer import VoiceEncoder, preprocess_wav
        import librosa

        encoder = VoiceEncoder()
        ref_wav, _ = librosa.load(reference_path, sr=16000, mono=True)
        gen_wav, _ = librosa.load(generated_path, sr=16000, mono=True)

        ref_embed = encoder.embed_utterance(preprocess_wav(ref_wav))
        gen_embed = encoder.embed_utterance(preprocess_wav(gen_wav))

        similarity = float(np.dot(ref_embed, gen_embed) / (np.linalg.norm(ref_embed) * np.linalg.norm(gen_embed)))
        return similarity
    except Exception as e:
        logger.warning(f"Speaker similarity computation failed: {e}")
        return -1.0
