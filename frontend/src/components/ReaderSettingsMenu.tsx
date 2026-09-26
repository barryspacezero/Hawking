import { Settings, X, Moon, Sun, Book, List, AlignLeft, Check, Type } from 'lucide-react';
import { useReader } from '../context/ReaderContext';
import { useBionicReading } from '../hooks/useBionicReading';

export function ReaderSettingsTrigger({ className = '' }: { className?: string }) {
  const { setSettingsMenuOpen } = useReader();

  return (
    <button
      type="button"
      onClick={() => setSettingsMenuOpen(true)}
      className={`p-2 transition rounded-none hover:bg-black/10 ${className}`}
      style={{ color: 'var(--reader-text, #e5e7eb)' }}
      aria-label="Open display settings"
    >
      <Settings className="w-5 h-5" />
    </button>
  );
}

export default function ReaderSettingsMenu() {
  const {
    settingsMenuOpen,
    setSettingsMenuOpen,
    theme,
    setTheme,
    fontSize,
    setFontSize,
    fontFamily,
    setFontFamily,
    layout,
    setLayout,
  } = useReader();
  const { enabled: bionicReading, toggle: toggleBionicReading } = useBionicReading();

  if (!settingsMenuOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setSettingsMenuOpen(false)} />
      <div
        className="fixed top-0 right-0 h-full w-80  z-50 overflow-y-auto"
        style={{ backgroundColor: 'var(--player-bg)', color: 'var(--reader-text)', borderLeft: '1px solid var(--player-border)' }}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold">Display Settings</h2>
            <button type="button" onClick={() => setSettingsMenuOpen(false)} className="p-1 rounded-none hover:bg-black/10">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-8">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider mb-3 opacity-70">Reading</h3>
              <button
                type="button"
                onClick={toggleBionicReading}
                className="w-full flex items-center justify-between p-3 rounded-none bg-black/5 hover:bg-black/10 transition"
              >
                <div className="flex items-center">
                  <Type className="w-4 h-4 mr-3 opacity-70" />
                  <div className="text-left">
                    <span className="block text-sm">Bionic Reading</span>
                    <span className="block text-xs opacity-60 mt-0.5">Bold the first part of each word</span>
                  </div>
                </div>
                {bionicReading && <Check className="w-4 h-4 text-brand shrink-0" />}
              </button>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider mb-3 opacity-70">Theme</h3>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  className={`flex flex-col items-center p-3 rounded-none border-2 transition ${theme === 'light' ? 'border-brand bg-brand/10' : 'border-transparent bg-black/5 hover:bg-black/10'}`}
                >
                  <Sun className="w-6 h-6 mb-2" />
                  <span className="text-sm font-medium">Light</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('sepia')}
                  className={`flex flex-col items-center p-3 rounded-none border-2 transition ${theme === 'sepia' ? 'border-brand bg-amber-50' : 'border-transparent bg-[#f4ecd8] text-[#5b4636] hover:bg-[#eadebe]'}`}
                >
                  <Book className="w-6 h-6 mb-2" />
                  <span className="text-sm font-medium">Sepia</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`flex flex-col items-center p-3 rounded-none border-2 transition ${theme === 'dark' ? 'border-brand bg-cardBg text-brand-light' : 'border-transparent bg-gray-900 text-gray-300 hover:bg-gray-800'}`}
                >
                  <Moon className="w-6 h-6 mb-2" />
                  <span className="text-sm font-medium">Dark</span>
                </button>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider mb-3 opacity-70">Typography</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Font Size</span>
                  <div className="flex items-center space-x-2 bg-black/5 rounded-none p-1">
                    <button type="button" onClick={() => setFontSize(Math.max(12, fontSize - 2))} className="px-3 py-1 hover:bg-black/10 rounded-none">A-</button>
                    <span className="w-8 text-center text-sm font-medium">{fontSize}</span>
                    <button type="button" onClick={() => setFontSize(Math.min(32, fontSize + 2))} className="px-3 py-1 hover:bg-black/10 rounded-none">A+</button>
                  </div>
                </div>

                <div className="flex flex-col space-y-2 mt-4">
                  <span className="text-sm">Font Family</span>
                  <select
                    value={fontFamily}
                    onChange={(e) => setFontFamily(e.target.value)}
                    className="w-full bg-black/5 border-none rounded-none p-2 text-sm focus:ring-2 focus:ring-brand"
                    style={{ color: 'var(--reader-text)' }}
                  >
                    <option value="Inter, sans-serif">Inter (Sans)</option>
                    <option value="Georgia, serif">Georgia (Serif)</option>
                    <option value="'Courier New', monospace">Courier (Mono)</option>
                    <option value="'OpenDyslexic', sans-serif">OpenDyslexic</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider mb-3 opacity-70">Layout</h3>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setLayout('continuous')}
                  className="w-full flex items-center justify-between p-3 rounded-none bg-black/5 hover:bg-black/10 transition"
                >
                  <div className="flex items-center">
                    <AlignLeft className="w-4 h-4 mr-3 opacity-70" />
                    <span>Continuous Scroll</span>
                  </div>
                  {layout === 'continuous' && <Check className="w-4 h-4 text-brand" />}
                </button>
                <button
                  type="button"
                  onClick={() => setLayout('single')}
                  className="w-full flex items-center justify-between p-3 rounded-none bg-black/5 hover:bg-black/10 transition"
                >
                  <div className="flex items-center">
                    <List className="w-4 h-4 mr-3 opacity-70" />
                    <span>Single Page (Paginated)</span>
                  </div>
                  {layout === 'single' && <Check className="w-4 h-4 text-brand" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

