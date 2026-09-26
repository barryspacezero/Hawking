import { createContext, useContext, useState, useEffect, type ReactNode, type FC } from 'react';

type Theme = 'light' | 'dark' | 'sepia';
type Layout = 'single' | 'continuous';
export type ReaderViewMode = 'original' | 'text';

interface ReaderState {
  theme: Theme;
  fontSize: number;
  fontFamily: string;
  playbackSpeed: number;
  layout: Layout;
  readerViewMode: ReaderViewMode;
  activeBlockId: number | null;
  isPlaying: boolean;
  currentTime: number;

  setTheme: (theme: Theme) => void;
  setFontSize: (size: number) => void;
  setFontFamily: (font: string) => void;
  setPlaybackSpeed: (speed: number) => void;
  setLayout: (layout: Layout) => void;
  setReaderViewMode: (mode: ReaderViewMode) => void;
  setActiveBlockId: (id: number | null) => void;
  setIsPlaying: (playing: boolean) => void;
  setCurrentTime: (time: number) => void;
}

const defaultState: ReaderState = {
  theme: 'dark',
  fontSize: 18,
  fontFamily: 'Inter, sans-serif',
  playbackSpeed: 1.0,
  layout: 'continuous',
  readerViewMode: 'text',
  activeBlockId: null,
  isPlaying: false,
  currentTime: 0,
  setTheme: () => {},
  setFontSize: () => {},
  setFontFamily: () => {},
  setPlaybackSpeed: () => {},
  setLayout: () => {},
  setReaderViewMode: () => {},
  setActiveBlockId: () => {},
  setIsPlaying: () => {},
  setCurrentTime: () => {},
};

const ReaderContext = createContext<ReaderState>(defaultState);

export const useReader = () => useContext(ReaderContext);

interface ProviderProps {
  children: ReactNode;
}

export const ReaderProvider: FC<ProviderProps> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(
    () => (localStorage.getItem('reader_theme') as Theme) || 'dark'
  );
  const [fontSize, setFontSizeState] = useState<number>(
    () => parseInt(localStorage.getItem('reader_fontSize') || '18', 10)
  );
  const [fontFamily, setFontFamilyState] = useState<string>(
    () => localStorage.getItem('reader_fontFamily') || 'Inter, sans-serif'
  );
  const [playbackSpeed, setPlaybackSpeedState] = useState<number>(
    () => parseFloat(localStorage.getItem('reader_playbackSpeed') || '1.0')
  );
  const [layout, setLayoutState] = useState<Layout>(
    () => (localStorage.getItem('reader_layout') as Layout) || 'continuous'
  );
  const [readerViewMode, setReaderViewModeState] = useState<ReaderViewMode>(() => {
    const saved = localStorage.getItem('reader_viewMode');
    return saved === 'text' || saved === 'original' ? saved : 'text';
  });

  // Transient playback state
  const [activeBlockId, setActiveBlockId] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);

  // Persist reader prefs
  useEffect(() => { localStorage.setItem('reader_theme', theme); }, [theme]);
  useEffect(() => { localStorage.setItem('reader_fontSize', fontSize.toString()); }, [fontSize]);
  useEffect(() => { localStorage.setItem('reader_fontFamily', fontFamily); }, [fontFamily]);
  useEffect(() => { localStorage.setItem('reader_playbackSpeed', playbackSpeed.toString()); }, [playbackSpeed]);
  useEffect(() => { localStorage.setItem('reader_layout', layout); }, [layout]);
  useEffect(() => { localStorage.setItem('reader_viewMode', readerViewMode); }, [readerViewMode]);

  // Apply theme class to body
  useEffect(() => {
    document.body.className = `theme-${theme}`;
  }, [theme]);

  const value = {
    theme,
    fontSize,
    fontFamily,
    playbackSpeed,
    layout,
    readerViewMode,
    activeBlockId,
    isPlaying,
    currentTime,

    setTheme: setThemeState,
    setFontSize: setFontSizeState,
    setFontFamily: setFontFamilyState,
    setPlaybackSpeed: setPlaybackSpeedState,
    setLayout: setLayoutState,
    setReaderViewMode: setReaderViewModeState,
    setActiveBlockId,
    setIsPlaying,
    setCurrentTime,
  };

  return (
    <ReaderContext.Provider value={value}>
      {children}
    </ReaderContext.Provider>
  );
};
