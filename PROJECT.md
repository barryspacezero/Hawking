# Hawking

## Overview & Goals
Hawking is a text-to-speech reading app. It allows users to upload PDF, DOCX, EPUB, and other document formats, reads them aloud with word/sentence highlighting synced to the audio, and offers voice cloning and library organization features.

## Architecture
The application follows a decoupled client-server architecture:
- **Frontend**: Single Page Application (SPA) built with React and Vite. It handles document upload, displays the document library, renders parsed chunk text, and manages per-block audio generation, polling, and playback.
- **Block text rendering**: `ReaderBlockText` is the single shared component for parsed block text everywhere Document Detail shows readable text — **Text View**, **Original view (TXT blocks)**, and the PDF read-along panel. It layers playback word highlights (outer span + `bg-brand` background) and optional bionic bold segments (`renderBionicInline` inside each word). Word/timestamp pairing lives in `textHighlight.ts` (`assignWordTimestamps` with search-ahead + number-word equivalence).
- **Backend**: REST API built with FastAPI. It handles multi-format document parsing and delegates TTS synthesis to a **sequential in-process job queue** (`backend/tts/job_queue.py`).
- **TTS Layer**: Kokoro TTS model is loaded into memory exactly *once* as a Singleton. Audio generation runs through `TTSJobQueue`, which processes **one job at a time** on a background worker thread (document Kokoro jobs **and** Voice Clone Studio Chatterbox jobs share the same queue). Additional requests are queued (not dropped, not run in parallel).
- **Database**: SQLite via SQLAlchemy. Contains `documents` and `document_blocks`.
  - *Data Modeling*: The text is parsed into a `document_blocks` table storing ordered chunks.
- **File Storage**: Generated audio files are stored in a persistent local directory (`backend/data/audio`) and served via API endpoints.

### TTS Job Queue (single-document-at-a-time)
Kokoro is a singleton for memory efficiency. Concurrent document jobs would compete for the same CPU/model instance — causing slowdowns, contention, or OOM on constrained hosts (e.g. Render free tier).

**Current approach**: module-level `TTSJobQueue` with a `deque` + daemon worker thread. Document states exposed via API: `not_started` / `queued` / `processing` / `done` / `failed`. Per-block statuses include `queued` while waiting.

**At scale**: move to Redis + Celery/RQ (or a dedicated TTS worker service) so multiple users can queue jobs across processes/machines while each worker still runs one synthesis job at a time.

## Tech Stack
- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Python + FastAPI
- **Database**: SQLite (SQLAlchemy ORM)
- **TTS Package**: `kokoro-onnx` + `onnxruntime` + `soundfile`.
  *Why*: Using ONNXRuntime is drastically lighter on memory and storage compared to raw PyTorch, perfectly suited for CPU-only environments like Render's free tier.

## Features
- [x] Project Scaffolding (Monorepo, Docker, render.yaml)
- [x] PDF/document upload + parsing + storage (SQLite, SQLAlchemy, PyMuPDF + multi-format parser)
- [x] TTS integration: Kokoro + gTTS end-to-end (per-block audio, background queue)
- [x] Sequential TTS job queue (one document at a time, queued state in API + UI)
- [x] **Bionic Reading mode** (Step 3): global toggle, punctuation-aware transform, unit-tested
- [x] Frontend reading view + synced highlighting + playback controls (text view: bionic + word highlight work together during playback)
- [x] **Named voice profiles** (Step 7): save/rename/delete cloned voices, Voice Library, reuse without re-upload
- [x] **Voice Clone Studio** (Step 7b): queued generation in any saved voice from typed text, existing documents, or file upload
- [ ] Forced alignment polish + word-level timestamp accuracy
- [ ] XTTS v2 (natural tier) + document TTS voice switching UI
- [ ] "Ask This Page" RAG pipeline
- [ ] "Ask This Page" UI
- [ ] Polish: responsive pass, error handling, loading states, tests
- [ ] Deploy live to Render

