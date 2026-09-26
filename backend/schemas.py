from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional
from datetime import datetime

class DocumentBlockBase(BaseModel):
    block_index: int
    page_number: Optional[int]
    text: str
    audio_status: str = "none"
    audio_path: Optional[str] = None
    audio_voice: Optional[str] = None
    audio_duration: Optional[float] = None
    word_timestamps: Optional[str] = None
    text_spans: Optional[str] = None

class AudioGenerationRequest(BaseModel):
    voice_tier: str = "kokoro"
    force: bool = False


class AudioGenerationResponse(BaseModel):
    message: str
    document_status: str
    queue_position: Optional[int] = None
    active_document_id: Optional[int] = None


class AudioStatusResponse(BaseModel):
    document_status: str
    queue_position: Optional[int] = None
    active_document_id: Optional[int] = None
    status: dict[int, str]

class TextInputRequest(BaseModel):
    title: Optional[str] = None
    text: str
    folder_id: Optional[int] = None

class LinkInputRequest(BaseModel):
    url: str
    folder_id: Optional[int] = None

class CloudImportRequest(BaseModel):
    provider: str
    file_id: Optional[str] = None
    url: Optional[str] = None
    filename: Optional[str] = None
    folder_id: Optional[int] = None

class DocumentBlockSchema(DocumentBlockBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class DocumentBase(BaseModel):
    filename: str
    file_type: str

class DocumentSchema(DocumentBase):
    id: int
    folder_id: Optional[int] = None
    source_path: Optional[str] = None
    page_count: Optional[int] = None
    upload_date: datetime
    model_config = ConfigDict(from_attributes=True)

class DocumentDetailSchema(DocumentSchema):
    blocks: List[DocumentBlockSchema]

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

class BulkMoveRequest(BaseModel):
    document_ids: List[int] = Field(..., min_length=1)
    folder_id: Optional[int] = None

class BulkDeleteRequest(BaseModel):
    document_ids: List[int] = Field(..., min_length=1)

class BulkActionResponse(BaseModel):
    affected: int
    message: str


class VoiceProfileCreateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=120)


class VoiceProfileUpdateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)


class VoiceProfileSchema(BaseModel):
    id: int
    name: str
    created_at: datetime
    reference_audio_path: str
    conditioning_path: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)
