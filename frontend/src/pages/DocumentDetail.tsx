import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useReader } from '../context/ReaderContext';
import TextViewReader from '../components/TextViewReader';
import AudioPlayer from '../components/AudioPlayer';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface DocumentBlock {
  id: number;
  block_index: number;
  page_number: number | null;
  text: string;
  audio_status: string;
  audio_path: string | null;
  audio_voice: string | null;
  audio_duration: number | null;
  word_timestamps: string | null;
}

interface DocumentDetail {
  id: number;
  filename: string;
  file_type: string;
  folder_id: number | null;
  source_path: string | null;
  page_count: number | null;
  upload_date: string;
  blocks: DocumentBlock[];
}

const VOICE_OPTIONS = [
  { value: 'kokoro_female_1', label: 'Kokoro — Heart (Female)' },
  { value: 'kokoro_female_2', label: 'Kokoro — Bella (Female)' },
  { value: 'kokoro_male_1',   label: 'Kokoro — Michael (Male)' },
  { value: 'kokoro_male_2',   label: 'Kokoro — Adam (Male)' },
  { value: 'gtts',            label: 'Google TTS (requires internet)' },
];

export default function DocumentDetail() {
  const { id } = useParams<{ id: string }>();
  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [voiceTier, setVoiceTier] = useState('kokoro_female_1');
  const pollIntervalRef = useRef<number | null>(null);

  const { activeBlockId, setActiveBlockId, setIsPlaying } = useReader();

  const fetchDoc = async () => {
    try {
      const res = await fetch(`${API_URL}/documents/${id}`);
      if (!res.ok) throw new Error('Failed to fetch document');
      const data: DocumentDetail = await res.json();
      setDoc(data);
      const stillGenerating = data.blocks.some(
        (b) => b.audio_status === 'generating' || b.audio_status === 'pending',
      );
      setIsGenerating(stillGenerating);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    setError('');
    fetchDoc();
  }, [id]);

  // Poll every 3s while audio is generating
  useEffect(() => {
    if (isGenerating) {
      pollIntervalRef.current = window.setInterval(fetchDoc, 3000);
    } else if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [isGenerating]);

  // Scroll active block into view
  useEffect(() => {
    if (!activeBlockId) return;
    const el = document.getElementById(`block-${activeBlockId}`);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  }, [activeBlockId]);

  // Stop playback when leaving
  useEffect(() => {
    return () => {
      setIsPlaying(false);
      setActiveBlockId(null);
    };
  }, [setIsPlaying, setActiveBlockId]);

  const handleGenerateAudio = async (tier: string = voiceTier) => {
    try {
      setIsPlaying(false);
      setActiveBlockId(null);
      const res = await fetch(`${API_URL}/documents/${id}/generate-audio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voice_tier: tier }),
      });
      if (!res.ok) throw new Error('Failed to start audio generation');
      setIsGenerating(true);
      fetchDoc();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleBlockClick = (blockId: number, isPlayable: boolean) => {
    if (!isPlayable) return;
    setActiveBlockId(blockId);
    setIsPlaying(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-brand" />
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="text-red-400 text-center py-10 px-4">
        {error || 'Document not found'}
      </div>
    );
  }

  const totalBlocks = doc.blocks.length;
  const doneBlocks = doc.blocks.filter((b) => b.audio_status === 'done').length;
  const allDone = doneBlocks === totalBlocks && totalBlocks > 0;
  const hasPlayableBlocks = doneBlocks > 0;
  const libraryBackPath = doc.folder_id ? `/library/folder/${doc.folder_id}` : '/library';

  return (
    <div className="min-h-screen pb-40 flex flex-col" style={{ color: 'var(--reader-text)' }}>
      {/* Top bar */}
      <div
        className="sticky top-0 z-30 px-4 py-3 flex items-center justify-between border-b shadow-sm backdrop-blur-md gap-3"
        style={{ backgroundColor: 'var(--player-bg)', borderColor: 'var(--player-border)' }}
      >
        <Link
          to={libraryBackPath}
          className="flex items-center space-x-1 p-2 rounded-full hover:bg-black/5 transition shrink-0"
          style={{ color: 'var(--reader-text)' }}
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium pr-1 hidden sm:inline">Library</span>
        </Link>

        <h1
          className="text-sm font-bold truncate flex-1 text-center"
          style={{ color: 'var(--reader-text)' }}
        >
          {doc.filename}
        </h1>

        <div className="w-20 shrink-0" /> {/* spacer */}
      </div>

      {/* Voice generation panel */}
      {!allDone && (
        <div className="max-w-2xl mx-auto mt-4 px-4 w-full">
          <div
            className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-xl border gap-4"
            style={{ backgroundColor: 'var(--player-bg)', borderColor: 'var(--player-border)' }}
          >
            <div>
              <p className="text-sm font-semibold opacity-80">Voice Generation</p>
              <p className="text-xs opacity-50 mt-0.5">
                Generate audio to unlock read-along playback.
              </p>
            </div>
            <div className="flex items-center space-x-3 w-full sm:w-auto">
              <select
                value={voiceTier}
                onChange={(e) => setVoiceTier(e.target.value)}
                disabled={isGenerating || totalBlocks === 0}
                className="flex-1 sm:flex-none border rounded-md text-sm px-3 py-2 bg-transparent focus:outline-none focus:ring-2 focus:ring-brand disabled:opacity-50"
                style={{ borderColor: 'var(--player-border)', color: 'var(--reader-text)' }}
              >
                {VOICE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} style={{ color: 'black' }}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <button
                onClick={() => handleGenerateAudio(voiceTier)}
                disabled={isGenerating || totalBlocks === 0}
                className={`flex items-center justify-center space-x-2 px-4 py-2 rounded-md font-medium text-white transition whitespace-nowrap ${
                  isGenerating || totalBlocks === 0
                    ? 'bg-brand/60 cursor-not-allowed'
                    : 'bg-brand hover:bg-brand-hover'
                }`}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>
                      ({doneBlocks}/{totalBlocks})
                    </span>
                  </>
                ) : (
                  <span>Generate</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reader */}
      <div className="flex-1 min-h-0">
        <TextViewReader blocks={doc.blocks} onBlockClick={handleBlockClick} />
      </div>

      {/* Audio Player */}
      {hasPlayableBlocks && (
        <AudioPlayer documentId={id!} blocks={doc.blocks} />
      )}
    </div>
  );
}
