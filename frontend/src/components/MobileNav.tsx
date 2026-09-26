import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Library, Mic, Plus, AudioLines } from 'lucide-react';
import BionicReadingToggle from './BionicReadingToggle';
import { ReaderSettingsTrigger } from './ReaderSettingsMenu';

const navItems = [
  { name: 'Home', icon: Home, path: '/' },
  { name: 'Upload', icon: Plus, path: '/upload' },
  { name: 'Library', icon: Library, path: '/library' },
  { name: 'Studio', icon: Mic, path: '/voice-clone' },
  { name: 'Voices', icon: AudioLines, path: '/voice-library' },
];

export default function MobileNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const isHome = location.pathname === '/';

  return (
    <div className="lg:hidden shrink-0">
      <Link
        to="/"
        onClick={(e) => {
          if (isHome) {
            e.preventDefault();
            navigate('/', { replace: true });
          }
        }}
        className="flex items-center justify-between gap-2 px-4 py-3 border-b border-borderDark bg-sidebar hover:opacity-90 transition"
      >
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white">
            <path d="M4 12C4 12 5.5 15 8 15C10.5 15 12 10 12 10C12 10 13.5 7 16 7C18.5 7 20 12 20 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="text-base font-bold text-white tracking-wide">Hawking</span>
        </div>
        <div className="flex items-center gap-1">
          <BionicReadingToggle />
          <ReaderSettingsTrigger className="text-gray-300 hover:text-white hover:bg-white/10" />
        </div>
      </Link>

      <nav className="flex items-center justify-around border-b border-borderDark bg-sidebar px-2 py-2">
        {navItems.map((item) => {
          const isActive =
            item.path === '/'
              ? location.pathname === '/'
              : location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-none text-xs transition ${
                isActive ? 'text-white' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

