# PROJECT_STATE.md

Persistent memory for the voice-clone streaming feature build.

## Architecture Snapshot (2026-09-21)

- **Monorepo**: React/Vite frontend + FastAPI backend + SQLite
- **Existing TTS**: Kokoro-ONNX (preset voices) + gTTS fallback, per-block background generation
- **New feature**: Voice cloning with reference audio, chunked streaming synthesis

## Current TTS Approach

| Layer | Technology |
|-------|-----------|
| Preset voices | Kokoro-ONNX, gTTS |
| Voice cloning | Chatterbox TTS (ResembleAI) — few-shot cloning from 3–30s reference audio |
| Audio codec | Meta EnCodec 24kHz (6.0 kbps bandwidth) |
| Alignment | faster-whisper for word timestamps |
| Streaming | Sentence-chunked synthesis via SSE, Web Audio API playback |

## Existing Test Status

- `test_documents.py`: 5/5 passing (upload API)
- `test_audio_codec.py`: EnCodec round-trip tests
- `test_crossfade.py`: Crossfade seam smoothing tests
- `test_voice_clone_text.py`: Text chunking tests

## Gaps Relative to Target Project

- [x] Neural audio codec (EnCodec)
- [x] Voice cloning from reference audio (Chatterbox TTS)
- [x] Streaming/chunked generation with TTFA/RTF metrics
- [x] API integration (SSE streaming endpoint)
- [x] Frontend UI with live TTFA display
- [ ] Full evaluation harness (WER, speaker similarity batch)
- [ ] Latency optimization pass (conditioning cache implemented)
- [ ] Structured logging / observability dashboard
- [ ] Container deployment with voice clone deps

## Decisions Log

- **2026-09-21**: Chose EnCodec 24kHz at 6.0 kbps bandwidth — good quality/compression tradeoff for speech.
- **2026-09-21**: Chose Chatterbox TTS over Coqui XTTS — Coqui TTS doesn't support Python 3.14; Chatterbox provides true reference-audio conditioning via `prepare_conditionals()`.
- **2026-09-21**: Chunk size ~100 chars (sentence-level) — balances TTFA vs. natural prosody at seams.
- **2026-09-21**: True incremental generation: approximated — each sentence is synthesized independently; not token-level streaming from the model itself.
- **2026-09-21**: Streaming transport: SSE — simplest fit for FastAPI, one-directional audio delivery, works with fetch ReadableStream.
- **2026-09-21**: Optimization: speaker conditioning cache by reference audio hash — avoids recomputing embeddings on multi-chunk synthesis.

## Codec Module

- Location: `backend/audio_codec/`
- Verified working via: `test_audio_codec.py`
- Known limitations: degrades on very noisy input; requires torch

## Voice Cloning Module

- Location: `backend/voice_clone/`
- Engine: Chatterbox TTS (`ChatterboxTTS.from_pretrained`)
- Verified via: API endpoints `/voice-clone/synthesize` and `/voice-clone/stream`

## Streaming Module

- Location: `backend/voice_clone/streaming.py`
- Crossfade: 20ms raised-cosine in `voice_clone/crossfade.py`
- Metrics: TTFA and RTF in `voice_clone/metrics.py`

## API Integration (2026-09-21)

- `POST /voice-clone/synthesize` — full WAV file response
- `POST /voice-clone/stream` — SSE stream with base64 WAV chunks + metrics
- `GET /voice-clone/health` — dependency check
- Old document TTS endpoints: unchanged

## UI Integration (2026-09-21)

- Route: `/voice-clone`
- Sidebar: "Voice Clone" nav item
- Features: reference upload, text input, streamed playback, TTFA/RTF display
