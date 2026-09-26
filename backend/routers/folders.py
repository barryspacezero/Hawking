from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from models import Folder, Document
from schemas import FolderCreateRequest, FolderUpdateRequest, FolderSchema

router = APIRouter(prefix="/folders", tags=["folders"])


@router.get("/", response_model=list[FolderSchema])
def list_folders(db: Session = Depends(get_db)):
    folders = db.query(Folder).order_by(Folder.created_at.desc()).all()
    result = []
    for folder in folders:
        count = db.query(func.count(Document.id)).filter(Document.folder_id == folder.id).scalar()
        schema = FolderSchema.model_validate(folder)
        schema.document_count = count or 0
        result.append(schema)
    return result


@router.post("/", response_model=FolderSchema, status_code=201)
def create_folder(payload: FolderCreateRequest, db: Session = Depends(get_db)):
    folder = Folder(name=payload.name.strip())
    db.add(folder)
    db.commit()
    db.refresh(folder)
    schema = FolderSchema.model_validate(folder)
    schema.document_count = 0
    return schema


@router.patch("/{folder_id}", response_model=FolderSchema)
def rename_folder(folder_id: int, payload: FolderUpdateRequest, db: Session = Depends(get_db)):
    folder = db.query(Folder).filter(Folder.id == folder_id).first()
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    folder.name = payload.name.strip()
    db.commit()
    db.refresh(folder)
    count = db.query(func.count(Document.id)).filter(Document.folder_id == folder.id).scalar()
    schema = FolderSchema.model_validate(folder)
    schema.document_count = count or 0
    return schema


@router.delete("/{folder_id}", status_code=204)
def delete_folder(folder_id: int, db: Session = Depends(get_db)):
    folder = db.query(Folder).filter(Folder.id == folder_id).first()
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    db.delete(folder)
    db.commit()