## Key Implementation Details
### Document Parsing and Chunking
When a document is uploaded, it is immediately parsed into a `document_blocks` table.
*Why chunking now?* Word and sentence-level highlighting requires stable, ordered text units to map audio timestamps back onto. Establishing this structured format at the ingestion layer prevents us from having to repeatedly parse raw files on the fly.

Supported formats include PDF, EPUB, DOCX, DOC (via antiword/LibreOffice when available), RTF, ODT, HTML, TXT, MD, CSV.

### Per-Block Audio Generation
*Why generate audio PER BLOCK?* Generating audio for a full 30-page PDF in one shot is a memory disaster for both TTS models and alignment models. Generating audio per-block limits peak memory usage, gives us a natural "retry" mechanism if one block fails, and allows the user to start listening to the first paragraph immediately while the rest generates in the background.

### Singleton Model Loading
The Kokoro TTS model is loaded into memory as a Singleton. Loading an ML model from disk to RAM is expensive (both in I/O and CPU). By loading it once, inference time drops to mere milliseconds per block, ensuring the API stays fast.

### Sequential Job Queue vs. Celery/Redis
For this single-user, single-process demo, an in-process queue is sufficient: no extra infrastructure, easy to reason about in interviews, and it guarantees Kokoro is never invoked concurrently. Unit tests use a **mock synthesis function** (recording call order/timing) instead of running Kokoro twice — keeping CI fast and deterministic.

Re-submitting `generate-audio` for a document that is already `done` returns `already_done` unless `force: true`. Documents already `queued` or `processing` are not double-queued.

During generation, the frontend polls `/audio-status` for queue/document state **and** re-fetches the full document so block metadata (`audio_path`, `word_timestamps`, `audio_duration`) stays in sync for playback — status-only polling caused a playback regression.

