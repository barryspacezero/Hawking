import { useState } from 'react';
import { X, Folder, Loader2 } from 'lucide-react';
import type { FolderItem } from '../types/library';

interface MoveToFolderModalProps {
  isOpen: boolean;
  folders: FolderItem[];
  selectedCount: number;
  onClose: () => void;
  onMove: (folderId: number | null) => Promise<void>;
}

export default function MoveToFolderModal({
  isOpen,
  folders,
  selectedCount,
  onClose,
  onMove,
}: MoveToFolderModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleMove = async (folderId: number | null) => {
    setLoading(true);
    setError('');
    try {
      await onMove(folderId);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-cardBg rounded-none w-full max-w-sm border border-white/10  overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <h2 className="text-lg font-semibold text-white">Move {selectedCount} file(s)</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-none hover:bg-white/5">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 max-h-72 overflow-y-auto space-y-1">
          {error && (
            <div className="mb-3 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-none">
              {error}
            </div>
          )}

          <button
            disabled={loading}
            onClick={() => handleMove(null)}
            className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-none hover:bg-white/5 text-gray-200 transition text-left"
          >
            <Folder className="w-4 h-4 text-gray-400" />
            <span className="text-sm">Library Root</span>
          </button>

          {folders.map((folder) => (
            <button
              key={folder.id}
              disabled={loading}
              onClick={() => handleMove(folder.id)}
              className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-none hover:bg-white/5 text-gray-200 transition text-left"
            >
              <Folder className="w-4 h-4 text-brand" />
              <span className="text-sm truncate">{folder.name}</span>
            </button>
          ))}

          {folders.length === 0 && (
            <p className="text-xs text-gray-500 px-3 py-2">No folders yet. Create one from the library.</p>
          )}
        </div>

        {loading && (
          <div className="p-4 border-t border-white/5 flex items-center justify-center text-gray-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Moving...
          </div>
        )}
      </div>
    </div>
  );
}

