from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from database import Base

class Folder(Base):
    __tablename__ = "folders"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    documents = relationship("Document", back_populates="folder")


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, index=True)
    file_type = Column(String)  # pdf, txt, docx, epub, etc.
    folder_id = Column(Integer, ForeignKey("folders.id"), nullable=True, index=True)
    source_path = Column(String, nullable=True)  # Original uploaded file on disk
    page_count = Column(Integer, nullable=True)  # Total pages for PDFs
    upload_date = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    folder = relationship("Folder", back_populates="documents")
    blocks = relationship("DocumentBlock", back_populates="document", cascade="all, delete-orphan")

class DocumentBlock(Base):
    __tablename__ = "document_blocks"
    
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"))
    block_index = Column(Integer)  # Ordered sequence (e.g., paragraph index)
    page_number = Column(Integer, nullable=True)  # Applicable for PDFs
    text = Column(Text)
    
    # Audio fields
    audio_path = Column(String, nullable=True)
    audio_status = Column(String, default="none")  # none, pending, generating, done, failed
    audio_voice = Column(String, nullable=True)
    audio_duration = Column(Float, nullable=True)
    word_timestamps = Column(Text, nullable=True)  # JSON string of word timestamps
    text_spans = Column(Text, nullable=True)  # PDF word bounding boxes for read-along sync

    document = relationship("Document", back_populates="blocks")


class VoiceProfile(Base):
    __tablename__ = "voice_profiles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    reference_audio_path = Column(String, nullable=False)
    conditioning_path = Column(String, nullable=True)

    studio_jobs = relationship("StudioGeneration", back_populates="voice_profile")


class StudioGeneration(Base):
    __tablename__ = "studio_generations"

    id = Column(Integer, primary_key=True, index=True)
    voice_profile_id = Column(Integer, ForeignKey("voice_profiles.id"), nullable=False, index=True)
    input_type = Column(String, nullable=False)  # text | document | file
    source_document_id = Column(Integer, ForeignKey("documents.id"), nullable=True)
    source_filename = Column(String, nullable=True)
    input_text = Column(Text, nullable=False)
    status = Column(String, default="queued")  # queued | processing | done | failed
    audio_path = Column(String, nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    voice_profile = relationship("VoiceProfile", back_populates="studio_jobs")
