import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, Clock } from 'lucide-react';
import { useReader } from '../context/ReaderContext';
import { ReaderSettingsTrigger } from '../components/ReaderSettingsMenu';
import ReaderViewToggle from '../components/ReaderViewToggle';
import AudioPlayer from '../components/AudioPlayer';
import VoiceSwitcherModal from '../components/VoiceSwitcherModal';
import OriginalDocumentViewer from '../components/OriginalDocumentViewer';
import TextViewReader from '../components/TextViewReader';
import { API_URL } from '../config/api';
import ErrorBoundary from '../components/ErrorBoundary';

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
  text_spans: string | null;
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

export default function DocumentDetail() {
  const { id } = useParams<{ id: string }>();
  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [documentAudioStatus, setDocumentAudioStatus] = useState<string>('not_started');
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [activeDocumentId, setActiveDocumentId] = useState<number | null>(null);
  const [voiceTier, setVoiceTier] = useState<string>('kokoro_female_1');
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const pollIntervalRef = useRef<number | null>(null);

  const {
    readerViewMode,
    setReaderViewMode,
    activeBlockId,
    setActiveBlockId,
    setIsPlaying,
  } = useReader();

  const fetchDoc = async () => {
    try {
      const res = await fetch(`${API_URL}/documents/${id}`);
      if (!res.ok) throw new Error('Failed to fetch document details');
      const data = await res.json();
      setDoc(data);
      const generating = data.blocks.some(
        (b: DocumentBlock) =>
          ['generating', 'pending', 'queued'].includes(b.audio_status),
      );
      setIsGenerating(generating);
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

  useEffect(() => {
    if (!doc) return;
    if (!doc.source_path && readerViewMode === 'original') {
      setReaderViewMode('text');
    }
  }, [doc, readerViewMode, setReaderViewMode]);

  useEffect(() => {
    if (!doc) return;
    const isLargePdf = doc.file_type === 'pdf' && (doc.page_count ?? 0) > 50;
    if (isLargePdf) {
      setReaderViewMode('text');
    }
  }, [doc?.id, doc?.file_type, doc?.page_count, setReaderViewMode]);

  useEffect(() => {
    return () => {
      setIsPlaying(false);
      setActiveBlockId(null);
    };
  }, [setIsPlaying, setActiveBlockId]);

  const pollGenerationProgress = async () => {
    if (!id) return;
    try {
      const statusRes = await fetch(`${API_URL}/documents/${id}/audio-status`);
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setDocumentAudioStatus(statusData.document_status);
        setQueuePosition(statusData.queue_position ?? null);
        setActiveDocumentId(statusData.active_document_id ?? null);
        setIsGenerating(['queued', 'processing'].includes(statusData.document_status));
      }

      // Refresh full block metadata (audio_path, timestamps, duration) on every poll.
      // Status-only polling was a regression: playback needs stable block data while
      // generation continues, matching pre-queue fetchDoc behavior.
      const docRes = await fetch(`${API_URL}/documents/${id}`);
      if (!docRes.ok) return;
      const data = await docRes.json();
      setDoc(data);
    } catch (pollError) {
      console.error('Failed to poll generation progress', pollError);
    }
  };

  useEffect(() => {
    if (isGenerating) {
      pollIntervalRef.current = window.setInterval(pollGenerationProgress, 3000);
    } else if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [isGenerating, id]);

  useEffect(() => {
    if (readerViewMode !== 'text' || !activeBlockId) return;
    const el = document.getElementById(`block-${activeBlockId}`);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  }, [activeBlockId, readerViewMode]);

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
      const data = await res.json();
      setDocumentAudioStatus(data.document_status ?? 'processing');
      setQueuePosition(data.queue_position ?? null);
      setActiveDocumentId(data.active_document_id ?? null);
      setIsGenerating(['queued', 'processing'].includes(data.document_status ?? 'processing'));
      void pollGenerationProgress();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleVoiceSwitch = (tier: string) => {
    setVoiceTier(tier);
    handleGenerateAudio(tier);
  };

  const handleBlockClick = (blockId: number, isPlayable: boolean) => {
    if (!isPlayable) return;
    setActiveBlockId(blockId);
    setIsPlaying(true);
  };

  if (loading) {
    return (
      <div className="text-center py-10 text-gray-400">
        Loading document...
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
  const hasOriginalSource = Boolean(doc.source_path);
  const libraryBackPath = doc.folder_id ? `/library/folder/${doc.folder_id}` : '/library';

  return (
    <div className="min-h-screen pb-40 flex flex-col">
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

        <h1 className="text-sm font-bold truncate flex-1 text-center" style={{ color: 'var(--reader-text)' }}>
          {doc.filename}
        </h1>

        <div className="flex items-center space-x-2 shrink-0">
          <ReaderViewToggle hasOriginalSource={hasOriginalSource} />
          <ReaderSettingsTrigger />
        </div>
      </div>

      {!allDone && (
        <div className="max-w-2xl mx-auto mt-4 px-4 w-full">
          <div
            className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-xl border"
            style={{ backgroundColor: 'var(--player-bg)', borderColor: 'var(--player-border)' }}
          >
            <div className="mb-4 sm:mb-0">
              <span className="text-sm font-semibold opacity-70" style={{ color: 'var(--reader-text)' }}>
                Voice Generation
              </span>
              <p className="text-xs opacity-60 mt-1" style={{ color: 'var(--reader-text)' }}>
                {documentAudioStatus === 'queued'
                  ? queuePosition
                    ? `Queued (position ${queuePosition}). Waiting for document #${activeDocumentId ?? '…'} to finish.`
                    : 'Queued — waiting for another document to finish generating.'
                  : documentAudioStatus === 'processing'
                    ? 'Generating audio for this document.'
                    : documentAudioStatus === 'failed'
                      ? 'Some blocks failed. Try generating again.'
                      : 'Generate audio to unlock read-along playback.'}
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
                <option value="gtts" style={{ color: 'black' }}>Google TTS (Female)</option>
                <option value="kokoro_female_1" style={{ color: 'black' }}>Kokoro - Heart (Female)</option>
                <option value="kokoro_female_2" style={{ color: 'black' }}>Kokoro - Bella (Female)</option>
                <option value="kokoro_male_1" style={{ color: 'black' }}>Kokoro - Male (Michael)</option>
                <option value="kokoro_male_2" style={{ color: 'black' }}>Kokoro - Adam (Male)</option>
              </select>
              <button
                onClick={() => handleGenerateAudio(voiceTier)}
                disabled={isGenerating || totalBlocks === 0}
                className={`flex items-center justify-center space-x-2 px-4 py-2 rounded-md font-medium text-white transition whitespace-nowrap ${
                  isGenerating || totalBlocks === 0 ? 'bg-brand/60 cursor-not-allowed' : 'bg-brand hover:bg-brand-hover'
                }`}
              >
                {isGenerating ? (
                  documentAudioStatus === 'queued' ? (
                    <>
                      <Clock className="w-4 h-4" />
                      <span>Queued{queuePosition ? ` #${queuePosition}` : ''}</span>
                    </>
                  ) : (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>({doneBlocks}/{totalBlocks})</span>
                    </>
                  )
                ) : (
                  <span>Generate</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0">
        <ErrorBoundary>
          {readerViewMode === 'original' && hasOriginalSource ? (
            <OriginalDocumentViewer
              documentId={doc.id}
              fileType={doc.file_type}
              sourcePath={doc.source_path}
              pageCount={doc.page_count}
              blocks={doc.blocks}
            />
          ) : (
            <TextViewReader blocks={doc.blocks} onBlockClick={handleBlockClick} />
          )}
        </ErrorBoundary>
      </div>

      {hasPlayableBlocks && (
        <AudioPlayer
          documentId={id!}
          blocks={doc.blocks}
          onVoiceClick={() => setIsVoiceModalOpen(true)}
        />
      )}

      <VoiceSwitcherModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        currentVoice={voiceTier}
        onSelectVoice={handleVoiceSwitch}
      />
    </div>
  );
}
