import { useState, useEffect, type FormEvent } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API_URL, networkErrorMessage, parseApiError } from '../config/api';

interface PasteTextModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialText?: string;
}

export default function PasteTextModal({ isOpen, onClose, initialText = '' }: PasteTextModalProps) {
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen && initialText) {
      setText(initialText);
    }
  }, [isOpen, initialText]);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) {
      setError("Text cannot be empty.");
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch(`${API_URL}/documents/text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title, text })
      });

      if (!res.ok) {
        throw new Error(await parseApiError(res, 'Failed to submit text.'));
      }

      const doc = await res.json();
      setTitle('');
      setText('');
      onClose();
      navigate(`/document/${doc.id}`);
    } catch (err: unknown) {
      setError(networkErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-cardBg rounded-2xl w-full max-w-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <h2 className="text-lg font-semibold text-white">Paste Text</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/5 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}
          
          <form id="paste-text-form" onSubmit={handleSubmit} className="space-y-4 flex flex-col h-full">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Title (Optional)</label>
              <input 
                type="text" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Chapter 1, Meeting Notes" 
                className="w-full bg-cardBg border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
            
            <div className="flex-1 min-h-[200px]">
              <label className="block text-sm font-medium text-gray-300 mb-2">Text Content</label>
              <textarea 
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste your text here..." 
                className="w-full h-full min-h-[250px] bg-cardBg border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand resize-none"
              />
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/5 bg-mainBg flex justify-end space-x-3">
          <button 
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl font-medium text-sm text-gray-300 hover:text-white hover:bg-white/5 transition"
          >
            Cancel
          </button>
          <button 
            type="submit"
            form="paste-text-form"
            disabled={isSubmitting || !text.trim()}
            className="flex items-center space-x-2 bg-brand hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed px-5 py-2.5 rounded-xl font-medium text-sm text-white transition shadow-sm"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            <span>{isSubmitting ? 'Processing...' : 'Import Text'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
