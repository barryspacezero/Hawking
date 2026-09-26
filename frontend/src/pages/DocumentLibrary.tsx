import { useCallback, useEffect, useMemo, useState, type MouseEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  FileText,
  Calendar,
  Folder,
  FolderPlus,
  LayoutGrid,
  List,
  ChevronRight,
  Home,
  Trash2,
  FolderInput,
  Pencil,
  CheckSquare,
  Square,
  X,
  Loader2,
} from 'lucide-react';
import { useLibrary } from '../context/LibraryContext';
import type { DocumentItem, FolderItem } from '../types/library';
import {
  fetchDocuments,
  fetchFolders,
  createFolder,
  renameFolder,
  deleteFolder,
  bulkMoveDocuments,
  bulkDeleteDocuments,
} from '../api/library';
import ConfirmDialog from '../components/ConfirmDialog';
import MoveToFolderModal from '../components/MoveToFolderModal';

export default function DocumentLibrary() {
  const { folderId: folderIdParam } = useParams<{ folderId?: string }>();
  const navigate = useNavigate();
  const currentFolderId = folderIdParam ? parseInt(folderIdParam, 10) : null;

  const {
    viewMode,
    setViewMode,
    selectionMode,
    setSelectionMode,
    selectedIds,
    toggleSelection,
    selectAll,
    clearSelection,
  } = useLibrary();

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [currentFolder, setCurrentFolder] = useState<FolderItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');

  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [renamingFolderId, setRenamingFolderId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showFolderDeleteConfirm, setShowFolderDeleteConfirm] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<FolderItem | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const allFolders = await fetchFolders();
      setFolders(allFolders);

      if (currentFolderId != null) {
        const folder = allFolders.find((f) => f.id === currentFolderId);
        if (!folder) throw new Error('Folder not found');
        setCurrentFolder(folder);
        const docs = await fetchDocuments({ folderId: currentFolderId });
        setDocuments(docs);
      } else {
        setCurrentFolder(null);
        const docs = await fetchDocuments({ rootOnly: true });
        setDocuments(docs);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentFolderId]);

  useEffect(() => {
    clearSelection();
    loadData();
  }, [loadData, clearSelection]);

  const subfolders = useMemo(() => folders, [folders]);
  const visibleDocIds = useMemo(() => documents.map((d) => d.id), [documents]);
  const allSelected = visibleDocIds.length > 0 && visibleDocIds.every((id) => selectedIds.has(id));

  const handleCreateFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return;
    setActionError('');
    try {
      await createFolder(name);
      setNewFolderName('');
      setShowNewFolder(false);
      await loadData();
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const handleRenameFolder = async (id: number) => {
    const name = renameValue.trim();
    if (!name) return;
    setActionError('');
    try {
      await renameFolder(id, name);
      setRenamingFolderId(null);
      setRenameValue('');
      await loadData();
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const handleDeleteFolder = async () => {
    if (!folderToDelete) return;
    setActionLoading(true);
    setActionError('');
    try {
      await deleteFolder(folderToDelete.id);
      setShowFolderDeleteConfirm(false);
      setFolderToDelete(null);
      if (currentFolderId === folderToDelete.id) navigate('/library');
      else await loadData();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkMove = async (targetFolderId: number | null) => {
    const ids = Array.from(selectedIds);
    await bulkMoveDocuments(ids, targetFolderId);
    clearSelection();
    await loadData();
  };

  const handleBulkDelete = async () => {
    setActionLoading(true);
    setActionError('');
    try {
      const ids = Array.from(selectedIds);
      await bulkDeleteDocuments(ids);
      clearSelection();
      setShowDeleteConfirm(false);
      await loadData();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDocClick = (docId: number, e: MouseEvent) => {
    if (selectionMode) {
      e.preventDefault();
      toggleSelection(docId);
      return;
    }
    navigate(`/document/${docId}`);
  };

  const handleDocSelectToggle = (docId: number, e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectionMode) setSelectionMode(true);
    toggleSelection(docId);
  };

  const renderDocCard = (doc: DocumentItem) => {
    const isSelected = selectedIds.has(doc.id);
    const baseClass = viewMode === 'grid'
      ? 'relative bg-cardBg  rounded-none border p-5 hover:border-brand/50 hover:bg-cardHover transition cursor-pointer'
      : 'bg-cardBg  rounded-none border p-4 hover:border-brand/50 hover:bg-cardHover transition cursor-pointer flex items-center gap-4';

    const borderClass = isSelected ? 'border-brand/60 ring-1 ring-brand/30' : 'border-borderDark';

    return (
      <div
        key={doc.id}
        role="button"
        tabIndex={0}
        onClick={(e) => handleDocClick(doc.id, e)}
        onKeyDown={(e) => e.key === 'Enter' && handleDocClick(doc.id, e as unknown as MouseEvent)}
        className={`${baseClass} ${borderClass}`}
      >
        <button
          onClick={(e) => handleDocSelectToggle(doc.id, e)}
          className={`shrink-0 ${viewMode === 'grid' ? 'absolute top-3 right-3' : ''}`}
          aria-label={isSelected ? 'Deselect' : 'Select'}
        >
          {isSelected ? (
            <CheckSquare className="w-5 h-5 text-brand" />
          ) : (
            <Square className="w-5 h-5 text-gray-500 hover:text-gray-300" />
          )}
        </button>

        {viewMode === 'grid' ? (
          <div className="relative">
            <div className="flex items-start justify-between mb-4 pr-8">
              <FileText className={`w-8 h-8 ${doc.file_type === 'pdf' ? 'text-red-400' : 'text-brand'}`} />
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 bg-white/5 px-2 py-1 rounded">
                {doc.file_type}
              </span>
            </div>
            <h3 className="font-semibold text-gray-200 line-clamp-2" title={doc.filename}>{doc.filename}</h3>
            <div className="flex items-center text-xs text-gray-500 mt-4 space-x-1">
              <Calendar className="w-3 h-3" />
              <span>{new Date(doc.upload_date).toLocaleDateString()}</span>
            </div>
          </div>
        ) : (
          <>
            <FileText className={`w-6 h-6 shrink-0 ${doc.file_type === 'pdf' ? 'text-red-400' : 'text-brand'}`} />
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-gray-200 truncate" title={doc.filename}>{doc.filename}</h3>
              <p className="text-xs text-gray-500 mt-0.5">{doc.file_type.toUpperCase()}</p>
            </div>
            <div className="flex items-center text-xs text-gray-500 shrink-0">
              <Calendar className="w-3 h-3 mr-1" />
              {new Date(doc.upload_date).toLocaleDateString()}
            </div>
          </>
        )}
      </div>
    );
  };

  const renderFolderCard = (folder: FolderItem) => {
    const isRenaming = renamingFolderId === folder.id;

    if (viewMode === 'list') {
      return (
        <div
          key={`folder-${folder.id}`}
          className="bg-cardBg  rounded-none border border-borderDark p-4 flex items-center gap-4 hover:border-brand/50 hover:bg-cardHover transition group"
        >
          <Folder className="w-6 h-6 text-brand shrink-0" />
          {isRenaming ? (
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameFolder(folder.id);
                if (e.key === 'Escape') setRenamingFolderId(null);
              }}
              className="flex-1 bg-cardBg  border border-borderDark rounded-none px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand"
            />
          ) : (
            <button
              onClick={() => navigate(`/library/folder/${folder.id}`)}
              className="flex-1 text-left min-w-0"
            >
              <h3 className="font-medium text-gray-200 truncate">{folder.name}</h3>
              <p className="text-xs text-gray-500">{folder.document_count} file(s)</p>
            </button>
          )}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
            <button
              onClick={() => { setRenamingFolderId(folder.id); setRenameValue(folder.name); }}
              className="p-1.5 rounded-none hover:bg-white/10 text-gray-400"
              title="Rename folder"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={() => { setFolderToDelete(folder); setShowFolderDeleteConfirm(true); }}
              className="p-1.5 rounded-none hover:bg-white/10 text-gray-400 hover:text-red-400"
              title="Delete folder"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      );
    }

    return (
      <div
        key={`folder-${folder.id}`}
        className="bg-cardBg  rounded-none border border-borderDark p-5 hover:border-brand/50 hover:bg-cardHover transition group relative"
      >
        <div className="flex items-start justify-between mb-4">
          <button onClick={() => navigate(`/library/folder/${folder.id}`)} className="text-left flex-1">
            <Folder className="w-8 h-8 text-brand mb-3" />
            {isRenaming ? (
              <input
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRenameFolder(folder.id);
                  if (e.key === 'Escape') setRenamingFolderId(null);
                }}
                className="w-full bg-cardBg  border border-borderDark rounded-none px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand"
              />
            ) : (
              <h3 className="font-semibold text-gray-200 line-clamp-2">{folder.name}</h3>
            )}
          </button>
          <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition">
            <button
              onClick={() => { setRenamingFolderId(folder.id); setRenameValue(folder.name); }}
              className="p-1.5 rounded-none hover:bg-white/10 text-gray-400"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => { setFolderToDelete(folder); setShowFolderDeleteConfirm(true); }}
              className="p-1.5 rounded-none hover:bg-white/10 text-gray-400 hover:text-red-400"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-500">{folder.document_count} file(s)</p>
      </div>
    );
  };

    const isEmpty = !loading && subfolders.length === 0 && documents.length === 0;

  const filteredDocs = documents.filter(d => d.filename.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredFolders = subfolders.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="p-6 md:p-10 pb-24">
      {/* Breadcrumb */}
      <nav className="flex items-center text-sm text-gray-500 mb-4 flex-wrap gap-1">
        <Link to="/" className="hover:text-gray-300 flex items-center gap-1">
          <Home className="w-3.5 h-3.5" />
          Home
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link to="/library" className={currentFolder ? 'hover:text-gray-300' : 'text-white'}>
          Library
        </Link>
        {currentFolder && (
          <>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-white truncate max-w-[200px]">{currentFolder.name}</span>
          </>
        )}
      </nav>

            {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-3xl font-extrabold">
          {currentFolder ? currentFolder.name : 'Your Library'}
        </h1>
        
        <div className="flex-1 max-w-md mx-4 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search files and folders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-cardBg border border-borderDark focus:border-brand-light text-sm text-gray-200 placeholder-gray-500 pl-9 pr-4 py-2 rounded-none focus:outline-none focus:ring-0 transition"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-black/40 rounded-none p-1 border border-borderDark">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-none transition ${viewMode === 'grid' ? 'bg-brand/10 text-brand border-brand/30' : 'text-gray-400 hover:text-gray-200'}`}
              title="Grid view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-none transition ${viewMode === 'list' ? 'bg-brand/10 text-brand border-brand/30' : 'text-gray-400 hover:text-gray-200'}`}
              title="List view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setShowNewFolder(true)}
            className="flex items-center gap-2 bg-cardHover border border-borderDark hover:border-brand/50 text-white px-4 py-2 rounded-none text-sm text-gray-200 transition"
          >
            <FolderPlus className="w-4 h-4 text-brand-light" />
            New Folder
          </button>

          {visibleDocIds.length > 0 && (
            <button
              onClick={() => {
                if (allSelected) clearSelection();
                else selectAll(visibleDocIds);
              }}
              className="flex items-center gap-2 bg-cardHover border border-borderDark hover:border-brand/50 text-white px-4 py-2 rounded-none text-sm text-gray-200 transition"
            >
              <CheckSquare className="w-4 h-4" />
              {allSelected ? 'Deselect All' : 'Select All'}
            </button>
          )}
        </div>
      </div>

      {actionError && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-none text-sm">
          {actionError}
        </div>
      )}

      {showNewFolder && (
        <div className="mb-6 flex gap-2 flex-wrap">
          <input
            autoFocus
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
            placeholder="Folder name"
            className="flex-1 min-w-[200px] bg-cardBg  border border-borderDark rounded-none px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand"
          />
          <button onClick={handleCreateFolder} className="   text-white   px-4 py-2 rounded-none text-sm font-medium">
            Create
          </button>
          <button onClick={() => { setShowNewFolder(false); setNewFolderName(''); }} className="text-gray-400 hover:text-white px-3">
            Cancel
          </button>
        </div>
      )}

      {loading && (
        <div className="text-center py-16 text-gray-400 flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading library...
        </div>
      )}

      {error && !loading && (
        <div className="text-red-400 text-center py-10">{error}</div>
      )}

      {!loading && !error && isEmpty && (
        <div className="bg-cardBg  rounded-none border border-borderDark border-dashed p-12 text-center">
          <FileText className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-200">
            {currentFolder ? 'This folder is empty' : 'No documents yet'}
          </h3>
          <p className="text-gray-400 mt-2 mb-6">
            {currentFolder
              ? 'Move files here or upload a new document.'
              : 'Upload a PDF, DOCX, EPUB, or other supported file to get started.'}
          </p>
          <Link to="/upload" className="bg-brand text-white px-6 py-2 rounded-none hover:bg-brand-hover font-medium transition">
            Upload Document
          </Link>
        </div>
      )}

      {!loading && !error && !isEmpty && (
        <div className={viewMode === 'grid' ? 'grid gap-4 md:grid-cols-2 lg:grid-cols-3' : 'space-y-2'}>
          {!currentFolderId && filteredFolders.map(renderFolderCard)}
          {filteredDocs.map(renderDocCard)}
        </div>
      )}

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-0 left-0 lg:left-64 right-0 z-40 bg-cardBg  border-t border-borderDark backdrop-blur-md px-6 py-4 flex items-center justify-between">
          <span className="text-sm text-gray-300">{selectedIds.size} selected</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowMoveModal(true)}
              className="flex items-center gap-2    text-white   px-4 py-2 rounded-none text-sm font-medium transition"
            >
              <FolderInput className="w-4 h-4" />
              Move
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 bg-red-600/80 hover:bg-red-600 text-white px-4 py-2 rounded-none text-sm font-medium transition"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
            <button onClick={clearSelection} className="p-2 text-gray-400 hover:text-white rounded-none hover:bg-white/10">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      <MoveToFolderModal
        isOpen={showMoveModal}
        folders={folders.filter((f) => f.id !== currentFolderId)}
        selectedCount={selectedIds.size}
        onClose={() => setShowMoveModal(false)}
        onMove={handleBulkMove}
      />

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete files?"
        message={`This will permanently delete ${selectedIds.size} file(s) and their generated audio. This cannot be undone.`}
        confirmLabel={actionLoading ? 'Deleting...' : 'Delete'}
        destructive
        onConfirm={handleBulkDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      <ConfirmDialog
        isOpen={showFolderDeleteConfirm}
        title="Delete folder?"
        message={`Delete "${folderToDelete?.name}"? Files inside will be moved to the library root.`}
        confirmLabel={actionLoading ? 'Deleting...' : 'Delete Folder'}
        destructive
        onConfirm={handleDeleteFolder}
        onCancel={() => { setShowFolderDeleteConfirm(false); setFolderToDelete(null); }}
      />
    </div>
  );
}




