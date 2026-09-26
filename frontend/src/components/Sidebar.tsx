import { useState, useEffect, useMemo } from 'react';
import { Plus, Library, Search, FileText, Mic, Folder, Home, LogOut, AudioLines } from 'lucide-react';
import BionicReadingToggle from './BionicReadingToggle';
import { ReaderSettingsTrigger } from './ReaderSettingsMenu';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { fetchDocuments, fetchFolders } from '../api/library';
import type { DocumentItem, FolderItem } from '../types/library';
import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
  const [activeTab, setActiveTab] = useState<'Tasks' | 'Files'>('Files');
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  useEffect(() => {
    const load = async () => {
      try {
        const [docs, flds] = await Promise.all([fetchDocuments(), fetchFolders()]);
        setDocuments(docs);
        setFolders(flds);
      } catch (err) {
        console.error('Failed to fetch library data', err);
      }
    };
    load();
  }, [location.pathname]);

  const filteredDocuments = useMemo(() => {
    let docs = documents;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      docs = docs.filter((doc) => doc.filename.toLowerCase().includes(q));
    }
    if (activeTab === 'Tasks') {
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      docs = docs.filter((doc) => new Date(doc.upload_date).getTime() >= weekAgo);
    }
    return docs;
  }, [documents, searchQuery, activeTab]);

  const navItems = [
    { name: 'Home', icon: Home, path: '/' },
    { name: 'New Task', icon: Plus, path: '/upload' },
    { name: 'Library', icon: Library, path: '/library' },
    { name: 'Voice Clone', icon: Mic, path: '/voice-clone' },
    { name: 'Voice Library', icon: AudioLines, path: '/voice-library' },
  ];

  const isHome = location.pathname === '/';

  const userInitial = user?.email ? user.email.charAt(0).toUpperCase() : 'U';
  const userName = user?.email?.split('@')[0] || 'User';

  return (
    <div className="hidden lg:flex w-64 bg-sidebar h-screen border-r border-borderDark flex-col text-gray-200 shrink-0">
      <Link
        to="/"
        onClick={(e) => {
          if (isHome) {
            e.preventDefault();
            navigate('/', { replace: true });
          }
        }}
        className="p-5 flex items-center space-x-2 hover:opacity-90 transition"
      >
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white">
          <path d="M4 12C4 12 5.5 15 8 15C10.5 15 12 10 12 10C12 10 13.5 7 16 7C18.5 7 20 12 20 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span className="text-xl font-bold text-white tracking-wide">Hawking</span>
      </Link>

      <div className="px-4 mb-4">
        <Link to="/upload" className="w-full flex items-center justify-center space-x-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-full py-2 border border-white/10 transition">
          <Plus className="w-4 h-4" />
          <span className="text-sm font-medium">Add</span>
        </Link>
      </div>

      <nav className="px-2 mb-4">
        {navItems.map((item) => {
          const isActive =
            item.path === '/'
              ? location.pathname === '/'
              : location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg mb-0.5 transition ${
                isActive ? 'bg-white/10 text-white font-medium' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-sm">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {folders.length > 0 && (
        <div className="px-2 mb-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 px-3 mb-2">Folders</div>
          <div className="space-y-0.5 max-h-32 overflow-y-auto">
            {folders.map((folder) => (
              <Link
                key={folder.id}
                to={`/library/folder/${folder.id}`}
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition ${
                  location.pathname === `/library/folder/${folder.id}`
                    ? 'bg-white/10 text-white'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                }`}
              >
                <Folder className="w-4 h-4 text-brand shrink-0" />
                <span className="text-sm truncate">{folder.name}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="px-4 mb-4">
        <div className="flex bg-black/40 rounded-full p-1 border border-white/5">
          <button
            className={`flex-1 text-xs font-medium py-1.5 rounded-full transition ${activeTab === 'Tasks' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-gray-300'}`}
            onClick={() => setActiveTab('Tasks')}
          >
            Tasks
          </button>
          <button
            className={`flex-1 text-xs font-medium py-1.5 rounded-full transition ${activeTab === 'Files' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-gray-300'}`}
            onClick={() => setActiveTab('Files')}
          >
            Files
          </button>
        </div>
      </div>

      <div className="px-4 mb-4 relative">
        <Search className="w-4 h-4 absolute left-7 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          placeholder="Search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-transparent border-none text-sm text-gray-200 placeholder-gray-500 pl-9 py-2 focus:outline-none focus:ring-0"
        />
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4">
        <div className="space-y-0.5">
          {filteredDocuments.map((doc) => (
            <Link
              key={doc.id}
              to={`/document/${doc.id}`}
              className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition ${
                location.pathname === `/document/${doc.id}`
                  ? 'bg-white/10 text-white'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              }`}
            >
              <FileText className="w-4 h-4 opacity-70 shrink-0" />
              <span className="text-sm truncate">{doc.filename}</span>
            </Link>
          ))}
          {filteredDocuments.length === 0 && (
            <div className="px-3 py-4 text-center text-xs text-gray-500">
              {searchQuery.trim()
                ? 'No documents match your search.'
                : activeTab === 'Tasks'
                  ? 'No recent documents this week.'
                  : 'No documents yet.'}
            </div>
          )}
        </div>
      </div>

      <div className="p-4 border-t border-borderDark mt-auto space-y-3">
        <div className="flex items-center justify-between px-1 gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Reading</span>
          <div className="flex items-center gap-1">
            <BionicReadingToggle />
            <ReaderSettingsTrigger className="text-gray-400 hover:text-white hover:bg-white/10" />
          </div>
        </div>
        <div className="flex items-center justify-between group">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-500 to-orange-400 flex items-center justify-center text-white font-bold shadow-inner">
              {userInitial}
            </div>
            <div className="max-w-[120px]">
              <div className="text-sm font-medium text-gray-200 truncate" title={user?.email || ''}>{userName}</div>
              <div className="text-xs text-yellow-500 font-medium">Premium</div>
            </div>
          </div>
          <button
            onClick={signOut}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition opacity-0 group-hover:opacity-100"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
