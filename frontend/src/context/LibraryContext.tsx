import { createContext, useContext, useState, useEffect, useCallback, type ReactNode, type FC } from 'react';
import type { LibraryViewMode } from '../types/library';

interface LibraryState {
  viewMode: LibraryViewMode;
  setViewMode: (mode: LibraryViewMode) => void;
  selectionMode: boolean;
  setSelectionMode: (on: boolean) => void;
  selectedIds: Set<number>;
  toggleSelection: (id: number) => void;
  selectAll: (ids: number[]) => void;
  clearSelection: () => void;
}

const LibraryContext = createContext<LibraryState | null>(null);

export function useLibrary() {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error('useLibrary must be used within LibraryProvider');
  return ctx;
}

export const LibraryProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [viewMode, setViewModeState] = useState<LibraryViewMode>(() => {
    const saved = localStorage.getItem('library_viewMode');
    return saved === 'list' || saved === 'grid' ? saved : 'grid';
  });
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    localStorage.setItem('library_viewMode', viewMode);
  }, [viewMode]);

  const setViewMode = (mode: LibraryViewMode) => setViewModeState(mode);

  const toggleSelection = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      if (next.size === 0) setSelectionMode(false);
      return next;
    });
  };

  const selectAll = (ids: number[]) => {
    setSelectedIds(new Set(ids));
    if (ids.length > 0) setSelectionMode(true);
  };

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setSelectionMode(false);
  }, []);

  return (
    <LibraryContext.Provider
      value={{
        viewMode,
        setViewMode,
        selectionMode,
        setSelectionMode,
        selectedIds,
        toggleSelection,
        selectAll,
        clearSelection,
      }}
    >
      {children}
    </LibraryContext.Provider>
  );
};

