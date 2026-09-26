import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, File, AlertCircle, CheckCircle2 } from 'lucide-react';
import { API_URL, networkErrorMessage, parseApiError } from '../config/api';
import {
  MAX_UPLOAD_BYTES,
  SUPPORTED_UPLOAD_ACCEPT,
  SUPPORTED_UPLOAD_EXTENSION_SET,
  SUPPORTED_UPLOAD_LABEL,
} from '../constants/uploads';

export default function DocumentUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const validateFile = (selected: File): boolean => {
    const ext = selected.name.split('.').pop()?.toLowerCase();
    if (!ext || !SUPPORTED_UPLOAD_EXTENSION_SET.has(ext)) {
      setError(`Unsupported file type. Supported formats: ${SUPPORTED_UPLOAD_LABEL}.`);
      return false;
    }
    if (selected.size > MAX_UPLOAD_BYTES) {
      setError(`File too large. Maximum size is ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB.`);
      return false;
    }
    setError('');
    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      if (validateFile(e.target.files[0])) {
        setFile(e.target.files[0]);
      } else {
        setFile(null);
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      if (validateFile(e.dataTransfer.files[0])) {
        setFile(e.dataTransfer.files[0]);
      } else {
        setFile(null);
      }
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_URL}/documents/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error(await parseApiError(res, 'Upload failed'));
      }

      const data = await res.json();
      navigate(`/document/${data.id}`);
    } catch (err: unknown) {
      setError(networkErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-8 md:p-12">
      <h1 className="text-2xl font-medium text-white mb-6">Upload Document</h1>

      <div
        className={`border-2 border-dashed rounded-none p-10 text-center transition ${isDragging ? 'border-brand bg-brand/10' : 'border-borderDark bg-cardBg  hover:bg-cardHover'}`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <UploadCloud className={`w-12 h-12 mx-auto mb-4 ${isDragging ? 'text-brand' : 'text-gray-400'}`} />
        <h3 className="text-lg font-medium text-gray-200 mb-1">Select a file or drag and drop</h3>
        <p className="text-sm text-gray-500 mb-6">{SUPPORTED_UPLOAD_LABEL}</p>

        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept={SUPPORTED_UPLOAD_ACCEPT}
          onChange={handleFileChange}
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          className="bg-white/10 border border-borderDark text-white px-4 py-2 rounded-none font-medium hover:bg-white/20 transition"
        >
          Browse Files
        </button>
      </div>

      {file && (
        <div className="mt-6 bg-cardBg  border border-borderDark rounded-none p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3 overflow-hidden">
            <File className="w-8 h-8 text-brand flex-shrink-0" />
            <div className="truncate">
              <p className="text-sm font-medium text-white truncate">{file.name}</p>
              <p className="text-xs text-gray-400">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
            </div>
          </div>
          <button
            onClick={() => setFile(null)}
            className="text-gray-400 hover:text-red-500 ml-4 flex-shrink-0 text-sm transition"
          >
            Remove
          </button>
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-none flex items-start space-x-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      <div className="mt-8 flex justify-end">
        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className={`flex items-center space-x-2 px-6 py-2 rounded-none font-medium text-white transition ${!file || uploading ? 'bg-brand/50 cursor-not-allowed text-white/50' : 'bg-brand hover:bg-brand-hover'}`}
        >
          {uploading ? (
            <>
              <div className="w-4 h-4 border-2 border-borderDark0 border-t-white rounded-none animate-spin"></div>
              <span>Uploading...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-5 h-5" />
              <span>Confirm Upload</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}


