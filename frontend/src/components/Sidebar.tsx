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
        const flds = await fetchFolders();`n        setFolders(flds);
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
    { name: 'Voice Studio', icon: Mic, path: '/voice-clone' },
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
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-brand-light">
          <path d="M4 12C4 12 5.5 15 8 15C10.5 15 12 10 12 10C12 10 13.5 7 16 7C18.5 7 20 12 20 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span className="text-xl font-extrabold      tracking-wide">Hawking</span>
      </Link>

      <div className="px-4 mb-4">
        <Link to="/upload" className="w-full flex items-center justify-center space-x-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-none py-2 border border-white/10 transition">
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
              className={`flex items-center space-x-3 px-3 py-2.5 rounded-none mb-0.5 transition ${
                isActive ? 'bg-brand/15 text-brand-light font-semibold border-l-2 border-brand-light' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
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
                className={`flex items-center space-x-3 px-3 py-2 rounded-none transition ${
                  location.pathname === `/library/folder/${folder.id}`
                    ? 'bg-brand/10 text-brand'
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

      <div className="flex-1"></div>
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
            <div className="w-9 h-9 rounded-none    flex items-center justify-center text-white font-bold ">
              {userInitial}
            </div>
            <div className="max-w-[120px]">
              <div className="text-sm font-medium text-gray-200 truncate" title={user?.email || ''}>{userName}</div>
              <div className="text-xs text-brand font-medium">Premium</div>
            </div>
          </div>
          <button
            onClick={signOut}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-none transition opacity-0 group-hover:opacity-100"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}





