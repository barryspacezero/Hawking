import pytest
from fastapi.testclient import TestClient
from main import app, Base, engine
from database import get_db, SessionLocal
import fitz
import io
import zipfile
from docx import Document

# Setup test DB
Base.metadata.create_all(bind=engine)

def override_get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

def create_dummy_pdf(text="Hello world!", empty=False):
    doc = fitz.open()
    if not empty:
        page = doc.new_page()
        page.insert_text(fitz.Point(50, 50), text)
    else:
        doc.new_page() # empty page
    pdf_bytes = doc.write()
    doc.close()
    return pdf_bytes

def test_upload_valid_txt():
    response = client.post(
        "/documents/upload",
        files={"file": ("test.txt", b"Paragraph 1\n\nParagraph 2", "text/plain")}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["filename"] == "test.txt"
    assert len(data["blocks"]) == 2
    assert data["blocks"][0]["text"] == "Paragraph 1"
    assert data["source_path"] is not None

    source_res = client.get(f"/documents/{data['id']}/source")
    assert source_res.status_code == 200
    assert "Paragraph 1" in source_res.text

def test_upload_valid_pdf():
    pdf_bytes = create_dummy_pdf("This is a test PDF.\nSecond line.")
    response = client.post(
        "/documents/upload",
        files={"file": ("test.pdf", pdf_bytes, "application/pdf")}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["filename"] == "test.pdf"
    assert len(data["blocks"]) > 0
    assert "test PDF" in data["blocks"][0]["text"]
    assert data["source_path"] is not None
    assert data["page_count"] == 1
    assert data["blocks"][0]["text_spans"] is not None

    source_res = client.get(f"/documents/{data['id']}/source")
    assert source_res.status_code == 200
    assert source_res.headers["content-type"].startswith("application/pdf")

def test_upload_large_txt_over_default_multipart_limit():
    # Starlette's default multipart part limit is 1MB; uploads must work above that.
    large_text = ("Paragraph content. " * 50000).encode("utf-8")
    response = client.post(
        "/documents/upload",
        files={"file": ("large.txt", large_text, "text/plain")},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["file_type"] == "txt"
    assert len(data["blocks"]) >= 1


def test_upload_oversized():
    # Simulate oversized file by mocking length check or creating large bytes
    # Since we limit at 20MB, we can just send 21MB of zeros.
    large_bytes = b"0" * (100 * 1024 * 1024 + 1)
    response = client.post(
        "/documents/upload",
        files={"file": ("large.txt", large_bytes, "text/plain")}
    )
    assert response.status_code == 413
    assert "too large" in response.json()["detail"]

def test_upload_unsupported():
    response = client.post(
        "/documents/upload",
        files={"file": ("test.jpg", b"fake image bytes", "image/jpeg")}
    )
    assert response.status_code == 400
    assert "Unsupported file type" in response.json()["detail"]

def test_upload_valid_docx():
    doc = Document()
    doc.add_paragraph("Chapter One")
    doc.add_paragraph("This is a DOCX test document.")
    buffer = io.BytesIO()
    doc.save(buffer)
    buffer.seek(0)

    response = client.post(
        "/documents/upload",
        files={
            "file": (
                "sample.docx",
                buffer.getvalue(),
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            )
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["file_type"] == "docx"
    assert len(data["blocks"]) >= 1
    assert "DOCX test" in " ".join(block["text"] for block in data["blocks"])


def test_upload_valid_epub():
    epub_buffer = io.BytesIO()
    with zipfile.ZipFile(epub_buffer, "w") as archive:
        archive.writestr(
            "mimetype",
            "application/epub+zip",
            compress_type=zipfile.ZIP_STORED,
        )
        archive.writestr(
            "META-INF/container.xml",
            """<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>""",
        )
        archive.writestr(
            "content.opf",
            """<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="2.0" unique-identifier="bookid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>Test EPUB</dc:title>
    <dc:identifier id="bookid">test-epub</dc:identifier>
  </metadata>
  <manifest>
    <item id="chapter1" href="chapter1.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="chapter1"/>
  </spine>
</package>""",
        )
        archive.writestr(
            "chapter1.xhtml",
            """<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
  <body><p>EPUB chapter content for Hawking.</p></body>
</html>""",
        )
    epub_bytes = epub_buffer.getvalue()

    response = client.post(
        "/documents/upload",
        files={"file": ("sample.epub", epub_bytes, "application/epub+zip")},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["file_type"] == "epub"
    assert len(data["blocks"]) >= 1
    assert "EPUB chapter content" in " ".join(block["text"] for block in data["blocks"])


def test_supported_formats_endpoint():
    response = client.get("/documents/supported-formats")
    assert response.status_code == 200
    data = response.json()
    assert "pdf" in data["extensions"]
    assert "docx" in data["extensions"]
    assert "epub" in data["extensions"]


def test_upload_image_only_pdf():
    pdf_bytes = create_dummy_pdf(empty=True)
    response = client.post(
        "/documents/upload",
        files={"file": ("empty.pdf", pdf_bytes, "application/pdf")}
    )
    assert response.status_code == 400
    assert "No extractable text" in response.json()["detail"]
