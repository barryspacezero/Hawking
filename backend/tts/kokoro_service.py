import os
import io
import urllib.request
import soundfile as sf
import logging
from kokoro_onnx import Kokoro

logger = logging.getLogger(__name__)

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
MODELS_DIR = os.path.join(DATA_DIR, "models")
AUDIO_DIR = os.path.join(DATA_DIR, "audio")

os.makedirs(MODELS_DIR, exist_ok=True)
os.makedirs(AUDIO_DIR, exist_ok=True)

MODEL_URL = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx"
VOICES_URL = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin"

MODEL_PATH = os.path.join(MODELS_DIR, "kokoro-v1.0.onnx")
VOICES_PATH = os.path.join(MODELS_DIR, "voices-v1.0.bin")

class KokoroService:
    _instance = None

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def __init__(self):
        self.kokoro = None
        
    def _download_file(self, url, dest):
        if not os.path.exists(dest):
            logger.info(f"Downloading {url} to {dest}...")
            urllib.request.urlretrieve(url, dest)
            logger.info(f"Downloaded {dest}")

    def load_model(self):
        if self.kokoro is None:
            self._download_file(MODEL_URL, MODEL_PATH)
            self._download_file(VOICES_URL, VOICES_PATH)
            
            logger.info("Loading Kokoro-ONNX model into memory...")
            self.kokoro = Kokoro(MODEL_PATH, VOICES_PATH)
            logger.info("Kokoro-ONNX model loaded successfully.")

    def synthesize(self, text: str, voice: str = "af_heart") -> bytes:
        """
        Synthesizes audio and returns WAV bytes.
        """
        if not text.strip():
            raise ValueError("Empty text provided for synthesis")
            
        self.load_model()
        
        # Kokoro-ONNX creates audio stream/samples
        samples, sample_rate = self.kokoro.create(text, voice=voice, speed=1.0, lang="en-us")
        
        # Convert raw samples to WAV bytes in memory
        wav_io = io.BytesIO()
        sf.write(wav_io, samples, sample_rate, format='WAV')
        return wav_io.getvalue()
