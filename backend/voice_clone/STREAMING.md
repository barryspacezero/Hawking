# Streaming Voice Clone

## Strategy

Text is split into sentence-level chunks (~100 chars). Each chunk is synthesized independently using pre-cached speaker conditionals from the reference audio. Chunks are streamed to the client via SSE as they complete.

This is **approximated incremental generation** — the model generates full sentences per call, not token-by-token. True token-level streaming would require model-native streaming hooks (not exposed by Chatterbox).

## Crossfade

For full-file concatenation, consecutive chunks are joined with a 20ms raised-cosine crossfade to prevent audible clicks at seams. Streaming playback sends independent chunks; the Web Audio API schedules them back-to-back.

## Metrics

- **TTFA** (Time to First Audio): milliseconds from request start to first chunk emitted
- **RTF** (Real-Time Factor): total generation time / total audio duration (< 1.0 means faster than real-time)

## API

```
POST /voice-clone/stream
Content-Type: multipart/form-data
  - text: string
  - reference_audio: file

Response: text/event-stream
  data: {"type":"audio","chunk_index":0,"data":"<base64 wav>","sample_rate":24000}
  data: {"type":"metrics","ttfa_ms":450,"rtf":0.8,...}
  data: {"type":"done"}
```
