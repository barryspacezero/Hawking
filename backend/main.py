from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

from database import engine, Base
import models  # noqa: F401 — ensure models are registered before create_all

load_dotenv()

# Create database tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Hawking API", version="0.1.0")

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
origins = os.getenv("FRONTEND_URL", "http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers — added incrementally as features are built
# ---------------------------------------------------------------------------
from routers import folders  # noqa: E402

app.include_router(folders.router)


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
@app.get("/health")
def health_check():
    return {"status": "ok"}
