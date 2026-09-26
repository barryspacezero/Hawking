import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AudioLines,
  FileText,
  Loader2,
  Mic,
  Type,
  Upload,
} from 'lucide-react';
import { fetchDocuments } from '../api/library';
import { fetchVoiceProfiles, type VoiceProfile } from '../api/voiceProfiles';
import {
  createStudioGeneration,
  fetchStudioGeneration,
  studioAudioUrl,
  type StudioGeneration,
  type StudioInputMode,
} from '../api/voiceStudio';
import type { DocumentItem } from '../types/library';

const MAX_TEXT_LENGTH = 10000;

const inputModes: { id: StudioInputMode; label: string; icon: typeof Type }[] = [
  { id: 'text', label: 'Type text', icon: Type },
  { id: 'document', label: 'Existing document', icon: FileText },
  { id: 'file', label: 'Upload file', icon: Upload },
];

export default function VoiceClone() {
  const [profiles, setProfiles] = useState<VoiceProfile[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<number | ''>('');
  const [inputMode, setInputMode] = useState<StudioInputMode>('text');
  const [text, setText] = useState('');
  const [documentId, setDocumentId] = useState<number | ''>('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [job, setJob] = useState<StudioGeneration | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [voiceList, docList] = await Promise.all([
        fetchVoiceProfiles(),
        fetchDocuments(),
      ]);
      setProfiles(voiceList);
      setDocuments(docList);
      if (voiceList.length > 0 && selectedProfileId === '') {
        setSelectedProfileId(voiceList[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load studio data');
    }
  }, [selectedProfileId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const startPolling = (jobId: number) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const latest = await fetchStudioGeneration(jobId);
        setJob(latest);
        if (latest.status === 'done' || latest.status === 'failed') {
          stopPolling();
          setLoading(false);
          if (latest.status === 'failed') {
            setError(latest.error_message || 'Generation failed.');
          }
        }
      } catch (err) {
        stopPolling();
        setLoading(false);
        setError(err instanceof Error ? err.message : 'Failed to poll generation status');
      }
    }, 1500);
  };

  const canSubmit = Boolean(selectedProfileId) && (
    (inputMode === 'text' && text.trim()) ||
    (inputMode === 'document' && documentId !== '') ||
    (inputMode === 'file' && uploadFile)
  );

  const handleGenerate = async () => {
    if (!selectedProfileId || !canSubmit) return;

    setLoading(true);
    setError('');
    setJob(null);
    stopPolling();

    try {
      const created = await createStudioGeneration({
        voiceProfileId: Number(selectedProfileId),
        inputMode,
        text: inputMode === 'text' ? text : undefined,
        documentId: inputMode === 'document' ? Number(documentId) : undefined,
        file: inputMode === 'file' ? uploadFile || undefined : undefined,
      });
      setJob(created);
      if (created.status === 'done') {
        setLoading(false);
      } else {
        startPolling(created.id);
      }
    } catch (err) {
      setLoading(false);
      setError(err instanceof Error ? err.message : 'Failed to start generation');
    }
  };

  const statusLabel = (() => {
    if (!job) return '';
    if (job.status === 'queued') {
      return job.queue_position
        ? `Queued — ${job.queue_position} job(s) ahead`
        : 'Queued — waiting for the TTS queue';
    }
    if (job.status === 'processing') return 'Generating audio with your cloned voice...';
    if (job.status === 'done') return 'Complete — play your audio below';
    if (job.status === 'failed') return 'Generation failed';
    return job.status;
  })();

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold      mb-2">Voice Clone Studio</h1>
          <p className="text-gray-400 text-sm max-w-2xl">
            Generate audio in any saved cloned voice from typed text, an existing document, or a new file upload.
            This is separate from the reading view — use it whenever you want a one-off narration in a chosen voice.
          </p>
        </div>
        <Link
          to="/voice-library"
          className="flex items-center gap-1 text-sm text-brand hover:text-brand-hover transition"
        >
          <AudioLines className="w-4 h-4" />
          Manage voices
        </Link>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-none text-sm">
          {error}
        </div>
      )}

      <div className="space-y-6">
        <section className="bg-cardBg  border border-borderDark rounded-none p-5">
          <label className="block text-sm font-medium text-gray-300 mb-2">Saved voice</label>
          {profiles.length === 0 ? (
            <p className="text-sm text-gray-500">
              No saved voices yet.{' '}
              <Link to="/voice-library" className="text-brand hover:underline">Add one in Voice Library</Link>.
            </p>
          ) : (
            <select
              value={selectedProfileId}
              onChange={(e) => setSelectedProfileId(e.target.value ? Number(e.target.value) : '')}
              className="w-full bg-black/30 border border-borderDark rounded-none px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-brand"
            >
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>{profile.name}</option>
              ))}
            </select>
          )}
        </section>

        <section className="bg-cardBg  border border-borderDark rounded-none p-5">
          <label className="block text-sm font-medium text-gray-300 mb-3">Input source</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-5">
            {inputModes.map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => setInputMode(mode.id)}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-none text-sm font-medium transition ${
                  inputMode === mode.id
                    ? 'bg-brand text-white'
                    : 'bg-cardHover text-gray-300 hover:bg-white/10'
                }`}
              >
                <mode.icon className="w-4 h-4" />
                {mode.label}
              </button>
            ))}
          </div>

          {inputMode === 'text' && (
            <div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={6}
                maxLength={MAX_TEXT_LENGTH}
                placeholder="Type or paste the text you want spoken in the selected voice..."
                className="w-full bg-black/30 border border-borderDark rounded-none px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">{text.length} / {MAX_TEXT_LENGTH}</p>
            </div>
          )}

          {inputMode === 'document' && (
            <div>
              {documents.length === 0 ? (
                <p className="text-sm text-gray-500">No documents in your library yet. Upload one first.</p>
              ) : (
                <select
                  value={documentId}
                  onChange={(e) => setDocumentId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full bg-black/30 border border-borderDark rounded-none px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-brand"
                >
                  <option value="">Select a document...</option>
                  {documents.map((doc) => (
                    <option key={doc.id} value={doc.id}>{doc.filename}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          {inputMode === 'file' && (
            <label className="flex flex-col items-center justify-center gap-2 border border-dashed border-borderDark rounded-none p-6 cursor-pointer hover:border-brand/50 transition">
              <input
                type="file"
                accept=".pdf,.txt,.md,.docx,.doc,.epub,.rtf,.odt,.html,.csv"
                className="hidden"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              />
              <Mic className="w-6 h-6 text-brand" />
              <span className="text-sm text-gray-300">
                {uploadFile ? uploadFile.name : 'Upload PDF, TXT, DOCX, or other supported file'}
              </span>
              <span className="text-xs text-gray-500">Max 10 MB for studio uploads</span>
            </label>
          )}
        </section>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading || !canSubmit || profiles.length === 0}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-brand hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed px-8 py-3 rounded-none font-medium text-white transition"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>{statusLabel || 'Generating...'}</span>
            </>
          ) : (
            <span>Generate audio</span>
          )}
        </button>

        {job && (
          <section className="bg-cardBg  border border-borderDark rounded-none p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-white font-medium">Generation status</h2>
                <p className="text-sm text-gray-400">{statusLabel}</p>
              </div>
              <span className={`text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-none ${
                job.status === 'done'
                  ? 'bg-green-500/10 text-green-400'
                  : job.status === 'failed'
                    ? 'bg-red-500/10 text-red-400'
                    : 'bg-amber-500/10 text-amber-300'
              }`}>
                {job.status}
              </span>
            </div>

            <p className="text-xs text-gray-500 line-clamp-3">{job.text_preview}</p>

            {job.has_audio && job.status === 'done' && (
              <audio
                controls
                className="w-full"
                src={studioAudioUrl(job.id)}
              >
                Your browser does not support audio playback.
              </audio>
            )}
          </section>
        )}
      </div>
    </div>
  );
}



