from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, UploadFile, File, Form, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import uuid
import logging

from database import get_db
import models
import schemas

try:
    from tts.kokoro_service import KokoroService, AUDIO_DIR
    TTS_AVAILABLE = True
except ImportError:
    KokoroService = None  # type: ignore
    AUDIO_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "audio")
    os.makedirs(AUDIO_DIR, exist_ok=True)
    TTS_AVAILABLE = False

logger = logging.getLogger(__name__)

SOURCE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "sources")
os.makedirs(SOURCE_DIR, exist_ok=True)

router = APIRouter(
    prefix="/documents",
    tags=["documents"]
)

SUPPORTED_EXTENSIONS = {"pdf", "txt", "md"}
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB


def _validate_folder_id(db: Session, folder_id: Optional[int]) -> None:
    if folder_id is None:
        return
    folder = db.query(models.Folder).filter(models.Folder.id == folder_id).first()
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found.")


def _delete_document_audio(doc: models.Document) -> None:
    for block in doc.blocks:
        if block.audio_path:
            filepath = os.path.join(AUDIO_DIR, block.audio_path)
            if os.path.exists(filepath):
                try:
                    os.remove(filepath)
                except OSError as rm_e:
                    logger.warning(f"Failed to remove audio {block.audio_path}: {rm_e}")


def _delete_document_source(doc: models.Document) -> None:
    if doc.source_path:
        filepath = os.path.join(SOURCE_DIR, doc.source_path)
        if os.path.exists(filepath):
            try:
                os.remove(filepath)
            except OSError as rm_e:
                logger.warning(f"Failed to remove source {doc.source_path}: {rm_e}")


def _save_source_file(document_id: int, filename: str, content: bytes) -> str:
    ext = filename.split(".")[-1].lower() if "." in filename else "bin"
    source_name = f"doc_{document_id}_{uuid.uuid4().hex[:8]}.{ext}"
    filepath = os.path.join(SOURCE_DIR, source_name)
    with open(filepath, "wb") as f:
        f.write(content)
    return source_name


def _parse_document(filename: str, content: bytes) -> tuple[list[dict], int | None]:
    """Parse document and return (blocks, page_count)."""
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    if ext == "pdf":
        try:
            import fitz  # PyMuPDF
            doc = fitz.open(stream=content, filetype="pdf")
            blocks = []
            page_count = doc.page_count
            for page_num, page in enumerate(doc, start=1):
                text = page.get_text("text").strip()
                if text:
                    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
                    for para in paragraphs:
                        if len(para) > 20:
                            blocks.append({"text": para, "page_number": page_num})
            doc.close()
            return blocks, page_count
        except Exception as e:
            raise HTTPException(status_code=422, detail=f"PDF parse error: {e}")

    elif ext in ("txt", "md"):
        text = content.decode("utf-8", errors="replace")
        paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
        blocks = [{"text": p, "page_number": None} for p in paragraphs if len(p) > 10]
        return blocks, None

    else:
        raise HTTPException(status_code=415, detail=f"Unsupported file type: .{ext}")


@router.post("/upload", response_model=schemas.DocumentDetailSchema)
async def upload_document(
    file: UploadFile = File(...),
    folder_id: Optional[int] = Form(None),
    db: Session = Depends(get_db),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided.")

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type '.{ext}'. Supported: {', '.join(sorted(SUPPORTED_EXTENSIONS))}",
        )

    _validate_folder_id(db, folder_id)

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File exceeds 20 MB limit.")

    raw_blocks, page_count = _parse_document(file.filename, content)

    doc = models.Document(
        filename=file.filename,
        file_type=ext,
        folder_id=folder_id,
        page_count=page_count,
    )
    db.add(doc)
    db.flush()

    source_name = _save_source_file(doc.id, file.filename, content)
    doc.source_path = source_name

    for idx, blk in enumerate(raw_blocks):
        db_block = models.DocumentBlock(
            document_id=doc.id,
            block_index=idx,
            page_number=blk.get("page_number"),
            text=blk["text"],
            audio_status="none",
        )
        db.add(db_block)

    db.commit()
    db.refresh(doc)
    return doc


