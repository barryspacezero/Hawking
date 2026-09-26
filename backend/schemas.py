from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional
from datetime import datetime


# ---------------------------------------------------------------------------
# Folder
# ---------------------------------------------------------------------------

class FolderCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)


class FolderUpdateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)


class FolderSchema(BaseModel):
    id: int
    name: str
    created_at: datetime
    document_count: int = 0
    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Document
# ---------------------------------------------------------------------------

class DocumentSchema(BaseModel):
    id: int
    filename: str
    file_type: str
    folder_id: Optional[int] = None
    source_path: Optional[str] = None
    page_count: Optional[int] = None
    upload_date: datetime
    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Document Block
# ---------------------------------------------------------------------------

class DocumentBlockSchema(BaseModel):
    id: int
    block_index: int
    page_number: Optional[int]
    text: str
    audio_status: str = "none"
    audio_path: Optional[str] = None
    audio_duration: Optional[float] = None
    model_config = ConfigDict(from_attributes=True)


class DocumentDetailSchema(DocumentSchema):
    blocks: List[DocumentBlockSchema]


# ---------------------------------------------------------------------------
# Misc
# ---------------------------------------------------------------------------

class BulkMoveRequest(BaseModel):
    document_ids: List[int] = Field(..., min_length=1)
    folder_id: Optional[int] = None


class BulkDeleteRequest(BaseModel):
    document_ids: List[int] = Field(..., min_length=1)


class BulkActionResponse(BaseModel):
    affected: int
    message: str
