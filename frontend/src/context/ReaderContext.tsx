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
  pdfScale: number;
  bionicReading: boolean;
  settingsMenuOpen: boolean;
  activeBlockId: number | null;
  isPlaying: boolean;
  currentTime: number;
  /** PDF page currently shown in Original viewer (1-based); shared with read-along. */
  viewerPage: number | null;
  
  setTheme: (theme: Theme) => void;
  setFontSize: (size: number) => void;
  setFontFamily: (font: string) => void;
  setPlaybackSpeed: (speed: number) => void;
  setLayout: (layout: Layout) => void;
  setReaderViewMode: (mode: ReaderViewMode) => void;
  setPdfScale: (scale: number) => void;
  setBionicReading: (enabled: boolean) => void;
  setSettingsMenuOpen: (open: boolean) => void;
  setActiveBlockId: (id: number | null) => void;
  setIsPlaying: (playing: boolean) => void;
  setCurrentTime: (time: number) => void;
  setViewerPage: (page: number | null) => void;
}

const defaultState: ReaderState = {
  theme: 'dark',
  fontSize: 18,
  fontFamily: 'Inter, sans-serif',
  playbackSpeed: 1.0,
  layout: 'continuous',
  readerViewMode: 'text',
  pdfScale: 1.0,
  bionicReading: false,
  settingsMenuOpen: false,
  activeBlockId: null,
  isPlaying: false,
  currentTime: 0,
  viewerPage: null,
  setTheme: () => {},
  setFontSize: () => {},
  setFontFamily: () => {},
  setPlaybackSpeed: () => {},
  setLayout: () => {},
  setReaderViewMode: () => {},
  setPdfScale: () => {},
  setBionicReading: () => {},
  setSettingsMenuOpen: () => {},
  setActiveBlockId: () => {},
  setIsPlaying: () => {},
  setCurrentTime: () => {},
  setViewerPage: () => {},
};

const ReaderContext = createContext<ReaderState>(defaultState);

export const useReader = () => useContext(ReaderContext);

interface ProviderProps {
  children: ReactNode;
}

export const ReaderProvider: FC<ProviderProps> = ({ children }) => {
  // Initialize from localStorage or defaults
  const [theme, setThemeState] = useState<Theme>(() => 
    (localStorage.getItem('reader_theme') as Theme) || 'dark'
  );
  const [fontSize, setFontSizeState] = useState<number>(() => 
    parseInt(localStorage.getItem('reader_fontSize') || '18', 10)
  );
  const [fontFamily, setFontFamilyState] = useState<string>(() => 
    localStorage.getItem('reader_fontFamily') || 'Inter, sans-serif'
  );
  const [playbackSpeed, setPlaybackSpeedState] = useState<number>(() => 
    parseFloat(localStorage.getItem('reader_playbackSpeed') || '1.0')
  );
  const [layout, setLayoutState] = useState<Layout>(() => 
    (localStorage.getItem('reader_layout') as Layout) || 'continuous'
  );
  const [readerViewMode, setReaderViewModeState] = useState<ReaderViewMode>(() => {
    const saved = localStorage.getItem('reader_viewMode');
    return saved === 'text' || saved === 'original' ? saved : 'text';
  });
  const [pdfScale, setPdfScaleState] = useState<number>(() =>
    parseFloat(localStorage.getItem('reader_pdfScale') || '1.0')
  );
  const [bionicReading, setBionicReadingState] = useState<boolean>(() =>
    localStorage.getItem('reader_bionicReading') === 'true'
  );
  const [settingsMenuOpen, setSettingsMenuOpen] = useState<boolean>(false);
  
  // Transient state
  const [activeBlockId, setActiveBlockId] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [viewerPage, setViewerPage] = useState<number | null>(null);

  // Persistence effects
  useEffect(() => { localStorage.setItem('reader_theme', theme); }, [theme]);
  useEffect(() => { localStorage.setItem('reader_fontSize', fontSize.toString()); }, [fontSize]);
  useEffect(() => { localStorage.setItem('reader_fontFamily', fontFamily); }, [fontFamily]);
  useEffect(() => { localStorage.setItem('reader_playbackSpeed', playbackSpeed.toString()); }, [playbackSpeed]);
  useEffect(() => { localStorage.setItem('reader_layout', layout); }, [layout]);
  useEffect(() => { localStorage.setItem('reader_viewMode', readerViewMode); }, [readerViewMode]);
  useEffect(() => { localStorage.setItem('reader_pdfScale', pdfScale.toString()); }, [pdfScale]);
  useEffect(() => { localStorage.setItem('reader_bionicReading', bionicReading ? 'true' : 'false'); }, [bionicReading]);

  // Apply theme to document body
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
    pdfScale,
    bionicReading,
    settingsMenuOpen,
    activeBlockId,
    isPlaying,
    currentTime,
    viewerPage,
    
    setTheme: setThemeState,
    setFontSize: setFontSizeState,
    setFontFamily: setFontFamilyState,
    setPlaybackSpeed: setPlaybackSpeedState,
    setLayout: setLayoutState,
    setReaderViewMode: setReaderViewModeState,
    setPdfScale: setPdfScaleState,
    setBionicReading: setBionicReadingState,
    setSettingsMenuOpen,
    setActiveBlockId,
    setIsPlaying,
    setCurrentTime,
    setViewerPage,
  };

  return (
    <ReaderContext.Provider value={value}>
      {children}
    </ReaderContext.Provider>
  );
};

