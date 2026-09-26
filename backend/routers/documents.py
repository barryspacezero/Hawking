from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import FileResponse
from starlette.datastructures import UploadFile
from sqlalchemy.orm import Session
from typing import List, Optional
import json
import os
import uuid
import logging

from database import get_db
import models
import schemas
from document_parser import SUPPORTED_EXTENSIONS, normalize_extension, parse_document, supported_formats_message
from upload_limits import MAX_MULTIPART_PART_SIZE, MAX_UPLOAD_BYTES
from tts.job_queue import JobSubmitResult, tts_job_queue

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

MAX_FILE_SIZE = MAX_UPLOAD_BYTES


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


@router.get("/supported-formats")
def get_supported_formats():
    canonical = sorted({normalize_extension(f"file.{ext}") for ext in SUPPORTED_EXTENSIONS})
    return {
        "extensions": canonical,
        "message": supported_formats_message(),
    }


@router.post("/upload", response_model=schemas.DocumentDetailSchema)
async def upload_document(
    request: Request,
    db: Session = Depends(get_db),
):
    try:
        form = await request.form(max_part_size=MAX_MULTIPART_PART_SIZE)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read upload: {str(e)}")

    file = form.get("file")
    if file is None or not isinstance(file, UploadFile):
        raise HTTPException(status_code=400, detail="No file provided")

    folder_id = None
    folder_id_raw = form.get("folder_id")
    if folder_id_raw not in (None, ""):
        try:
            folder_id = int(folder_id_raw)
        except (TypeError, ValueError):
            raise HTTPException(status_code=400, detail="Invalid folder_id.")

    _validate_folder_id(db, folder_id)
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    ext = normalize_extension(file.filename)
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB.")
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="File is empty.")

    try:
        parsed = parse_document(file.filename, content)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse file: {str(e)}")

    blocks = [
        {
            "block_index": block.block_index,
            "page_number": block.page_number,
            "text": block.text,
            "text_spans": block.text_spans,
        }
        for block in parsed.blocks
    ]
    page_count = parsed.page_count

    db_doc = models.Document(
        filename=file.filename,
        file_type=parsed.canonical_type,
        folder_id=folder_id,
        page_count=page_count,
    )
    db.add(db_doc)
    db.commit()
    db.refresh(db_doc)

    source_name = _save_source_file(db_doc.id, file.filename, content)
    db_doc.source_path = source_name
    db.commit()

    db_blocks = []
    for b in blocks:
        db_block = models.DocumentBlock(
            document_id=db_doc.id,
            block_index=b["block_index"],
            page_number=b["page_number"],
            text=b["text"],
            text_spans=b.get("text_spans"),
        )
        db_blocks.append(db_block)
    
    db.add_all(db_blocks)
    db.commit()
    db.refresh(db_doc)
    db_doc.blocks.sort(key=lambda x: x.block_index)
    
    return db_doc

@router.post("/text", response_model=schemas.DocumentDetailSchema)
async def upload_text(request: schemas.TextInputRequest, db: Session = Depends(get_db)):
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty.")
    _validate_folder_id(db, request.folder_id)
    
    blocks = []
    paragraphs = [p.strip() for p in request.text.split("\n\n") if p.strip()]
    for idx, p in enumerate(paragraphs):
        blocks.append({
            "block_index": idx,
            "page_number": None,
            "text": p
        })
        
    db_doc = models.Document(
        filename=request.title or "Pasted Text",
        file_type="txt",
        folder_id=request.folder_id,
    )
    db.add(db_doc)
    db.commit()
    db.refresh(db_doc)

    db_blocks = []
    for b in blocks:
        db_block = models.DocumentBlock(
            document_id=db_doc.id,
            block_index=b["block_index"],
            page_number=b["page_number"],
            text=b["text"]
        )
        db_blocks.append(db_block)
    
    db.add_all(db_blocks)
    db.commit()
    db.refresh(db_doc)
    db_doc.blocks.sort(key=lambda x: x.block_index)
    
    return db_doc

