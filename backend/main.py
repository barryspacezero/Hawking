from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

from database import engine, Base
import models  # noqa: F401

load_dotenv()
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Hawking API", version="0.2.0")

origins = os.getenv("FRONTEND_URL", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from routers import folders, documents  # noqa: E402

app.include_router(folders.router)
app.include_router(documents.router)


@app.get("/health")
def health_check():
    return {"status": "ok"}
