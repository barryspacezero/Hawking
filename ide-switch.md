# Speechify 2.0 Clone - Master Context

This document serves as the single source of truth for the Speechify Clone application. It details the architecture, tech stack, data flow, and current state of the project.

## Tech Stack
### Backend
*   **Framework:** FastAPI (Python)
*   **Database:** SQLite via SQLAlchemy ORM
*   **Text-to-Speech (TTS):** Kokoro TTS (high-quality premium voices) and gTTS (standard fallback voice)
*   **PDF Extraction:** PyMuPDF (`fitz`)
*   **Word-Level Synchronization (Forced Alignment):** `faster-whisper` (tiny.en model)
*   **Environment:** Python 3.10+, managed via `venv` (`backend/venv`)

### Frontend
*   **Framework:** React 18 with TypeScript
*   **Build Tool:** Vite
*   **Styling:** Tailwind CSS (Dark Mode default)
*   **Icons:** `lucide-react`
*   **Routing:** `react-router-dom`
*   **State Management:** React Context (`ReaderContext.tsx`) for global reading state (theme, font, playback speed). Local state via `useState`.

## Application Architecture & Data Flow
The application allows users to upload documents (PDF or TXT), converts the text to speech using an AI model, and provides a synchronous reading experience where the original text is highlighted word-by-word as the audio plays.

1.  **Upload Flow:**
    *   User navigates to `/upload` (or clicks "Upload" on the Dashboard).
    *   File is sent to `POST /documents/upload`.
    *   Backend extracts text (using PyMuPDF for PDFs).
    *   Text is chunked into `DocumentBlock` entities (e.g., paragraphs or pages) and saved to SQLite.
2.  **Audio Generation:**
    *   User selects a voice (Kokoro Male/Female or Google Standard) in `DocumentDetail.tsx` and clicks "Generate".
    *   Frontend calls `POST /documents/{id}/generate-audio`.
    *   Backend runs a background task:
        *   Synthesizes each block of text to a `.wav` or `.mp3` file.
        *   Runs `faster-whisper` on the generated audio to get precise word-level timestamps (`word_timestamps`).
        *   Saves the audio file to `backend/data/audio/`.
3.  **Synchronized Playback:**
    *   User clicks "Play" on a block.
    *   `AudioPlayer.tsx` fetches the audio stream.
    *   As audio plays, `currentTime` is updated in `ReaderContext.tsx`.
    *   `DocumentDetail.tsx` parses the original text and aligns it with Whisper's timestamps, highlighting words accurately while preserving original punctuation and formatting.

## Folder Structure
```text
Building Speechify Clone/
├── backend/
│   ├── data/                 # SQLite DB, uploads, and generated audio files
│   ├── routers/
│   │   └── documents.py      # API endpoints for doc management & audio generation
│   ├── tts/
│   │   └── kokoro_service.py # Kokoro TTS synthesis logic
│   ├── database.py           # SQLAlchemy setup
│   ├── main.py               # FastAPI entry point
│   ├── models.py             # SQLAlchemy models (Document, DocumentBlock)
│   ├── schemas.py            # Pydantic validation schemas
│   └── requirements.txt      # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AudioPlayer.tsx          # Persistent floating audio player
│   │   │   ├── ReaderSettingsMenu.tsx   # Typography and speed controls
│   │   │   ├── Sidebar.tsx              # Persistent left navigation
│   │   │   └── VoiceSwitcherModal.tsx   # Premium voice selection modal
│   │   ├── context/
│   │   │   └── ReaderContext.tsx        # Global reading state provider
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx            # Main landing page (Workflows, Action grid)
│   │   │   ├── DocumentDetail.tsx       # Reader view (Text display, generation, sync)
│   │   │   ├── DocumentLibrary.tsx      # List of past uploaded documents
│   │   │   └── DocumentUpload.tsx       # File dropzone upload page
│   │   ├── App.tsx                      # Main React Router setup
│   │   ├── index.css                    # Global CSS variables for Dark Mode
│   │   └── main.tsx                     # React DOM mount
│   ├── tailwind.config.js               # Theme colors (bg-mainBg, borderDark, etc.)
│   └── package.json                     # Node dependencies
└── ide-switch.md                        # Master Context Document (This file)
```

## Known Features & Design Decisions
*   **Dark Mode UI:** The app defaults to a premium dark aesthetic (`#151515` background, `#242424` cards). The UI is heavily inspired by the actual Speechify web app dashboard.
*   **Forced Alignment Algorithm:** Whisper sometimes drops punctuation or changes word formatting. The frontend uses a custom regex algorithm in `DocumentDetail.tsx` to align Whisper's time bounds strictly with the user's *original* text tokens, guaranteeing 100% text fidelity.
*   **Background Processing:** Audio generation happens via FastAPI `BackgroundTasks`. The frontend polls the API every 3 seconds while `isGenerating` is true to update the UI progress.

## Current Status & Remaining Work
*   **Completed:** Core layout (Sidebar, Dashboard), File Uploading (PDF/TXT), Text Extraction, TTS Generation (Kokoro/gTTS), Word-Level Highlighting, Voice Switching, Global Typography Settings.
*   **Cleaned Up:** Removed unused components ("Chapter 3 Summary", "Schedule", "Skills") from the sidebar to streamline the app. All remaining buttons (like "New Task" and "Upload from Drive/Dropbox") currently route to the local file upload page (`/upload`) to ensure functional completeness until third-party OAuth is integrated.
*   **Next Steps for Future Devs:** 
    1. Implement actual OAuth & API integrations for Google Drive, Dropbox, and OneDrive.
    2. Add user authentication (Auth0 or Supabase).
    3. Add support for ePUB and DOCX parsing.
