export interface DocumentItem {
  id: number;
  filename: string;
  file_type: string;
  folder_id: number | null;
  upload_date: string;
}

export interface FolderItem {
  id: number;
  name: string;
  created_at: string;
  document_count: number;
}

export type LibraryViewMode = 'grid' | 'list';

