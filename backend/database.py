from sqlalchemy import create_engine, inspect, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

DB_DIR = os.path.join(os.path.dirname(__file__), "data")
os.makedirs(DB_DIR, exist_ok=True)

DB_PATH = os.path.join(DB_DIR, "hawking.db")
LEGACY_DB_PATH = os.path.join(DB_DIR, "readaloud.db")
if not os.path.exists(DB_PATH) and os.path.exists(LEGACY_DB_PATH):
    os.rename(LEGACY_DB_PATH, DB_PATH)

SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def run_migrations():
    """Apply lightweight schema migrations for existing SQLite databases."""
    inspector = inspect(engine)
    table_names = inspector.get_table_names()

    with engine.begin() as conn:
        if "documents" in table_names:
            doc_columns = {col["name"] for col in inspector.get_columns("documents")}
            if "folder_id" not in doc_columns:
                conn.execute(text("ALTER TABLE documents ADD COLUMN folder_id INTEGER"))
            if "source_path" not in doc_columns:
                conn.execute(text("ALTER TABLE documents ADD COLUMN source_path VARCHAR"))
            if "page_count" not in doc_columns:
                conn.execute(text("ALTER TABLE documents ADD COLUMN page_count INTEGER"))

        if "document_blocks" in table_names:
            block_columns = {col["name"] for col in inspector.get_columns("document_blocks")}
            if "text_spans" not in block_columns:
                conn.execute(text("ALTER TABLE document_blocks ADD COLUMN text_spans TEXT"))


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
