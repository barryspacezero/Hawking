"""Shared upload size limits for file endpoints."""

MAX_UPLOAD_BYTES = 100 * 1024 * 1024  # 100MB
# Starlette defaults to 1MB per multipart part; large PDFs/DOCX need this raised.
MAX_MULTIPART_PART_SIZE = MAX_UPLOAD_BYTES + (1024 * 1024)
