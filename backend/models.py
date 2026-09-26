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
    file_type = Column(String)  # 'pdf' or 'txt'
    folder_id = Column(Integer, ForeignKey("folders.id"), nullable=True, index=True)
    source_path = Column(String, nullable=True)
    page_count = Column(Integer, nullable=True)
    upload_date = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    folder = relationship("Folder", back_populates="documents")
    blocks = relationship("DocumentBlock", back_populates="document", cascade="all, delete-orphan")


class DocumentBlock(Base):
    __tablename__ = "document_blocks"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"))
    block_index = Column(Integer)       # Ordered paragraph index
    page_number = Column(Integer, nullable=True)
    text = Column(Text)

    # Audio — populated later once TTS is wired up
    audio_path = Column(String, nullable=True)
    audio_status = Column(String, default="none")  # none | pending | generating | done | failed
    audio_duration = Column(Float, nullable=True)

    document = relationship("Document", back_populates="blocks")
