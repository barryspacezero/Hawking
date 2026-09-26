from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import fitz  # PyMuPDF
import os
import uuid
import logging

from database import get_db
import models
import schemas

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/documents", tags=["documents"])

MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB

SOURCE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "sources")
os.makedirs(SOURCE_DIR, exist_ok=True)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _validate_folder(db: Session, folder_id: Optional[int]) -> None:
    if folder_id is None:
        return
    if not db.query(models.Folder).filter(models.Folder.id == folder_id).first():
        raise HTTPException(status_code=404, detail="Folder not found.")


def _save_source_file(document_id: int, filename: str, content: bytes) -> str:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "bin"
    name = f"doc_{document_id}_{uuid.uuid4().hex[:8]}.{ext}"
    with open(os.path.join(SOURCE_DIR, name), "wb") as f:
        f.write(content)
    return name


def _remove_source_file(doc: models.Document) -> None:
    if doc.source_path:
        path = os.path.join(SOURCE_DIR, doc.source_path)
        if os.path.exists(path):
            try:
                os.remove(path)
            except OSError as e:
                logger.warning(f"Could not remove source file: {e}")


def _parse_pdf(content: bytes) -> tuple[list[dict], int]:
    """Returns (blocks, page_count). Raises HTTPException on bad PDFs."""
    try:
        pdf = fitz.open(stream=content, filetype="pdf")
        page_count = len(pdf)
        blocks, block_idx = [], 0
        for page_num, page in enumerate(pdf):
            text = page.get_text("text").strip()
            if text:
                blocks.append({
                    "block_index": block_idx,
                    "page_number": page_num + 1,
                    "text": text,
                })
                block_idx += 1
        if not blocks:
            raise HTTPException(
                status_code=400,
                detail="No extractable text found. This may be an image-only or encrypted PDF.",
            )
        return blocks, page_count
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse PDF: {e}")


def _parse_txt(content: bytes) -> list[dict]:
    try:
        text = content.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="File must be UTF-8 encoded.")
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    return [{"block_index": i, "page_number": None, "text": p} for i, p in enumerate(paragraphs)]


def _persist_blocks(db: Session, doc: models.Document, raw_blocks: list[dict]) -> None:
    db_blocks = [
        models.DocumentBlock(
            document_id=doc.id,
            block_index=b["block_index"],
            page_number=b["page_number"],
            text=b["text"],
        )
        for b in raw_blocks
    ]
    db.add_all(db_blocks)
    db.commit()
    db.refresh(doc)
    doc.blocks.sort(key=lambda x: x.block_index)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post("/upload", response_model=schemas.DocumentDetailSchema, status_code=201)
async def upload_document(
    file: UploadFile = File(...),
    folder_id: Optional[int] = Form(None),
    db: Session = Depends(get_db),
):
    _validate_folder(db, folder_id)
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided.")

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in ("pdf", "txt"):
        raise HTTPException(status_code=400, detail="Only PDF and TXT files are supported.")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="File is empty.")
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File exceeds the 20 MB limit.")

    raw_blocks: list[dict] = []
    page_count: Optional[int] = None

    if ext == "pdf":
        raw_blocks, page_count = _parse_pdf(content)
    else:
        raw_blocks = _parse_txt(content)

    db_doc = models.Document(
        filename=file.filename,
        file_type=ext,
        folder_id=folder_id,
        page_count=page_count,
    )
    db.add(db_doc)
    db.commit()
    db.refresh(db_doc)

    db_doc.source_path = _save_source_file(db_doc.id, file.filename, content)
    db.commit()

    _persist_blocks(db, db_doc, raw_blocks)
    return db_doc


@router.post("/text", response_model=schemas.DocumentDetailSchema, status_code=201)
async def upload_text(request: schemas.TextInputRequest, db: Session = Depends(get_db)):
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty.")
    _validate_folder(db, request.folder_id)

    paragraphs = [p.strip() for p in request.text.split("\n\n") if p.strip()]
    raw_blocks = [{"block_index": i, "page_number": None, "text": p} for i, p in enumerate(paragraphs)]

    db_doc = models.Document(
        filename=request.title or "Pasted Text",
        file_type="txt",
        folder_id=request.folder_id,
    )
    db.add(db_doc)
    db.commit()
    db.refresh(db_doc)

    _persist_blocks(db, db_doc, raw_blocks)
    return db_doc


@router.get("", response_model=List[schemas.DocumentSchema])
def list_documents(
    folder_id: Optional[int] = Query(None),
    root_only: bool = Query(False),
    db: Session = Depends(get_db),
):
    q = db.query(models.Document)
    if root_only:
        q = q.filter(models.Document.folder_id.is_(None))
    elif folder_id is not None:
        q = q.filter(models.Document.folder_id == folder_id)
    return q.order_by(models.Document.upload_date.desc()).all()


@router.get("/{document_id}", response_model=schemas.DocumentDetailSchema)
def get_document(document_id: int, db: Session = Depends(get_db)):
    doc = db.query(models.Document).filter(models.Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    doc.blocks.sort(key=lambda x: x.block_index)
    return doc


@router.delete("/{document_id}", status_code=204)
def delete_document(document_id: int, db: Session = Depends(get_db)):
    doc = db.query(models.Document).filter(models.Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    _remove_source_file(doc)
    db.delete(doc)
    db.commit()


@router.get("/{document_id}/source")
def get_document_source(document_id: int, db: Session = Depends(get_db)):
    doc = db.query(models.Document).filter(models.Document.id == document_id).first()
    if not doc or not doc.source_path:
        raise HTTPException(status_code=404, detail="Source file not available.")

    path = os.path.join(SOURCE_DIR, doc.source_path)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Source file missing on disk.")

    media_type = {"pdf": "application/pdf", "txt": "text/plain; charset=utf-8"}.get(
        doc.file_type, "application/octet-stream"
    )
    return FileResponse(path, media_type=media_type, filename=doc.filename)


@router.post("/bulk-move", response_model=schemas.BulkActionResponse)
def bulk_move(request: schemas.BulkMoveRequest, db: Session = Depends(get_db)):
    _validate_folder(db, request.folder_id)
    docs = db.query(models.Document).filter(models.Document.id.in_(request.document_ids)).all()
    if not docs:
        raise HTTPException(status_code=404, detail="No matching documents found.")
    for doc in docs:
        doc.folder_id = request.folder_id
    db.commit()
    return schemas.BulkActionResponse(affected=len(docs), message=f"Moved {len(docs)} document(s).")


@router.post("/bulk-delete", response_model=schemas.BulkActionResponse)
def bulk_delete(request: schemas.BulkDeleteRequest, db: Session = Depends(get_db)):
    docs = db.query(models.Document).filter(models.Document.id.in_(request.document_ids)).all()
    if not docs:
        raise HTTPException(status_code=404, detail="No matching documents found.")
    for doc in docs:
        _remove_source_file(doc)
        db.delete(doc)
    db.commit()
    return schemas.BulkActionResponse(affected=len(docs), message=f"Deleted {len(docs)} document(s).")
