import { useRef, useEffect, useState, useCallback } from 'react';
import { Play, Pause, RotateCcw, RotateCw, Download } from 'lucide-react';
import { downloadFromUrl } from '../utils/wavUtils';
import { useReader } from '../context/ReaderContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface DocumentBlock {
  id: number;
  block_index: number;
  audio_status: string;
  audio_path: string | null;
  audio_duration: number | null;
  audio_voice: string | null;
}

interface AudioPlayerProps {
  documentId: string;
  blocks: DocumentBlock[];
  onVoiceClick?: () => void;
}

export default function AudioPlayer({ documentId, blocks, onVoiceClick }: AudioPlayerProps) {
  const {
    isPlaying,
    setIsPlaying,
    activeBlockId,
    setActiveBlockId,
    playbackSpeed,
    setPlaybackSpeed,
    setCurrentTime,
  } = useReader();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playableBlocksRef = useRef<DocumentBlock[]>([]);
  const activeBlockIdRef = useRef<number | null>(activeBlockId);

  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const playableBlocks = blocks.filter((b) => b.audio_status === 'done');
  playableBlocksRef.current = playableBlocks;
  activeBlockIdRef.current = activeBlockId;

  const currentIndex = playableBlocks.findIndex((b) => b.id === activeBlockId);

  const handleNextBlock = useCallback(() => {
    const pBlocks = playableBlocksRef.current;
    const currentId = activeBlockIdRef.current;
    const idx = pBlocks.findIndex((b) => b.id === currentId);

    if (idx >= 0 && idx < pBlocks.length - 1) {
      setActiveBlockId(pBlocks[idx + 1].id);
    } else {
      setIsPlaying(false);
      setActiveBlockId(null);
    }
  }, [setActiveBlockId, setIsPlaying]);

  // Auto-start first block when play is pressed with no active block
  useEffect(() => {
    if (!activeBlockId && playableBlocks.length > 0 && isPlaying) {
      setActiveBlockId(playableBlocks[0].id);
    }
  }, [isPlaying, activeBlockId, playableBlocks, setActiveBlockId]);

  // Reset progress when switching blocks
  useEffect(() => {
    setProgress(0);
    setDuration(0);
    setCurrentTime(0);
  }, [activeBlockId, setCurrentTime]);

  // Load + play/pause audio when block or play state changes
  useEffect(() => {
    if (!activeBlockId) return;

    const activeBlock = playableBlocks.find((b) => b.id === activeBlockId);
    const cacheBuster = activeBlock?.audio_voice || Date.now();
    const audioUrl = `${API_URL}/documents/${documentId}/blocks/${activeBlockId}/audio?v=${cacheBuster}`;

    let audio = audioRef.current;

    if (!audio) {
      audio = new Audio();
      audioRef.current = audio;

      audio.addEventListener('timeupdate', () => {
        setProgress(audio!.currentTime);
        setCurrentTime(audio!.currentTime);
      });

      audio.addEventListener('loadedmetadata', () => {
        setDuration(audio!.duration);
      });

      audio.addEventListener('ended', () => {
        handleNextBlock();
      });
    }

    const currentSrc = audio.src ? audio.src.split('?')[0] : '';
    const newSrc = audioUrl.split('?')[0];

    if (currentSrc !== newSrc) {
      audio.src = audioUrl;
      audio.load();
    }

    audio.playbackRate = playbackSpeed;

    if (isPlaying) {
      audio.play().catch((e) => {
        console.error('Autoplay prevented:', e);
        setIsPlaying(false);
      });
    } else {
      audio.pause();
    }
  }, [activeBlockId, isPlaying, documentId, playableBlocks, playbackSpeed, handleNextBlock, setCurrentTime, setIsPlaying]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, []);

  // Sync playback speed changes mid-playback
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  const togglePlay = () => {
    if (playableBlocks.length === 0) return;
    setIsPlaying(!isPlaying);
  };

  const skipForward = () => {
    if (!audioRef.current) return;
    const remaining = audioRef.current.duration - audioRef.current.currentTime;
    if (remaining <= 10) {
      handleNextBlock();
    } else {
      audioRef.current.currentTime += 10;
    }
  };

  const skipBackward = () => {
    if (!audioRef.current) return;
    if (audioRef.current.currentTime <= 10) {
      const pBlocks = playableBlocksRef.current;
      const currentId = activeBlockIdRef.current;
      const idx = pBlocks.findIndex((b) => b.id === currentId);
      if (idx > 0) {
        setActiveBlockId(pBlocks[idx - 1].id);
      } else {
        audioRef.current.currentTime = 0;
      }
    } else {
      audioRef.current.currentTime -= 10;
    }
  };

  const cycleSpeed = () => {
    const speeds = [1.0, 1.25, 1.5, 1.75, 2.0];
    const nextSpeed = speeds[(speeds.indexOf(playbackSpeed) + 1) % speeds.length];
    setPlaybackSpeed(nextSpeed);
  };

  const handleDownload = async () => {
    if (!activeBlockId) return;
    const activeBlock = playableBlocks.find((b) => b.id === activeBlockId);
    if (!activeBlock?.audio_path) return;

    const cacheBuster = activeBlock.audio_voice || '';
    const audioUrl = `${API_URL}/documents/${documentId}/blocks/${activeBlockId}/audio?v=${cacheBuster}`;
    const ext = activeBlock.audio_path.endsWith('.mp3') ? 'mp3' : 'wav';
    const blockNum = currentIndex >= 0 ? currentIndex + 1 : activeBlockId;

    try {
      await downloadFromUrl(audioUrl, `block-${blockNum}.${ext}`);
    } catch (e) {
      console.error('Download failed:', e);
    }
  };

  if (playableBlocks.length === 0) return null;

  const currentPercent =
    currentIndex >= 0 ? Math.round((currentIndex / playableBlocks.length) * 100) : 0;
  const remainingSeconds = Math.max(0, Math.floor(duration - progress));
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `-${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className="fixed bottom-0 left-0 lg:left-64 right-0 border-t z-30 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]"
      style={{
        backgroundColor: 'var(--player-bg)',
        borderColor: 'var(--player-border)',
        backdropFilter: 'blur(10px)',
      }}
    >
      {/* Reading progress bar */}
      <div className="absolute top-0 left-0 h-1 bg-brand/20 w-full overflow-hidden">
        <div
          className="h-full bg-brand transition-all duration-500 ease-out"
          style={{ width: `${currentPercent}%` }}
        />
      </div>

      <div className="max-w-3xl mx-auto px-6 py-4">
        {/* Progress info */}
        <div
          className="flex items-center justify-between text-xs font-medium uppercase tracking-wider opacity-60 mb-3"
          style={{ color: 'var(--reader-text)' }}
        >
          <span>{currentPercent}% Read</span>
          <span>Block {currentIndex >= 0 ? currentIndex + 1 : 0} of {playableBlocks.length}</span>
          <span>{duration > 0 ? formatTime(remainingSeconds) : '--:--'}</span>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          {/* Voice / left slot */}
          <button
            onClick={onVoiceClick}
            className="flex items-center justify-center w-12 h-12 rounded-full hover:bg-black/5 transition text-sm font-semibold opacity-70 hover:opacity-100"
            style={{ color: 'var(--reader-text)' }}
            title="Switch voice"
          >
            🎙️
          </button>

          {/* Playback controls */}
          <div className="flex items-center justify-center space-x-6">
            <button
              onClick={skipBackward}
              className="p-2 hover:bg-black/5 rounded-full transition opacity-80 hover:opacity-100"
              style={{ color: 'var(--reader-text)' }}
              title="Skip back 10s"
            >
              <RotateCcw className="w-6 h-6" />
            </button>

            <button
              onClick={togglePlay}
              className="flex items-center justify-center w-16 h-16 rounded-full bg-brand text-white hover:bg-brand-hover hover:scale-105 transition-all shadow-lg"
            >
              {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
            </button>

            <button
              onClick={skipForward}
              className="p-2 hover:bg-black/5 rounded-full transition opacity-80 hover:opacity-100"
              style={{ color: 'var(--reader-text)' }}
              title="Skip forward 10s"
            >
              <RotateCw className="w-6 h-6" />
            </button>
          </div>

          {/* Speed + Download */}
          <div className="flex items-center space-x-1">
            <button
              onClick={handleDownload}
              className="flex items-center justify-center w-12 h-12 rounded-full hover:bg-black/5 transition"
              style={{ color: 'var(--reader-text)' }}
              title="Download current block"
            >
              <Download className="w-5 h-5 opacity-70" />
            </button>
            <button
              onClick={cycleSpeed}
              className="flex items-center justify-center w-12 h-12 rounded-full hover:bg-black/5 transition text-sm font-bold"
              style={{ color: 'var(--reader-text)' }}
            >
              {playbackSpeed}x
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
