import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, FileText, X, Loader2 } from 'lucide-react';
import { uploadDocument, uploadText } from '../api/library';

type Tab = 'file' | 'text';

export default function DocumentUpload() {
  const [tab, setTab] = useState<Tab>('file');
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setFile(e.target.files[0]);
  };

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      let doc;
      if (tab === 'file') {
        if (!file) return setError('Please select a file.');
        doc = await uploadDocument(file);
      } else {
        if (!text.trim()) return setError('Please enter some text.');
        doc = await uploadText(text, title || undefined);
      }
      navigate(`/document/${doc.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-1">Add document</h1>
      <p className="text-textMuted text-sm mb-8">Upload a PDF or TXT file, or paste text directly.</p>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-black/30 rounded-xl p-1 mb-6 w-fit border border-borderDark">
        {(['file', 'text'] as Tab[]).map(t => (
          <button
            key={t}
            id={`upload-tab-${t}`}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition ${
              tab === t ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {t === 'file' ? 'File upload' : 'Paste text'}
          </button>
        ))}
      </div>

      {tab === 'file' ? (
        <div
          id="upload-dropzone"
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-2xl p-10 text-center transition cursor-pointer ${
            dragging ? 'border-accentBlue bg-accentBlue/5' : 'border-borderDark hover:border-gray-600'
          }`}
          onClick={() => document.getElementById('file-input')?.click()}
        >
          <input
            id="file-input"
            type="file"
            accept=".pdf,.txt"
            className="hidden"
            onChange={handleFileInput}
          />
          {file ? (
            <div className="flex items-center justify-center gap-3">
              <FileText className="w-8 h-8 text-accentBlue" />
              <div className="text-left">
                <p className="text-white font-medium">{file.name}</p>
                <p className="text-textMuted text-xs">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
              <button
                id="upload-clear-file"
                onClick={e => { e.stopPropagation(); setFile(null); }}
                className="ml-4 p-1 text-gray-500 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <UploadCloud className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">
                Drag & drop or <span className="text-accentBlue underline">browse</span>
              </p>
              <p className="text-gray-600 text-xs mt-1">PDF or TXT — max 20 MB</p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <input
            id="upload-title-input"
            type="text"
            placeholder="Title (optional)"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full bg-cardBg border border-borderDark rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-accentBlue transition"
          />
          <textarea
            id="upload-text-input"
            rows={12}
            placeholder="Paste your text here…"
            value={text}
            onChange={e => setText(e.target.value)}
            className="w-full bg-cardBg border border-borderDark rounded-xl px-4 py-3 text-gray-200 placeholder-gray-600 text-sm focus:outline-none focus:border-accentBlue transition resize-none font-mono leading-relaxed"
          />
        </div>
      )}

      {error && (
        <p id="upload-error" className="mt-4 text-red-400 text-sm">{error}</p>
      )}

      <button
        id="upload-submit"
        onClick={handleSubmit}
        disabled={loading}
        className="mt-6 w-full flex items-center justify-center gap-2 bg-accentBlue hover:bg-accentHover disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition"
      >
        {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</> : 'Add to library'}
      </button>
    </div>
  );
}