@router.post("/text", response_model=schemas.DocumentDetailSchema)
def create_from_text(request: schemas.TextInputRequest, db: Session = Depends(get_db)):
    _validate_folder_id(db, request.folder_id)

    title = (request.title or "Pasted Text").strip()[:200]
    paragraphs = [p.strip() for p in request.text.split("\n\n") if p.strip()]
    if not paragraphs:
        raise HTTPException(status_code=400, detail="No readable text provided.")

    doc = models.Document(
        filename=title,
        file_type="txt",
        folder_id=request.folder_id,
    )
    db.add(doc)
    db.flush()

    for idx, para in enumerate(paragraphs):
        db.add(models.DocumentBlock(
            document_id=doc.id,
            block_index=idx,
            page_number=None,
            text=para,
            audio_status="none",
        ))

    db.commit()
    db.refresh(doc)
    return doc


@router.get("/", response_model=List[schemas.DocumentSchema])
def list_documents(
    folder_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(models.Document)
    if folder_id is not None:
        q = q.filter(models.Document.folder_id == folder_id)
    return q.order_by(models.Document.upload_date.desc()).all()


@router.get("/{document_id}", response_model=schemas.DocumentDetailSchema)
def get_document(document_id: int, db: Session = Depends(get_db)):
    doc = db.query(models.Document).filter(models.Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@router.delete("/{document_id}")
def delete_document(document_id: int, db: Session = Depends(get_db)):
    doc = db.query(models.Document).filter(models.Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    _delete_document_audio(doc)
    _delete_document_source(doc)
    db.delete(doc)
    db.commit()
    return {"message": "Document deleted."}


@router.get("/{document_id}/source")
def get_document_source(document_id: int, db: Session = Depends(get_db)):
    doc = db.query(models.Document).filter(models.Document.id == document_id).first()
    if not doc or not doc.source_path:
        raise HTTPException(status_code=404, detail="Original document file not available.")

    filepath = os.path.join(SOURCE_DIR, doc.source_path)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Original document file missing on disk.")

    media_types = {
        "pdf": "application/pdf",
        "txt": "text/plain; charset=utf-8",
        "md": "text/markdown; charset=utf-8",
    }
    media_type = media_types.get(doc.file_type, "application/octet-stream")
    return FileResponse(
        filepath,
        media_type=media_type,
        filename=doc.filename,
        headers={"Accept-Ranges": "bytes"},
    )


@router.post("/bulk-move", response_model=schemas.BulkActionResponse)
def bulk_move(request: schemas.BulkMoveRequest, db: Session = Depends(get_db)):
    _validate_folder_id(db, request.folder_id)
    docs = db.query(models.Document).filter(models.Document.id.in_(request.document_ids)).all()
    for doc in docs:
        doc.folder_id = request.folder_id
    db.commit()
    return {"affected": len(docs), "message": "Documents moved."}


@router.post("/bulk-delete", response_model=schemas.BulkActionResponse)
def bulk_delete(request: schemas.BulkDeleteRequest, db: Session = Depends(get_db)):
    docs = db.query(models.Document).filter(models.Document.id.in_(request.document_ids)).all()
    for doc in docs:
        _delete_document_audio(doc)
        _delete_document_source(doc)
        db.delete(doc)
    db.commit()
    return {"affected": len(docs), "message": "Documents deleted."}


# ── TTS Endpoints ──────────────────────────────────────────────────────────────

def generate_audio_background_task(document_id: int, voice_tier: str):
    """Background task: generate TTS audio for each block using Kokoro (or gTTS fallback)."""
    from database import SessionLocal
    import json

    db = SessionLocal()

    # Load faster-whisper for word-level timestamp alignment
    try:
        from faster_whisper import WhisperModel
        whisper_model = WhisperModel("tiny.en", device="cpu", compute_type="int8")
        whisper_available = True
        logger.info("faster-whisper loaded for alignment.")
    except Exception as w_load_e:
        logger.warning(f"faster-whisper not available: {w_load_e}")
        whisper_model = None
        whisper_available = False

    try:
        blocks = (
            db.query(models.DocumentBlock)
            .filter(
                models.DocumentBlock.document_id == document_id,
                models.DocumentBlock.audio_status != "done",
            )
            .order_by(models.DocumentBlock.block_index)
            .all()
        )

        if not blocks:
            return

        tts_service = KokoroService.get_instance() if TTS_AVAILABLE else None

        for block in blocks:
            old_audio_path = block.audio_path
            block.audio_status = "generating"
            db.commit()

            try:
                safe_text = block.text[:1500]

                if voice_tier == "gtts":
                    from gtts import gTTS
                    tts = gTTS(safe_text, lang="en")
                    filename = f"block_{block.id}_{uuid.uuid4().hex[:8]}.mp3"
                    filepath = os.path.join(AUDIO_DIR, filename)
                    tts.save(filepath)
                    block.audio_voice = "gtts_standard"

                elif tts_service is not None:
                    voice_map = {
                        "kokoro_female_1": "af_heart",
                        "kokoro_female_2": "af_bella",
                        "kokoro_male_1": "am_michael",
                        "kokoro_male_2": "am_adam",
                    }
                    voice_name = voice_map.get(voice_tier, "af_heart")
                    wav_bytes = tts_service.synthesize(safe_text, voice=voice_name)
                    filename = f"block_{block.id}_{uuid.uuid4().hex[:8]}.wav"
                    filepath = os.path.join(AUDIO_DIR, filename)
                    with open(filepath, "wb") as f:
                        f.write(wav_bytes)
                    block.audio_voice = voice_name

                else:
                    raise RuntimeError("No TTS engine available. Install kokoro-onnx or gTTS.")

                # Word-level alignment via faster-whisper
                words = []
                if whisper_available and whisper_model is not None:
                    try:
                        segments, _ = whisper_model.transcribe(filepath, word_timestamps=True)
                        for segment in segments:
                            for word in segment.words:
                                words.append({"word": word.word, "start": word.start, "end": word.end})
                        block.word_timestamps = json.dumps(words)
                    except Exception as w_e:
                        logger.warning(f"Whisper alignment failed for block {block.id}: {w_e}")

                if words:
                    block.audio_duration = words[-1]["end"]
                else:
                    block.audio_duration = max(1.0, float(len(safe_text.split()) / 2.5))

                block.audio_path = filename
                block.audio_status = "done"
                db.commit()

                # Clean up old audio file if replaced
                if old_audio_path and old_audio_path != filename:
                    old_filepath = os.path.join(AUDIO_DIR, old_audio_path)
                    if os.path.exists(old_filepath):
                        try:
                            os.remove(old_filepath)
                        except OSError as rm_e:
                            logger.warning(f"Failed to remove old audio {old_audio_path}: {rm_e}")

            except Exception as e:
                logger.error(f"Failed to generate audio for block {block.id}: {e}")
                block.audio_status = "failed"
                db.commit()

    finally:
        db.close()


@router.post("/{document_id}/generate-audio")
def generate_audio(
    document_id: int,
    request: schemas.AudioGenerationRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    doc = db.query(models.Document).filter(models.Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Mark all blocks as pending so they regenerate with the new voice
    blocks = db.query(models.DocumentBlock).filter(
        models.DocumentBlock.document_id == document_id
    ).all()
    for block in blocks:
        block.audio_status = "pending"
    db.commit()

    background_tasks.add_task(generate_audio_background_task, document_id, request.voice_tier)
    return {"message": f"Audio generation started with voice: {request.voice_tier}"}


@router.get("/{document_id}/audio-status")
def get_audio_status(document_id: int, db: Session = Depends(get_db)):
    blocks = db.query(models.DocumentBlock).filter(
        models.DocumentBlock.document_id == document_id
    ).all()
    status_map = {b.id: b.audio_status for b in blocks}
    return {"status": status_map}


@router.get("/{document_id}/blocks/{block_id}/audio")
def get_block_audio(document_id: int, block_id: int, db: Session = Depends(get_db)):
    block = db.query(models.DocumentBlock).filter(
        models.DocumentBlock.id == block_id,
        models.DocumentBlock.document_id == document_id,
    ).first()

    if not block or not block.audio_path:
        raise HTTPException(status_code=404, detail="Audio not found")

    filepath = os.path.join(AUDIO_DIR, block.audio_path)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Audio file missing on disk")

    media_type = "audio/mpeg" if filepath.endswith(".mp3") else "audio/wav"
    ext = "mp3" if filepath.endswith(".mp3") else "wav"
    return FileResponse(
        filepath,
        media_type=media_type,
        filename=f"block-{block.block_index + 1}.{ext}",
    )