@router.post("/link", response_model=schemas.DocumentDetailSchema)
async def upload_link(request: schemas.LinkInputRequest, db: Session = Depends(get_db)):
    if not request.url.strip():
        raise HTTPException(status_code=400, detail="URL cannot be empty.")
    _validate_folder_id(db, request.folder_id)
        
    from readability import Document as ReadabilityDocument
    import bs4
    import requests
    
    html = ""
    try:
        # Try Selenium for JS rendered pages (Bot Protection bypass attempt)
        from selenium import webdriver
        from selenium.webdriver.chrome.options import Options
        from selenium.webdriver.chrome.service import Service
        from webdriver_manager.chrome import ChromeDriverManager
        
        chrome_options = Options()
        chrome_options.add_argument("--headless=new")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=chrome_options)
        driver.set_page_load_timeout(30)
        driver.get(request.url)
        html = driver.page_source
        driver.quit()
    except Exception as e:
        logger.warning(f"Selenium failed, falling back to requests: {e}")
        try:
            # Fallback to requests
            headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"}
            res = requests.get(request.url, headers=headers, timeout=15)
            res.raise_for_status()
            html = res.text
        except Exception as req_e:
            raise HTTPException(status_code=400, detail=f"Failed to fetch webpage: {str(req_e)}")

    try:
        doc = ReadabilityDocument(html)
        title = doc.title()
        summary_html = doc.summary()
        
        soup = bs4.BeautifulSoup(summary_html, "html.parser")
        clean_text = soup.get_text(separator="\n\n").strip()
        
        if not clean_text:
            raise HTTPException(status_code=400, detail="Could not extract readable text from this URL.")
            
        blocks = []
        paragraphs = [p.strip() for p in clean_text.split("\n\n") if p.strip()]
        for idx, p in enumerate(paragraphs):
            blocks.append({
                "block_index": idx,
                "page_number": None,
                "text": p
            })
            
        db_doc = models.Document(
            filename=title or "Web Article",
            file_type="txt",
            folder_id=request.folder_id,
        )
        db.add(db_doc)
        db.commit()
        db.refresh(db_doc)

        db_blocks = []
        for b in blocks:
            db_block = models.DocumentBlock(
                document_id=db_doc.id,
                block_index=b["block_index"],
                page_number=b["page_number"],
                text=b["text"]
            )
            db_blocks.append(db_block)
        
        db.add_all(db_blocks)
        db.commit()
        db.refresh(db_doc)
        db_doc.blocks.sort(key=lambda x: x.block_index)
        
        return db_doc
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse webpage content: {str(e)}")

@router.post("/cloud-import", response_model=schemas.DocumentDetailSchema)
async def upload_cloud_mock(request: schemas.CloudImportRequest, db: Session = Depends(get_db)):
    """Mock endpoint for Drive/Dropbox/OneDrive imports using dummy keys."""
    if not request.file_id and not request.url:
        raise HTTPException(status_code=400, detail="Missing file identifier.")
    _validate_folder_id(db, request.folder_id)
        
    # Mocking the download process
    text_content = f"This is a mocked import from {request.provider}.\n\nFile ID: {request.file_id or request.url}\n\nSince no real API keys were provided for {request.provider}, we've successfully imported this placeholder text to demonstrate the full end-to-end functionality!"
    
    blocks = []
    paragraphs = [p.strip() for p in text_content.split("\n\n") if p.strip()]
    for idx, p in enumerate(paragraphs):
        blocks.append({
            "block_index": idx,
            "page_number": None,
            "text": p
        })
        
    db_doc = models.Document(
        filename=request.filename or f"Imported from {request.provider}",
        file_type="txt",
        folder_id=request.folder_id,
    )
    db.add(db_doc)
    db.commit()
    db.refresh(db_doc)

    db_blocks = []
    for b in blocks:
        db_block = models.DocumentBlock(
            document_id=db_doc.id,
            block_index=b["block_index"],
            page_number=b["page_number"],
            text=b["text"]
        )
        db_blocks.append(db_block)
    
    db.add_all(db_blocks)
    db.commit()
    db.refresh(db_doc)
    db_doc.blocks.sort(key=lambda x: x.block_index)
    
    return db_doc

@router.get("", response_model=List[schemas.DocumentSchema])
def list_documents(
    folder_id: Optional[int] = Query(None),
    root_only: bool = Query(False),
    db: Session = Depends(get_db),
):
    query = db.query(models.Document)
    if root_only:
        query = query.filter(models.Document.folder_id.is_(None))
    elif folder_id is not None:
        query = query.filter(models.Document.folder_id == folder_id)
    return query.order_by(models.Document.upload_date.desc()).all()


@router.post("/bulk-move", response_model=schemas.BulkActionResponse)
def bulk_move_documents(request: schemas.BulkMoveRequest, db: Session = Depends(get_db)):
    _validate_folder_id(db, request.folder_id)
    docs = db.query(models.Document).filter(models.Document.id.in_(request.document_ids)).all()
    if not docs:
        raise HTTPException(status_code=404, detail="No matching documents found.")

    for doc in docs:
        doc.folder_id = request.folder_id
    db.commit()
    return schemas.BulkActionResponse(
        affected=len(docs),
        message=f"Moved {len(docs)} document(s).",
    )


@router.post("/bulk-delete", response_model=schemas.BulkActionResponse)
def bulk_delete_documents(request: schemas.BulkDeleteRequest, db: Session = Depends(get_db)):
    docs = db.query(models.Document).filter(models.Document.id.in_(request.document_ids)).all()
    if not docs:
        raise HTTPException(status_code=404, detail="No matching documents found.")

    for doc in docs:
        _delete_document_audio(doc)
        _delete_document_source(doc)
        db.delete(doc)
    db.commit()
    return schemas.BulkActionResponse(
        affected=len(docs),
        message=f"Deleted {len(docs)} document(s).",
    )


