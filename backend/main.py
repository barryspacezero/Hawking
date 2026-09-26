from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
import logging
from dotenv import load_dotenv

from database import engine, Base, run_migrations
import models
from routers import folders
from tts.job_dispatcher import dispatch_tts_job
from tts.job_queue import tts_job_queue

load_dotenv()

Base.metadata.create_all(bind=engine)
run_migrations()

logger = logging.getLogger(__name__)

app = FastAPI(title="Hawking API")

tts_job_queue.configure(dispatch_tts_job)

# Configure CORS — allow both localhost and 127.0.0.1 during local dev
default_origins = "http://localhost:5173,http://127.0.0.1:5173"
origins = [origin.strip() for origin in os.getenv("FRONTEND_URL", default_origins).split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Core routers (always available)
app.include_router(folders.router)

# Documents router (requires PyMuPDF — part of slim install)
try:
    from routers import documents
    app.include_router(documents.router)
except ImportError as e:
    logger.warning(f"Documents router unavailable (missing dep): {e}")

# Voice clone router (requires torch, chatterbox — heavy ML deps)
try:
    from routers import voice_clone, voice_profiles, voice_studio
    app.include_router(voice_clone.router)
    app.include_router(voice_profiles.router)
    app.include_router(voice_studio.router)
except ImportError as e:
    logger.warning(f"Voice clone router unavailable (missing dep): {e}")

@app.get("/health")
def health_check():
    return {"status": "healthy"}
