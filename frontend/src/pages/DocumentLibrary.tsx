import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchDocuments, fetchFolders } from '../api/library';
import type { DocumentItem, FolderItem } from '../types/library';
import { FileText, Folder, Plus } from 'lucide-react';

export default function DocumentLibrary() {
  const { folderId } = useParams<{ folderId?: string }>();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [loading, setLoading] = useState(true);

  const numericFolderId = folderId ? Number(folderId) : null;
  const currentFolder = folders.find(f => f.id === numericFolderId);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchDocuments(numericFolderId ? { folderId: numericFolderId } : { rootOnly: !numericFolderId }),
      fetchFolders(),
    ])
      .then(([docs, flds]) => { setDocuments(docs); setFolders(flds); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [folderId]);

  const fmt = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {currentFolder ? currentFolder.name : 'Library'}
          </h1>
          <p className="text-textMuted text-sm mt-0.5">
            {documents.length} document{documents.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          id="library-add-btn"
          to="/upload"
          className="flex items-center gap-2 bg-accentBlue hover:bg-accentHover text-white text-sm font-medium px-4 py-2 rounded-xl transition"
        >
          <Plus className="w-4 h-4" />
          Add document
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-cardBg rounded-2xl h-36 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Folders (only at root) */}
          {!numericFolderId && folders.length > 0 && (
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Folders</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {folders.map(f => (
                  <Link
                    key={f.id}
                    to={`/library/folder/${f.id}`}
                    className="bg-cardBg border border-borderDark rounded-2xl p-4 hover:border-gray-600 transition group"
                  >
                    <Folder className="w-8 h-8 text-accentBlue mb-3" />
                    <p className="text-white text-sm font-medium truncate">{f.name}</p>
                    <p className="text-textMuted text-xs mt-0.5">{f.document_count} item{f.document_count !== 1 ? 's' : ''}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Documents */}
          {documents.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {documents.map(doc => (
                <Link
                  key={doc.id}
                  to={`/document/${doc.id}`}
                  className="bg-cardBg border border-borderDark rounded-2xl p-4 hover:border-gray-600 transition flex flex-col gap-2"
                >
                  <FileText className="w-8 h-8 text-gray-500" />
                  <p className="text-white text-sm font-medium truncate flex-1">{doc.filename}</p>
                  <p className="text-textMuted text-xs">{fmt(doc.upload_date)}</p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <FileText className="w-12 h-12 text-gray-700 mx-auto mb-4" />
              <p className="text-gray-500 text-sm">No documents here yet.</p>
              <Link to="/upload" className="mt-4 inline-block text-accentBlue text-sm hover:underline">
                Upload your first document →
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
