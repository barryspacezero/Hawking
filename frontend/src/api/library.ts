import type { DocumentItem, FolderItem } from '../types/library';

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail ?? `Request failed: ${res.status}`);
  }
  // 204 No Content
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Folders
// ---------------------------------------------------------------------------

export const fetchFolders = () => request<FolderItem[]>('/folders/');

export const createFolder = (name: string) =>
  request<FolderItem>('/folders/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });

export const renameFolder = (id: number, name: string) =>
  request<FolderItem>(`/folders/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });

export const deleteFolder = (id: number) =>
  request<void>(`/folders/${id}`, { method: 'DELETE' });

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

export const fetchDocuments = (opts?: { folderId?: number | null; rootOnly?: boolean }) => {
  const params = new URLSearchParams();
  if (opts?.rootOnly) params.set('root_only', 'true');
  else if (opts?.folderId != null) params.set('folder_id', String(opts.folderId));
  const qs = params.toString();
  return request<DocumentItem[]>(`/documents${qs ? `?${qs}` : ''}`);
};

export const uploadDocument = (file: File, folderId?: number | null) => {
  const form = new FormData();
  form.append('file', file);
  if (folderId != null) form.append('folder_id', String(folderId));
  return request<DocumentItem>('/documents/upload', { method: 'POST', body: form });
};

export const uploadText = (text: string, title?: string, folderId?: number | null) =>
  request<DocumentItem>('/documents/text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, title, folder_id: folderId }),
  });

export const deleteDocument = (id: number) =>
  request<void>(`/documents/${id}`, { method: 'DELETE' });

export const bulkDeleteDocuments = (ids: number[]) =>
  request<void>('/documents/bulk-delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ document_ids: ids }),
  });

export const bulkMoveDocuments = (ids: number[], folderId: number | null) =>
  request<void>('/documents/bulk-move', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ document_ids: ids, folder_id: folderId }),
  });
