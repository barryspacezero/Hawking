from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List

from database import get_db
import models
import schemas

router = APIRouter(prefix="/folders", tags=["folders"])


def _folder_to_schema(folder: models.Folder, db: Session) -> schemas.FolderSchema:
    count = db.query(func.count(models.Document.id)).filter(
        models.Document.folder_id == folder.id
    ).scalar()
    return schemas.FolderSchema(
        id=folder.id,
        name=folder.name,
        created_at=folder.created_at,
        document_count=count or 0,
    )


@router.get("", response_model=List[schemas.FolderSchema])
def list_folders(db: Session = Depends(get_db)):
    folders = db.query(models.Folder).order_by(models.Folder.name.asc()).all()
    return [_folder_to_schema(f, db) for f in folders]


@router.post("", response_model=schemas.FolderSchema, status_code=201)
def create_folder(request: schemas.FolderCreateRequest, db: Session = Depends(get_db)):
    name = request.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Folder name cannot be empty.")

    existing = db.query(models.Folder).filter(models.Folder.name == name).first()
    if existing:
        raise HTTPException(status_code=409, detail="A folder with this name already exists.")

    folder = models.Folder(name=name)
    db.add(folder)
    db.commit()
    db.refresh(folder)
    return _folder_to_schema(folder, db)


@router.patch("/{folder_id}", response_model=schemas.FolderSchema)
def rename_folder(folder_id: int, request: schemas.FolderUpdateRequest, db: Session = Depends(get_db)):
    folder = db.query(models.Folder).filter(models.Folder.id == folder_id).first()
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found.")

    name = request.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Folder name cannot be empty.")

    duplicate = db.query(models.Folder).filter(
        models.Folder.name == name,
        models.Folder.id != folder_id,
    ).first()
    if duplicate:
        raise HTTPException(status_code=409, detail="A folder with this name already exists.")

    folder.name = name
    db.commit()
    db.refresh(folder)
    return _folder_to_schema(folder, db)


@router.delete("/{folder_id}")
def delete_folder(folder_id: int, db: Session = Depends(get_db)):
    folder = db.query(models.Folder).filter(models.Folder.id == folder_id).first()
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found.")

    db.query(models.Document).filter(models.Document.folder_id == folder_id).update(
        {models.Document.folder_id: None}
    )
    db.delete(folder)
    db.commit()
    return {"message": "Folder deleted. Documents moved to library root."}
