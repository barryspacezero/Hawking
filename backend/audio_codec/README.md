# Audio Codec Module

Neural audio codec encode/decode using Meta's **EnCodec** at 24kHz, 6.0 kbps bandwidth.

## What is a neural audio codec?

Instead of storing raw waveforms, a neural codec compresses audio into discrete token sequences learned by a neural network. This representation is what enables efficient voice-conditioned generation in modern TTS systems (VALL-E, Bark, Chatterbox).

## Usage

```python
from audio_codec import encode_audio, decode_tokens, roundtrip_audio
import numpy as np

waveform = np.sin(2 * np.pi * 440 * np.linspace(0, 1, 24000))
tokens = encode_audio(waveform, 24000)
reconstructed, sr = decode_tokens(tokens)
```

## Tests

```bash
pytest test_audio_codec.py -v
```
