import { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, Upload, Loader2, Square, Zap, Download } from 'lucide-react';
import { base64ToArrayBuffer, mergeWavBuffers, downloadWav } from '../utils/wavUtils';
import { API_URL } from '../config/api';

const MAX_TEXT_LENGTH = 5000;

interface StreamMetrics {
  ttfa_ms: number | null;
  rtf: number | null;
  total_audio_duration_s: number;
  chunk_count: number;
  total_generation_time_s: number;
}

export default function VoiceClone() {
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [text, setText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState('');
  const [metrics, setMetrics] = useState<StreamMetrics | null>(null);
  const [ttfaDisplay, setTtfaDisplay] = useState<number | null>(null);
  const [status, setStatus] = useState('');
  const [recordedAudio, setRecordedAudio] = useState<ArrayBuffer | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const nextPlayTimeRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const wavChunksRef = useRef<ArrayBuffer[]>([]);

  const stopPlayback = useCallback(() => {
    abortRef.current?.abort();
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    nextPlayTimeRef.current = 0;
    setIsStreaming(false);
    setStatus('');
  }, []);

  useEffect(() => {
    return () => stopPlayback();
  }, [stopPlayback]);

  const playWavChunk = useCallback(async (base64Data: string) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
      nextPlayTimeRef.current = audioContextRef.current.currentTime;
    }
    const ctx = audioContextRef.current;

    const binary = atob(base64Data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    const audioBuffer = await ctx.decodeAudioData(bytes.buffer.slice(0));
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);

    const startTime = Math.max(ctx.currentTime, nextPlayTimeRef.current);
    source.start(startTime);
    nextPlayTimeRef.current = startTime + audioBuffer.duration;
  }, []);

  const finalizeRecordedAudio = useCallback(() => {
    if (wavChunksRef.current.length === 0) {
      setRecordedAudio(null);
      return;
    }
    try {
      const merged = mergeWavBuffers(wavChunksRef.current);
      setRecordedAudio(merged);
    } catch {
      setRecordedAudio(null);
    }
  }, []);

  const handleStream = async () => {
    if (!referenceFile || !text.trim()) {
      setError('Please upload a reference audio clip and enter text.');
      return;
    }
    if (text.length > MAX_TEXT_LENGTH) {
      setError(`Text exceeds ${MAX_TEXT_LENGTH} character limit.`);
      return;
    }

    stopPlayback();
    setError('');
    setMetrics(null);
    setTtfaDisplay(null);
    setRecordedAudio(null);
    wavChunksRef.current = [];
    setIsStreaming(true);
    setStatus('Preparing...');

    const formData = new FormData();
    formData.append('text', text);
    formData.append('reference_audio', referenceFile);

    const abort = new AbortController();
    abortRef.current = abort;
    const startTime = performance.now();
    let firstChunkReceived = false;

    try {
      const res = await fetch(`${API_URL}/voice-clone/stream`, {
        method: 'POST',
        body: formData,
        signal: abort.signal,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ detail: 'Stream request failed' }));
        throw new Error(errData.detail || 'Stream request failed');
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          let event;
          try {
            event = JSON.parse(line.slice(6));
          } catch {
            continue;
          }

          if (event.type === 'audio') {
            if (!firstChunkReceived) {
              firstChunkReceived = true;
              const ttfa = performance.now() - startTime;
              setTtfaDisplay(Math.round(ttfa));
              setStatus('Playing...');
            }
            wavChunksRef.current.push(base64ToArrayBuffer(event.data));
            await playWavChunk(event.data);
            setStatus(`Playing chunk ${event.chunk_index + 1}...`);
          } else if (event.type === 'metrics') {
            setMetrics(event);
          } else if (event.type === 'error') {
            throw new Error(event.message);
          } else if (event.type === 'done') {
            setStatus('Complete');
            finalizeRecordedAudio();
          }
        }
      }

      if (wavChunksRef.current.length > 0) {
        finalizeRecordedAudio();
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message);
        setStatus('');
      }
    } finally {
      setIsStreaming(false);
    }
  };

  const handleDownload = async () => {
    if (recordedAudio) {
      const slug = text.trim().slice(0, 30).replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'voice-clone';
      downloadWav(recordedAudio, `${slug}.wav`);
      return;
    }

    if (!referenceFile || !text.trim()) {
      setError('Please upload a reference audio clip and enter text.');
      return;
    }
    if (text.length > MAX_TEXT_LENGTH) {
      setError(`Text exceeds ${MAX_TEXT_LENGTH} character limit.`);
      return;
    }

    setIsDownloading(true);
    setError('');

    const formData = new FormData();
    formData.append('text', text);
    formData.append('reference_audio', referenceFile);

    try {
      const res = await fetch(`${API_URL}/voice-clone/synthesize`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ detail: 'Download request failed' }));
        throw new Error(errData.detail || 'Download request failed');
      }

      const blob = await res.blob();
      const slug = text.trim().slice(0, 30).replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'voice-clone';
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${slug}.wav`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);

      const buffer = await blob.arrayBuffer();
      setRecordedAudio(buffer);
      wavChunksRef.current = [buffer];
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsDownloading(false);
    }
  };

  const canGenerate = Boolean(referenceFile && text.trim() && text.length <= MAX_TEXT_LENGTH);
  const canDownload = Boolean(recordedAudio) && !isStreaming && !isDownloading;

  return (
    <div className="p-8 md:p-12 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Voice Clone Studio</h1>
        <p className="text-gray-400 text-sm">
          Upload a short voice sample, enter text, and hear it spoken in that voice — streamed in real time.
        </p>
      </div>

      {(ttfaDisplay !== null || metrics) && (
        <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-cardBg rounded-xl p-4 border border-white/5">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Time to First Audio</div>
            <div className="text-2xl font-bold text-green-400">
              {ttfaDisplay !== null ? `${ttfaDisplay}ms` : '—'}
            </div>
          </div>
          {metrics && (
            <>
              <div className="bg-cardBg rounded-xl p-4 border border-white/5">
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Real-Time Factor</div>
                <div className="text-2xl font-bold text-brand">{metrics.rtf ?? '—'}</div>
              </div>
              <div className="bg-cardBg rounded-xl p-4 border border-white/5">
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Audio Duration</div>
                <div className="text-2xl font-bold text-white">{metrics.total_audio_duration_s}s</div>
              </div>
              <div className="bg-cardBg rounded-xl p-4 border border-white/5">
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Chunks</div>
                <div className="text-2xl font-bold text-white">{metrics.chunk_count}</div>
              </div>
            </>
          )}
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm">
          {error}
        </div>
      )}

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">Reference Voice (3–30 seconds)</label>
        <div
          className="bg-cardBg rounded-2xl border border-dashed border-white/10 p-6 text-center cursor-pointer hover:border-brand/50 transition"
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={(e) => {
              setReferenceFile(e.target.files?.[0] || null);
              setError('');
              setRecordedAudio(null);
              wavChunksRef.current = [];
            }}
          />
          {referenceFile ? (
            <div className="flex items-center justify-center space-x-2 text-gray-200">
              <Mic className="w-5 h-5 text-brand" />
              <span className="text-sm">{referenceFile.name}</span>
              <span className="text-xs text-gray-500">({(referenceFile.size / 1024).toFixed(0)} KB)</span>
            </div>
          ) : (
            <div>
              <Upload className="w-8 h-8 text-gray-500 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Click to upload a voice sample (WAV, MP3, OGG)</p>
            </div>
          )}
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">Text to Speak</label>
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (e.target.value.length <= MAX_TEXT_LENGTH) setError('');
          }}
          placeholder="Enter the text you want spoken in the cloned voice..."
          rows={5}
          maxLength={MAX_TEXT_LENGTH}
          className="w-full bg-cardBg border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand resize-none"
        />
        <p className={`text-xs mt-1 ${text.length >= MAX_TEXT_LENGTH ? 'text-amber-400' : 'text-gray-500'}`}>
          {text.length} / {MAX_TEXT_LENGTH} characters
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={handleStream}
          disabled={isStreaming || isDownloading || !canGenerate}
          className="flex items-center space-x-2 bg-brand hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 rounded-full font-medium text-white transition"
        >
          {isStreaming ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Streaming...</span>
            </>
          ) : (
            <>
              <Zap className="w-5 h-5" />
              <span>Clone &amp; Stream</span>
            </>
          )}
        </button>

        <button
          onClick={handleDownload}
          disabled={isStreaming || isDownloading || (!canDownload && !canGenerate)}
          className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed px-5 py-3 rounded-full font-medium text-gray-200 transition"
          title={canDownload ? 'Download generated audio' : 'Generate and download audio file'}
        >
          {isDownloading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Generating...</span>
            </>
          ) : (
            <>
              <Download className="w-5 h-5" />
              <span>{canDownload ? 'Download Audio' : 'Generate & Download'}</span>
            </>
          )}
        </button>

        {isStreaming && (
          <button
            onClick={stopPlayback}
            className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 px-4 py-3 rounded-full text-gray-300 transition"
          >
            <Square className="w-4 h-4" />
            <span>Stop</span>
          </button>
        )}

        {status && (
          <span className="text-sm text-gray-400">{status}</span>
        )}
      </div>

      <div className="mt-8 p-4 bg-cardBg rounded-xl border border-white/5 text-xs text-gray-500 space-y-1">
        <p><strong className="text-gray-400">How it works:</strong> Your reference audio is analyzed to extract speaker characteristics. Text is split into sentence chunks and synthesized incrementally — audio begins playing as soon as the first chunk is ready.</p>
        <p>After streaming completes, use <strong className="text-gray-400">Download Audio</strong> to save the full recording. You can also use <strong className="text-gray-400">Generate &amp; Download</strong> to create a file without streaming.</p>
      </div>
    </div>
  );
}
