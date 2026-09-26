import { useState, type FormEvent } from 'react';
import { X, Loader2, Link as LinkIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API_URL, networkErrorMessage, parseApiError } from '../config/api';

interface PasteLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PasteLinkModal({ isOpen, onClose }: PasteLinkModalProps) {
  const [url, setUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleClose = () => {
    setUrl('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setError("URL cannot be empty.");
      return;
    }

    let normalizedUrl = url.trim();
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = `https://${normalizedUrl}`;
    }
    try {
      new URL(normalizedUrl);
    } catch {
      setError("Please enter a valid URL.");
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch(`${API_URL}/documents/link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url: normalizedUrl })
      });

      if (!res.ok) {
        throw new Error(await parseApiError(res, 'Failed to process link.'));
      }

      const doc = await res.json();
      setUrl('');
      handleClose();
      navigate(`/document/${doc.id}`);
    } catch (err: unknown) {
      setError(networkErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-cardBg rounded-2xl w-full max-w-md border border-white/10 shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <h2 className="text-lg font-semibold text-white">Paste Web Link</h2>
          <button onClick={handleClose} className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/5 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}
          
          <form id="paste-link-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Webpage URL</label>
              <div className="relative">
                <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input 
                  type="url" 
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/article" 
                  className="w-full bg-cardBg border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                We'll automatically extract the main article text and ignore navigation and sidebars.
              </p>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/5 bg-mainBg flex justify-end space-x-3">
          <button 
            type="button"
            onClick={handleClose}
            className="px-5 py-2.5 rounded-xl font-medium text-sm text-gray-300 hover:text-white hover:bg-white/5 transition"
          >
            Cancel
          </button>
          <button 
            type="submit"
            form="paste-link-form"
            disabled={isSubmitting || !url.trim()}
            className="flex items-center space-x-2 bg-brand hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed px-5 py-2.5 rounded-xl font-medium text-sm text-white transition shadow-sm"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            <span>{isSubmitting ? 'Fetching...' : 'Import Link'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