### Bionic Reading (Step 3 — frontend-only)
Bionic Reading bolds the leading portion of each word so the eye anchors and the brain fills in the rest — helpful for focus and reading pace (including ADHD readers; this project's personal motivation). It is a **pure text-rendering transform** on parsed block text: no backend, no new dependencies.

**Bolding algorithm (hand-rolled heuristic):**
1. Split text into whitespace runs (preserved byte-for-byte) and word tokens.
2. For each token, peel leading/trailing punctuation off the alphanumeric **core** (e.g. `reading,` → core `reading`, trail `,`).
3. Count only letters/digits in the core; bold `ceil(count × 0.45)` characters from the start (~40–50% rounded up).
4. Short words: 1–2 alphanumeric characters → bold 1 (single-letter words still get one anchor).
5. Hyphens inside a core (e.g. `well-known`) stay in the token; bold count is by letters only, hyphens follow the bold/normal boundary.
6. Numbers are treated like words (`42`, `3.14`).

*Why a fixed heuristic?* Bionic Reading is conventionally ~half-bold; a simple per-word rule is predictable, fast, interview-explainable, and needs no ML or font features.

*Why hand-rolled vs. an npm package?* This is a small string transform; owning it gives full control over punctuation, whitespace, and future audio-alignment markup without fighting a library's assumptions.

*Markup, not mutation:* `parseBionicText()` returns `{ text, bold }` segments that concatenate to the **exact** input string. React renders bold/remainder spans only — `block.text` in the database and for future timestamp alignment stays untouched.

**Visual contrast (dim-remainder):** Real bionic-reading tools don't rely on font-weight alone — the non-bold suffix of each word is dimmed via `opacity` (`--bionic-remainder-opacity`, default `0.65`) while the bold prefix stays full weight and full brightness. Opacity is relative to whatever `--reader-text` is, so it works in dark, light, and sepia themes without hardcoded gray colors.

**Global preference:** `useBionicReading()` hook (backed by `ReaderContext` + `localStorage` key `reader_bionicReading`). Toggle is always reachable from the sidebar/mobile header (compact **Bionic** button) and the Display Settings panel. Toggling is instant client-side — no API calls.

**Apply everywhere:** `TextViewReader` delegates each block to `ReaderBlockText`, which reads `useBionicReading()` via its parent. During playback on the active block, bionic bold spans nest *inside* per-word highlight wrappers (independent visual layers; `block.text` unchanged). **Any future view that renders block text** must use `ReaderBlockText` (or the same utilities) — do not fork a separate highlight renderer.

**Accessibility:** Each word is wrapped with `aria-label={fullWord}`; bold/normal visual spans use `aria-hidden="true"`. Screen readers announce the intact word, not bold fragments.

*Storage note:* Single-user-per-browser via `localStorage` — revisit with a profile API when real accounts exist.

### Voice Clone & Named Profiles (Step 7)
Voice cloning uses **Chatterbox TTS** (`chatterbox-tts`) in `backend/voice_clone/`. Reference audio is validated (3–30s, non-silent), then speaker **conditionals** are prepared via `model.prepare_conditionals()`.

**Saved voice profiles** (`voice_profiles` table + `backend/data/voice_profiles/{id}/`):
- `id`, `name`, `created_at`, `reference_audio_path` (relative), optional `conditioning_path` (serialized `model.conds` as `.pt` on disk)
- CRUD: `GET/POST /voice-clone/profiles`, `PATCH/DELETE /voice-clone/profiles/{id}`
- Synthesis accepts either `profile_id` or a one-off `reference_audio` upload on `/voice-clone/stream` and `/voice-clone/synthesize`

*Why disk-cache conditionals?* Re-running `prepare_conditionals()` on every request is slow. After the first successful prepare, Hawking saves `torch.save(model.conds, …)` so later generations load the cache instead of reprocessing raw audio. In-memory cache also tracks the **active** speaker so switching between profiles re-prepares correctly.

*Delete semantics:* Removing a profile deletes its folder (reference + cache) and DB row only. **Already-generated document audio is untouched** — profiles are inputs for future cloning, not linked foreign keys on `document_blocks`.

**Frontend:** `/voice-library` (list, rename, delete, upload-to-save). Default name: `Voice N` if skipped/empty.

### Voice Clone Studio (Step 7b — general-purpose cloned-voice TTS)
A **dedicated studio view** (`/voice-clone`) separate from Document Detail. Document Detail is for reading one uploaded file with per-block highlighting; the studio is a *"use this saved voice on anything"* tool — typed text, an existing library document, or a fresh file upload.

**Reused pieces (no duplicate parsers/engines):**
- `voice_profiles` + Chatterbox `VoiceCloneService` from Step 7
- `document_parser.parse_document()` for studio file uploads; existing `document_blocks` text for `document_id` input
- `TTSJobQueue` extended with `submit_studio()` — studio jobs interleave with document Kokoro jobs, still one-at-a-time

**API:** `POST /voice-clone/studio/generate` (multipart: `voice_profile_id`, `input_mode`, plus `text` | `document_id` | `file`), `GET /voice-clone/studio/jobs/{id}` (status: `queued` / `processing` / `done` / `failed`), `GET /voice-clone/studio/jobs/{id}/audio` (WAV when done). Limits: 10,000 chars text, 10 MB file upload.

**Storage:** `studio_generations` table + `backend/data/studio_audio/`. Deleting a voice profile does not break completed studio WAVs already on disk.

*Note:* PROJECT.md lists XTTS v2 as a future natural tier for document TTS. Studio and profiles use Chatterbox today; XTTS integration is a separate roadmap item.

## Decisions & Trade-offs Log
- **2026-09-21**: Audio Caching & Disk Space. *Decision*: Audio files are stored on disk permanently. *Trade-off*: They take up space, but if disk space runs low, audio is completely deterministic and safely regenerable cache. We prioritize "keep forever" to save compute.
- **2026-09-21**: Kokoro Packaging Choice. *Decision*: Used `kokoro-onnx`. *Trade-off*: The standard PyTorch `kokoro` package forces the installation of massive dependencies like `torch` and `spacy`, which often fail to compile on limited CI/CD or take up ~1.5GB. The ONNX version takes <100MB and runs beautifully on CPUs.
- **2026-09-21**: Locked Tailwind CSS (v3.4.19), PostCSS, and Autoprefixer versions in `package.json` without semantic ranges (`^`).
- **2026-09-21**: Chunking Text at Upload.
- **2026-09-21**: Image-only PDF Detection.
- **2026-09-26**: Sequential TTS queue. *Decision*: In-process `deque` + worker thread. *Trade-off*: Simple and zero-infra, but not multi-process safe; scale with Redis/Celery later.
- **2026-09-26**: Global Bionic Reading. *Decision*: Shared `ReaderContext` + `useBionicReading()` hook + global nav toggle (not per-page). *Trade-off*: localStorage-only until accounts exist; all text renderers must opt in explicitly.
- **2026-09-26**: Hand-rolled bionic transform. *Decision*: `bionicText.ts` pure segments + React render layer; no npm bionic package. *Trade-off*: We maintain edge cases (punctuation, hyphens) ourselves, but keep full control for audio-alignment compatibility.
- **2026-09-26**: Bionic dim-remainder contrast. *Decision*: Bold prefix at `font-weight: 700` + `opacity: 1`; non-bold suffix at `opacity: var(--bionic-remainder-opacity)` (not a fixed gray). *Trade-off*: Slightly more DOM styling than weight-only, but readable on dark backgrounds and theme-agnostic; one CSS variable to tune.
- **2026-09-26**: Bionic markup vs. text mutation. *Decision*: Never modify `block.text`; only render-layer bold spans. *Trade-off*: Slightly more DOM nodes, but raw text stays stable for forced alignment / highlighting.
- **2026-09-26**: Named voice profiles (Step 7). *Decision*: SQLite `voice_profiles` + per-profile disk folder; Chatterbox conditionals cached to `.pt`. *Trade-off*: Profiles are global (not per-user) until auth is wired to backend; delete is safe for existing audio because profiles are not FK-linked to generated blocks.
- **2026-09-26**: Voice Clone Studio as its own view. *Decision*: Separate `/voice-clone` studio (queued, any input) vs Document Detail (per-block reading). Reuse parser + Chatterbox + shared `TTSJobQueue`. *Trade-off*: Studio and document TTS contend for the same single worker — simple and safe on one CPU, but studio jobs wait behind long document jobs.
- **2026-09-26**: Unified block text renderer. *Decision*: `ReaderBlockText` handles bionic + forced-alignment highlights in one path instead of `TextViewReader` branching on playback state. *Trade-off*: Slightly more DOM nesting during playback, but eliminates the “features work in isolation” gap where highlighting swapped out the bionic renderer.
- **2026-09-26**: Search-ahead Whisper alignment. *Decision*: `assignWordTimestamps()` matches text tokens to Whisper with number equivalence + compound joins instead of blind 1:1 pairing. *Trade-off*: Heuristic (not true forced alignment); severe transcript divergence still needs Step 4 backend polish.
- **2026-09-26**: Original view uses blocks for bionic/highlight. *Decision*: Original TXT/PDF views render `ReaderBlockText` (read-along panel for PDF) instead of raw `<pre>`. *Trade-off*: Original TXT no longer shows byte-identical source file when blocks exist — formatting may differ slightly from raw file.

## Open-Source Models & Libraries
- **Kokoro-82M**: Fast TTS. *License*: Apache 2.0. *Purpose*: CPU-friendly TTS for "cloud-lite". Used via `kokoro-onnx` wrapper.
- **XTTS v2**: Natural TTS. *License*: CPML (Coqui Public Model License - Non-commercial). *Purpose*: High-quality TTS for "full-local".
- **faster-whisper**: Forced alignment. *License*: MIT. *Purpose*: Generating word-level timestamps.
- **PyMuPDF (fitz)**: Document Parsing. *License*: AGPL/Commercial. *Purpose*: Lightning-fast PDF text extraction.
- **SQLAlchemy**: ORM. *License*: MIT. *Purpose*: Database modeling and querying for SQLite.

## Deployment
The application is designed to be deployed on Render using a `render.yaml` Blueprint.

**Modes:**
1. **Cloud-lite (Render)**: Runs Kokoro-82M only. Optimized for CPU and minimal footprint.
2. **Full-local (Local Machine)**: Runs Kokoro + XTTS v2. GPU-friendly, meant for rich local demos.

*Disk Update*: The `render.yaml` file has been updated to automatically provision a 1GB Persistent Disk mapped to `/app/backend/data`. This ensures the SQLite database and generated WAV files persist across Render redeploys.

*Memory Warning*: Although `kokoro-onnx` is incredibly light (~350MB model in RAM), the Render Free Tier limits RAM to 512MB. If FastAPI + PyMuPDF + ONNXRuntime spikes above 512MB, Render might OOM kill the process. The sequential queue reduces the risk of concurrent synthesis spikes.

## Known Bugs / Limitations
- Folder unit tests can fail when run against a shared SQLite DB (duplicate folder names).
- Large PDFs (900+ blocks) are slow to generate audio; text view is recommended over rendering all PDF pages.
- In-process TTS queue state is lost on server restart; any in-flight/queued jobs must be re-submitted.

## Regressions Log
- **2026-09-26 — Read Along “wrong block” vs PDF page (fixed; content was correct, UX was misleading)**
  - *Symptom*: On doc 32 page 3/94, Read Along showed famous statistics quotes while player said “BLOCK 2 OF 19”; user expected Introduction/Preface.
  - *Root cause (confirmed via SQLite + PyMuPDF)*: Chunking **does** store `page_number` per block (1 PDF page = 1 block when non-empty). Page 3’s stored text **is** the quotes epigraph (`block_index=1, page_number=3`). Introduction is on **page 11** (`block_index=9`). The real bug was **two independent counters never linked in UI**: PDF viewer tracked `manualPage` locally, player showed playable-block ordinal (19 done of 91 total), and nothing shared a single `viewerPage`. Users read “block 2” as “page 2” or expected front-matter headings on page 3.
  - *Evidence (first 5 blocks, doc 32)*: `block_index 0 → page 2 “How to Lie with Statistics”`; `1 → page 3 quotes`; `2 → page 4 “More Praise…”`; `3 → page 5 “Also by Darrell Huff”`; `4 → page 6 title page repeat`.
  - *Fix*: `viewerPage` in `ReaderContext` as single source of truth; PDF nav + read-along + player all use page numbers when `page_count` exists; playback syncs viewer to block’s `page_number` while playing.

- **2026-09-26 — Bionic Reading: two prior fix attempts failed verification (fixed with test + inline style)**
  - *Symptom*: Bionic toggle on but no visible bolding in PDF read-along panel (reported twice after “fixed”).
  - *Why prior fixes looked done*: Self-reported checks on Text View or class-name presence only; no automated component test; Tailwind `font-bold` alone did not always yield `font-weight: 700` in computed style on read-along spans.
  - *What changed this time*: (1) `style={{ fontWeight: 700 }}` on bionic segments in addition to `font-bold`; (2) `ReaderBlockText.test.tsx` (RTL + jsdom) asserts `.font-bold` nodes exist and `getComputedStyle().fontWeight === '700'` for idle and active-playback paths; (3) browser CDP verification on doc 32 Original view with bionic enabled.
  - *Guard*: `npm run test` includes 3 `ReaderBlockText` bionic tests; do not mark fixed without them passing **and** computed-style check on the mounted Original read-along panel.

- **2026-09-26 — Bionic Reading invisible on Original document view (fixed; prior “layered renderer” fix did NOT address this)**
  - *Symptom*: Bionic toggle appeared on in settings, but no bolding on the view users actually read from (Original tab for uploaded TXT/PDF).
  - *Root cause (confirmed via DOM)*: `OriginalDocumentViewer` rendered a raw `<pre>` with plain text — **zero** `.font-bold` nodes, `getComputedStyle` = `400`. Toggle state was `true` in `localStorage`; the mounted component simply never called bionic utilities. Text View already worked (`font-weight: 700` on bold spans).
  - *Why the prior fix looked “verified”*: Text View was tested; Original view was not. Checking “class present” on Text View ≠ checking computed style on the view users default to.
  - *Fix*: Original TXT view now renders `blocks` through `ReaderBlockText`; PDF Original view adds a per-page read-along panel (same component) under the canvas.

- **2026-09-26 — Synced highlighting jumped to wrong words (fixed)**
  - *Symptom*: Highlight jumped randomly / lagged behind speech, especially after block changes or when Whisper transcribed differently from block text (`one` vs `1`, merged tokens like `QTestB.`).
  - *Root cause (confirmed via logged alignment)*: (1) `buildTextTokens` blindly advanced both text and Whisper indices 1:1 even on mismatches, drifting all subsequent timestamps; (2) inclusive `[start, end]` boundaries double-highlighted at edges; (3) `currentTime` reset ran in `useEffect` **after** paint, so a new block briefly inherited the previous block's clock.
  - *Fix*: `assignWordTimestamps()` with search-ahead matching, number-word equivalence, compound-token (vowelless) joins; half-open `isTokenActiveAtTime`; `useLayoutEffect` clock reset on block change. Unit tests in `textHighlight.test.ts`.

- **2026-09-26 — Bionic + highlight mutual exclusion in Text View active block (fixed earlier)**
  - *Symptom*: Bionic disappeared during playback in Text View only.
  - *Root cause*: Separate highlight branch in `TextViewReader` omitted bionic markup.
  - *Fix*: `ReaderBlockText` layers both. This was real but insufficient alone — Original view and alignment bugs remained.

### Testing practices (Bionic + highlighting)
Do **not** mark these features verified without:
1. **Bionic**: `ReaderBlockText.test.tsx` passing **plus** DOM inspection on the **actual mounted view** (Original *and* Text) + `getComputedStyle(el).fontWeight` on a bold segment (expect `700`), not just toggle state or class names.
2. **Highlighting**: At least five `(audioTime, expectedWord, highlightedWord)` tuples from real playback or the same `buildTextTokens` path the UI uses — logged, not assumed.
3. `AudioPlayer` exposes `data-current-time` / `data-active-block-id` on the player bar for manual/E2E sampling.

- **2026-09-26 — TTS playback cut off after ~1–2s (fixed)**
  - *Symptom*: Audio appeared to stop after ~1.5s even though backend files were full length.
  - *Root cause (confirmed)*: **Frontend playback regression**, not truncated synthesis. The job-queue step replaced `fetchDoc` polling with status-only `pollAudioStatus`, starving the client of fresh block metadata during generation. Combined with `AudioPlayer` re-running its load/play effect on every `timeupdate` (via `playableBlocks` in the effect dependency array + `ReaderContext` re-renders), playback could interrupt or reset mid-block.
  - *Verification*: `ffprobe` on generated MP3/WAV showed full duration (e.g. 12.8s for a paragraph); a raw `Audio()` element in the browser played past 4s without issue.
  - *Fix*: Restore full `fetchDoc` refresh during generation polling (while still reading queue state from `/audio-status`); split `AudioPlayer` into stable source-load vs play/pause effects; memoize `AudioPlayer` so highlight `timeupdate` ticks do not re-trigger source loading.
  - *Regression test*: `test_audio_duration.py` asserts gTTS paragraph output duration exceeds a text-length-based minimum (catches silent truncation better than “file non-empty”).

## Remaining Tasks / Roadmap
- [x] Step 3 — Bionic Reading mode (global preference, punctuation-aware transform, tests)
- [x] Sequential TTS job queue + queued/processing UI
- [x] Step 7 — Named voice profiles (Voice Library, reuse without re-upload)
- [x] Step 7b — Voice Clone Studio (typed text / document / file → queued cloned audio)
- [ ] Step 4 — Forced alignment polish + word-level timestamp accuracy (next step)
- [ ] XTTS v2 natural tier for document TTS
- [ ] Deploy live to Render

## How to Run Locally
**Backend**:
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Frontend**:
```bash
cd frontend
npm install
npm run dev
```

API health check: `curl http://127.0.0.1:8000/health`

## How to Deploy
1. Connect this repository to your Render account via the Blueprint feature (`render.yaml`).
2. Render will automatically provision the Web Service, Static Site, and Persistent Disk based on the blueprint.
3. Configure `FRONTEND_URL` on the backend and `VITE_API_URL` on the frontend in the Render dashboard if the blueprint doesn't fully resolve them automatically.