@router.get("/{document_id}", response_model=schemas.DocumentDetailSchema)
def get_document(document_id: int, db: Session = Depends(get_db)):
    doc = db.query(models.Document).filter(models.Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    doc.blocks.sort(key=lambda x: x.block_index)
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
        "html": "text/html; charset=utf-8",
        "csv": "text/csv; charset=utf-8",
        "log": "text/plain; charset=utf-8",
        "epub": "application/epub+zip",
        "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "doc": "application/msword",
        "rtf": "application/rtf",
        "odt": "application/vnd.oasis.opendocument.text",
    }
    media_type = media_types.get(doc.file_type, "application/octet-stream")
    return FileResponse(
        filepath,
        media_type=media_type,
        filename=doc.filename,
        headers={"Accept-Ranges": "bytes"},
    )


def _derive_document_status(blocks: list[models.DocumentBlock], queue_snapshot: dict) -> str:
    statuses = [b.audio_status for b in blocks]
    if not statuses:
        return "not_started"

    active_id = queue_snapshot.get("active_document_id")
    doc_id = blocks[0].document_id if blocks else None
    queued_ids = queue_snapshot.get("queued_document_ids", [])

    if doc_id in queued_ids and active_id != doc_id:
        return "queued"
    if active_id == doc_id or "generating" in statuses or "pending" in statuses:
        if all(s == "done" for s in statuses):
            return "done"
        if "generating" in statuses or "pending" in statuses:
            return "processing"
    if all(s == "done" for s in statuses):
        return "done"
    if any(s == "failed" for s in statuses) and not any(s in {"pending", "generating", "queued"} for s in statuses):
        return "failed"
    if any(s == "queued" for s in statuses):
        return "queued"
    if all(s == "none" for s in statuses):
        return "not_started"
    return "not_started"


@router.post("/{document_id}/generate-audio")
def generate_audio(document_id: int, request: schemas.AudioGenerationRequest, db: Session = Depends(get_db)):
    doc = db.query(models.Document).filter(models.Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    blocks = (
        db.query(models.DocumentBlock)
        .filter(models.DocumentBlock.document_id == document_id)
        .order_by(models.DocumentBlock.block_index)
        .all()
    )
    if not blocks:
        raise HTTPException(status_code=400, detail="Document has no text blocks to synthesize.")

    all_done = all(block.audio_status == "done" for block in blocks)
    result, queue_position = tts_job_queue.submit(
        document_id,
        request.voice_tier,
        force=request.force,
        all_blocks_done=all_done,
    )

    if result == JobSubmitResult.ALREADY_DONE:
        snapshot = tts_job_queue.get_snapshot(document_id)
        return {
            "message": "Audio already generated for this document.",
            "document_status": "done",
            "queue_position": None,
            "active_document_id": snapshot["active_document_id"],
        }

    if result in {JobSubmitResult.ALREADY_QUEUED, JobSubmitResult.ALREADY_PROCESSING}:
        snapshot = tts_job_queue.get_snapshot(document_id)
        document_status = "processing" if result == JobSubmitResult.ALREADY_PROCESSING else "queued"
        return {
            "message": f"Document is already {document_status}.",
            "document_status": document_status,
            "queue_position": snapshot.get("queue_position"),
            "active_document_id": snapshot["active_document_id"],
        }

    if request.force or not all_done:
        next_status = "queued" if result == JobSubmitResult.QUEUED else "pending"
        for block in blocks:
            block.audio_status = next_status
        db.commit()

    snapshot = tts_job_queue.get_snapshot(document_id)
    document_status = "queued" if result == JobSubmitResult.QUEUED else "processing"
    return {
        "message": f"Audio generation {'queued' if result == JobSubmitResult.QUEUED else 'started'} with {request.voice_tier}",
        "document_status": document_status,
        "queue_position": queue_position,
        "active_document_id": snapshot["active_document_id"],
    }


@router.get("/{document_id}/audio-status", response_model=schemas.AudioStatusResponse)
def get_audio_status(document_id: int, db: Session = Depends(get_db)):
    blocks = (
        db.query(models.DocumentBlock)
        .filter(models.DocumentBlock.document_id == document_id)
        .order_by(models.DocumentBlock.block_index)
        .all()
    )
    if not blocks:
        raise HTTPException(status_code=404, detail="Document not found")

    snapshot = tts_job_queue.get_snapshot(document_id)
    status_map = {b.id: b.audio_status for b in blocks}
    document_status = _derive_document_status(blocks, snapshot)

    return schemas.AudioStatusResponse(
        document_status=document_status,
        queue_position=snapshot.get("queue_position"),
        active_document_id=snapshot.get("active_document_id"),
        status=status_map,
    )

@router.get("/{document_id}/blocks/{block_id}/audio")
def get_block_audio(document_id: int, block_id: int, db: Session = Depends(get_db)):
    block = db.query(models.DocumentBlock).filter(
        models.DocumentBlock.id == block_id, 
        models.DocumentBlock.document_id == document_id
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
