import uuid

import pytest
from fastapi.testclient import TestClient
from main import app, Base, engine
from database import get_db, SessionLocal

Base.metadata.create_all(bind=engine)


def override_get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


def _unique_name(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:8]}"


def _create_doc(title="Test Doc"):
    res = client.post(
        "/documents/text",
        json={"title": title, "text": "Hello world.\n\nSecond paragraph."},
    )
    assert res.status_code == 200
    return res.json()


def test_create_and_list_folders():
    name = _unique_name("Work")
    res = client.post("/folders", json={"name": name})
    assert res.status_code == 201
    folder = res.json()
    assert folder["name"] == name
    assert folder["document_count"] == 0

    res = client.get("/folders")
    assert res.status_code == 200
    assert any(f["name"] == name for f in res.json())


def test_rename_folder():
    old_name = _unique_name("Old")
    new_name = _unique_name("New")
    folder = client.post("/folders", json={"name": old_name}).json()
    res = client.patch(f"/folders/{folder['id']}", json={"name": new_name})
    assert res.status_code == 200
    assert res.json()["name"] == new_name


def test_delete_folder_moves_docs_to_root():
    folder = client.post("/folders", json={"name": _unique_name("Temp")}).json()
    doc = _create_doc()
    client.post("/documents/bulk-move", json={"document_ids": [doc["id"]], "folder_id": folder["id"]})

    res = client.delete(f"/folders/{folder['id']}")
    assert res.status_code == 200

    doc_res = client.get(f"/documents/{doc['id']}")
    assert doc_res.json()["folder_id"] is None


def test_bulk_move_and_root_filter():
    folder = client.post("/folders", json={"name": _unique_name("Archive")}).json()
    doc1 = _create_doc("Doc 1")
    doc2 = _create_doc("Doc 2")

    client.post("/documents/bulk-move", json={"document_ids": [doc1["id"]], "folder_id": folder["id"]})

    root_res = client.get("/documents?root_only=true")
    root_ids = {d["id"] for d in root_res.json()}
    assert doc1["id"] not in root_ids
    assert doc2["id"] in root_ids

    folder_res = client.get(f"/documents?folder_id={folder['id']}")
    assert len(folder_res.json()) == 1
    assert folder_res.json()[0]["id"] == doc1["id"]


def test_bulk_delete():
    doc = _create_doc("To Delete")
    res = client.post("/documents/bulk-delete", json={"document_ids": [doc["id"]]})
    assert res.status_code == 200
    assert res.json()["affected"] == 1

    res = client.get(f"/documents/{doc['id']}")
    assert res.status_code == 404
