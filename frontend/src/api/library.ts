import type { DocumentItem, FolderItem } from '../types/library';
import { API_URL } from '../config/api';

const API = API_URL;

export async function fetchFolders(): Promise<FolderItem[]> {
  const res = await fetch(`${API}/folders`);
  if (!res.ok) throw new Error('Failed to fetch folders');
  return res.json();
}

export async function fetchDocuments(opts?: {
  folderId?: number | null;
  rootOnly?: boolean;
}): Promise<DocumentItem[]> {
  const params = new URLSearchParams();
  if (opts?.rootOnly) params.set('root_only', 'true');
  else if (opts?.folderId != null) params.set('folder_id', String(opts.folderId));

  const qs = params.toString();
  const res = await fetch(`${API}/documents${qs ? `?${qs}` : ''}`);
  if (!res.ok) throw new Error('Failed to fetch documents');
  return res.json();
}

export async function createFolder(name: string): Promise<FolderItem> {
  const res = await fetch(`${API}/folders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to create folder');
  }
  return res.json();
}

export async function renameFolder(id: number, name: string): Promise<FolderItem> {
  const res = await fetch(`${API}/folders/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to rename folder');
  }
  return res.json();
}

export async function deleteFolder(id: number): Promise<void> {
  const res = await fetch(`${API}/folders/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to delete folder');
  }
}

export async function bulkMoveDocuments(documentIds: number[], folderId: number | null): Promise<void> {
  const res = await fetch(`${API}/documents/bulk-move`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ document_ids: documentIds, folder_id: folderId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to move documents');
  }
}

export async function bulkDeleteDocuments(documentIds: number[]): Promise<void> {
  const res = await fetch(`${API}/documents/bulk-delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ document_ids: documentIds }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to delete documents');
  }
}
