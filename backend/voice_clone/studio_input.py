"""Resolve studio generation input into synthesizable text."""

from __future__ import annotations

from sqlalchemy.orm import Session

import models
from document_parser import parse_document

MAX_STUDIO_TEXT_CHARS = 10_000
MAX_STUDIO_FILE_BYTES = 10 * 1024 * 1024  # 10MB


def _join_blocks(blocks: list) -> str:
    return "\n\n".join(block.text.strip() for block in blocks if block.text and block.text.strip())


def _enforce_limit(text: str) -> str:
    cleaned = text.strip()
    if not cleaned:
        raise ValueError("No readable text found in the input.")
    if len(cleaned) > MAX_STUDIO_TEXT_CHARS:
        raise ValueError(
            f"Input text exceeds the {MAX_STUDIO_TEXT_CHARS} character studio limit. "
            "Try a shorter excerpt or smaller file."
        )
    return cleaned


def text_from_typed_input(text: str) -> str:
    return _enforce_limit(text)


def text_from_document(db: Session, document_id: int) -> tuple[str, str]:
    doc = db.query(models.Document).filter(models.Document.id == document_id).first()
    if not doc:
        raise ValueError("Document not found.")

    blocks = sorted(doc.blocks, key=lambda block: block.block_index)
    combined = _join_blocks(blocks)
    return _enforce_limit(combined), doc.filename


def text_from_upload(filename: str, content: bytes) -> str:
    if len(content) > MAX_STUDIO_FILE_BYTES:
        raise ValueError(f"File too large. Maximum studio upload size is {MAX_STUDIO_FILE_BYTES // (1024 * 1024)}MB.")
    if len(content) == 0:
        raise ValueError("Uploaded file is empty.")

    parsed = parse_document(filename, content)
    combined = "\n\n".join(block.text.strip() for block in parsed.blocks if block.text.strip())
    return _enforce_limit(combined)
