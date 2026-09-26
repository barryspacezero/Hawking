import { useRef, useEffect, useState, useCallback, memo } from 'react';
import { Play, Pause, RotateCcw, RotateCw, Globe, Download } from 'lucide-react';
import { downloadFromUrl } from '../utils/wavUtils';
import { useReader } from '../context/ReaderContext';
import { API_URL } from '../config/api';

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
  onVoiceClick: () => void;
}

function blocksPlaybackEqual(a: DocumentBlock[], b: DocumentBlock[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((block, index) => {
    const other = b[index];
    return (
      block.id === other.id &&
      block.audio_status === other.audio_status &&
      block.audio_path === other.audio_path &&
      block.audio_voice === other.audio_voice
    );
  });
}

function AudioPlayer({ documentId, blocks, onVoiceClick }: AudioPlayerProps) {
  const { isPlaying, setIsPlaying, activeBlockId, setActiveBlockId, playbackSpeed, setPlaybackSpeed, setCurrentTime } = useReader();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playableBlocksRef = useRef<DocumentBlock[]>([]);
  const activeBlockIdRef = useRef<number | null>(activeBlockId);
  const handleNextBlockRef = useRef<() => void>(() => {});

  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const playableBlocks = blocks.filter((b) => b.audio_status === 'done');
  playableBlocksRef.current = playableBlocks;
  activeBlockIdRef.current = activeBlockId;

  const currentIndex = playableBlocks.findIndex((b) => b.id === activeBlockId);

  const handleNextBlock = useCallback(() => {
    const doneBlocks = playableBlocksRef.current;
    const currentId = activeBlockIdRef.current;
    const idx = doneBlocks.findIndex((b) => b.id === currentId);

    if (idx >= 0 && idx < doneBlocks.length - 1) {
      setActiveBlockId(doneBlocks[idx + 1].id);
    } else {
      setIsPlaying(false);
      setActiveBlockId(null);
    }
  }, [setActiveBlockId, setIsPlaying]);

  handleNextBlockRef.current = handleNextBlock;

  useEffect(() => {
    if (!activeBlockId && playableBlocks.length > 0 && isPlaying) {
      setActiveBlockId(playableBlocks[0].id);
    }
  }, [isPlaying, activeBlockId, playableBlocks, setActiveBlockId]);

  useEffect(() => {
    setProgress(0);
    setDuration(0);
    setCurrentTime(0);
  }, [activeBlockId, setCurrentTime]);

  // Create the audio element once; listeners must not be re-bound on every timeupdate.
  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    const onTimeUpdate = () => {
      setProgress(audio.currentTime);
      setCurrentTime(audio.currentTime);
    };
    const onLoadedMetadata = () => {
      setDuration(audio.duration);
    };
    const onEnded = () => {
      handleNextBlockRef.current();
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
      audio.pause();
      audio.src = '';
      audioRef.current = null;
    };
  }, [setCurrentTime]);

  const activeBlock = playableBlocks.find((b) => b.id === activeBlockId);
  const voiceCacheKey = activeBlock?.audio_voice ?? activeBlock?.audio_path ?? '';

  // Load a new source only when the active block (or its voice/file revision) changes.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !activeBlockId) return;

    const audioUrl = `${API_URL}/documents/${documentId}/blocks/${activeBlockId}/audio?v=${encodeURIComponent(voiceCacheKey)}`;
    const currentSrc = audio.src ? audio.src.split('?')[0] : '';
    const newSrc = audioUrl.split('?')[0];

    if (currentSrc !== newSrc) {
      audio.src = audioUrl;
      audio.load();
    }
  }, [activeBlockId, documentId, voiceCacheKey]);

  // Play/pause is isolated so highlight timeupdates do not re-trigger source loading.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !activeBlockId) return;

    audio.playbackRate = playbackSpeed;

    if (isPlaying) {
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          if (error?.name !== 'AbortError') {
            console.error('Autoplay prevented:', error);
            setIsPlaying(false);
          }
        });
      }
    } else {
      audio.pause();
    }
  }, [activeBlockId, isPlaying, playbackSpeed, setIsPlaying]);

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
      const doneBlocks = playableBlocksRef.current;
      const currentId = activeBlockIdRef.current;
      const idx = doneBlocks.findIndex((b) => b.id === currentId);
      if (idx > 0) {
        setActiveBlockId(doneBlocks[idx - 1].id);
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
    const block = playableBlocks.find((b) => b.id === activeBlockId);
    if (!block?.audio_path) return;

    const cacheBuster = block.audio_voice || '';
    const audioUrl = `${API_URL}/documents/${documentId}/blocks/${activeBlockId}/audio?v=${cacheBuster}`;
    const ext = block.audio_path.endsWith('.mp3') ? 'mp3' : 'wav';
    const blockNum = currentIndex >= 0 ? currentIndex + 1 : activeBlockId;

    try {
      await downloadFromUrl(audioUrl, `block-${blockNum}.${ext}`);
    } catch (e) {
      console.error('Download failed:', e);
    }
  };

  if (playableBlocks.length === 0) return null;

  const currentPercent = currentIndex >= 0 ? Math.round((currentIndex / playableBlocks.length) * 100) : 0;

  const remainingSeconds = Math.max(0, Math.floor(duration - progress));
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `-${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className="fixed bottom-0 left-0 lg:right-0 lg:left-64 border-t z-30 transition-all duration-300 transform translate-y-0 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]"
      style={{ backgroundColor: 'var(--player-bg)', borderColor: 'var(--player-border)', backdropFilter: 'blur(10px)' }}
    >
      <div className="absolute top-0 left-0 h-1 bg-brand/20 w-full overflow-hidden">
        <div
          className="h-full bg-brand transition-all duration-500 ease-out"
          style={{ width: `${currentPercent}%` }}
        />
      </div>

      <div className="max-w-3xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wider opacity-60 mb-3" style={{ color: 'var(--reader-text)' }}>
          <span>{currentPercent}% Read</span>
          <span>Block {currentIndex >= 0 ? currentIndex + 1 : 0} of {playableBlocks.length}</span>
          <span>{duration > 0 ? formatTime(remainingSeconds) : '--:--'}</span>
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={onVoiceClick}
            className="flex items-center justify-center w-12 h-12 rounded-full hover:bg-black/5 transition"
            style={{ color: 'var(--reader-text)' }}
          >
            <Globe className="w-6 h-6 opacity-70" />
          </button>

          <div className="flex items-center justify-center space-x-6">
            <button
              onClick={skipBackward}
              className="p-2 hover:bg-black/5 rounded-full transition opacity-80 hover:opacity-100"
              style={{ color: 'var(--reader-text)' }}
              title="Skip back 10 seconds"
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
              title="Skip forward 10 seconds"
            >
              <RotateCw className="w-6 h-6" />
            </button>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={handleDownload}
              className="flex items-center justify-center w-12 h-12 rounded-full hover:bg-black/5 transition"
              style={{ color: 'var(--reader-text)' }}
              title="Download current block audio"
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

export default memo(AudioPlayer, (prev, next) => {
  return prev.documentId === next.documentId && blocksPlaybackEqual(prev.blocks, next.blocks);
});
