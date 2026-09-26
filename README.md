# Hawking

A text-to-speech reading application. Upload documents (PDF, TXT) and have them read aloud with synchronized word highlighting.

## Project Structure

```
hawking/
├── backend/   # FastAPI + SQLite
└── frontend/  # React + TypeScript + Vite
```

## Getting Started

**Backend**

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Frontend**

```bash
cd frontend
npm install
npm run dev
```

The frontend will run on `http://localhost:5173` and proxy API calls to `http://localhost:8000`.

## Tech Stack

- **Frontend**: React 19 · TypeScript · Vite · Tailwind CSS v3
- **Backend**: Python · FastAPI · SQLAlchemy · SQLite
- **TTS**: Kokoro-82M (via `kokoro-onnx`) — CPU-friendly, ONNX runtime
- **Deployment**: Render (via `render.yaml` Blueprint)
