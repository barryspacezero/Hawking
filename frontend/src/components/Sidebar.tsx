import { useState, useEffect, useMemo } from 'react';
import { Plus, Library, FileText, Folder, Home } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { fetchDocuments, fetchFolders } from '../api/library';
import type { DocumentItem, FolderItem } from '../types/library';

export default function Sidebar() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [search, setSearch] = useState('');
  const location = useLocation();

  useEffect(() => {
    Promise.all([fetchDocuments(), fetchFolders()])
      .then(([docs, flds]) => { setDocuments(docs); setFolders(flds); })
      .catch(console.error);
  }, [location.pathname]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? documents.filter(d => d.filename.toLowerCase().includes(q)) : documents;
  }, [documents, search]);

  const navLinks = [
    { label: 'Home',    Icon: Home,    to: '/' },
    { label: 'Library', Icon: Library, to: '/library' },
    { label: 'Upload',  Icon: Plus,    to: '/upload' },
  ];

  const isActive = (to: string) =>
    to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);

  return (
    <aside className="hidden lg:flex w-64 bg-sidebar h-screen border-r border-borderDark flex-col text-gray-200 shrink-0">
      {/* Logo */}
      <Link to="/" className="p-5 flex items-center gap-2 hover:opacity-90 transition">
        <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-white">
          <path
            d="M4 12c0 0 1.5 3 4 3s4-5 4-5 1.5-3 4-3 4 5 4 5"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          />
        </svg>
        <span className="text-xl font-bold text-white tracking-wide">Hawking</span>
      </Link>

      {/* Nav */}
      <nav className="px-2 mb-4">
        {navLinks.map(({ label, Icon, to }) => (
          <Link
            key={to}
            to={to}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 transition text-sm ${
              isActive(to)
                ? 'bg-white/10 text-white font-medium'
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
            }`}
          >
            <Icon className="w-5 h-5" />
            {label}
          </Link>
        ))}
      </nav>

      {/* Folders */}
      {folders.length > 0 && (
        <div className="px-2 mb-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 px-3 mb-2">
            Folders
          </p>
          <div className="space-y-0.5 max-h-32 overflow-y-auto">
            {folders.map(f => (
              <Link
                key={f.id}
                to={`/library/folder/${f.id}`}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition text-sm ${
                  location.pathname === `/library/folder/${f.id}`
                    ? 'bg-white/10 text-white'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                }`}
              >
                <Folder className="w-4 h-4 text-accentBlue shrink-0" />
                <span className="truncate">{f.name}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="px-4 mb-3">
        <input
          type="search"
          placeholder="Search documents…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-black/30 border border-borderDark rounded-lg px-3 py-1.5 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-accentBlue transition"
        />
      </div>

      {/* Document list */}
      <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-0.5">
        {filtered.map(doc => (
          <Link
            key={doc.id}
            to={`/document/${doc.id}`}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition text-sm ${
              location.pathname === `/document/${doc.id}`
                ? 'bg-white/10 text-white'
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
            }`}
          >
            <FileText className="w-4 h-4 opacity-70 shrink-0" />
            <span className="truncate">{doc.filename}</span>
          </Link>
        ))}
        {filtered.length === 0 && (
          <p className="px-3 py-6 text-center text-xs text-gray-600">
            {search ? 'No results.' : 'No documents yet — upload one!'}
          </p>
        )}
      </div>
    </aside>
  );
}
