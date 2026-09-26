import { useState } from 'react';
import { Headphones, ChevronDown, Mic, ArrowUp, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PasteTextModal from '../components/PasteTextModal';
import PasteLinkModal from '../components/PasteLinkModal';
import { API_URL, networkErrorMessage, parseApiError } from '../config/api';

export default function Dashboard() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  
  const [isTextModalOpen, setIsTextModalOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [textModalInitial, setTextModalInitial] = useState('');

  const openTextModal = (prefill = '') => {
    setTextModalInitial(prefill);
    setIsTextModalOpen(true);
  };

  const closeTextModal = () => {
    setIsTextModalOpen(false);
    setTextModalInitial('');
  };

  const workflows = ['Listen to Text'];

  const actionCards = [
    { name: 'Upload from Drive', icon: 'M4.5 19L11.5 7L18.5 19H4.5ZM12 4L19 16L22 10.5L15 2L12 4ZM2 10.5L5 16L12 4L9 2L2 10.5Z', color: '#1FA463', bg: '#1e1c1a' },
    { name: 'Upload from Dropbox', icon: 'M12 2L4 7L12 12L20 7L12 2ZM4 17L12 22L20 17L12 12L4 17ZM4 7V17L12 12V2L4 7ZM20 7V17L12 12V2L20 7Z', color: '#0061FE', bg: '#1e1c1a' },
    { name: 'Upload from OneDrive', icon: 'M17.5 10.5C17.5 10.5 17.5 10.5 17.5 10.5C17.5 7.5 15 5 12 5C9.5 5 7.4 6.8 6.7 9.1C6.5 9.1 6.3 9.1 6.1 9.1C3.3 9.1 1 11.4 1 14.2C1 17 3.3 19.3 6.1 19.3H17.5C19.9 19.3 22 17.3 22 14.9C22 12.6 20.1 10.7 17.5 10.5Z', color: '#0078D4', bg: '#1e1c1a' },
    { name: 'Paste Text', icon: 'M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2ZM13 9V3.5L18.5 9H13Z', color: '#ed5e29', bg: '#1e1c1a' },
    { name: 'Find a Book', icon: 'M12 3C8.1 3 4.4 4.4 1.5 6.9C1.2 7.1 1 7.6 1 8V20.5C1 21.1 1.6 21.5 2.1 21.3C5.1 19.6 8.5 18.7 12 18.7C15.5 18.7 18.9 19.6 21.9 21.3C22.4 21.5 23 21.1 23 20.5V8C23 7.6 22.8 7.1 22.5 6.9C19.6 4.4 15.9 3 12 3ZM12 16.7C8.9 16.7 5.8 17.4 3 18.8V8.6C5.6 6.8 8.7 5.8 12 5.8C15.3 5.8 18.4 6.8 21 8.6V18.8C18.2 17.4 15.1 16.7 12 16.7Z', color: '#F59E0B', bg: '#1e1c1a' },
    { name: 'Paste Link', icon: 'M3.9 12C3.9 10.3 5.3 8.9 7 8.9H11V7H7C4.2 7 2 9.2 2 12C2 14.8 4.2 17 7 17H11V15.1H7C5.3 15.1 3.9 13.7 3.9 12ZM8 13H16V11H8V13ZM17 7H13V8.9H17C18.7 8.9 20.1 10.3 20.1 12C20.1 13.7 18.7 15.1 17 15.1H13V17H17C19.8 17 22 14.8 22 12C22 9.2 19.8 7 17 7Z', color: '#ed5e29', bg: '#1e1c1a' },
  ];

  const handleCloudImport = async (provider: string) => {
    // This is the mock flow since API keys aren't provided yet
    try {
      const res = await fetch(`${API_URL}/documents/cloud-import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          provider: provider,
          file_id: `mock-${provider}-12345`
        })
      });

      if (!res.ok) {
        throw new Error(await parseApiError(res, 'Failed to import from cloud.'));
      }

      const doc = await res.json();
      navigate(`/document/${doc.id}`);
    } catch (err: unknown) {
      alert(networkErrorMessage(err));
    }
  };

  const handleCardClick = (name: string) => {
    if (name === 'Paste Text') openTextModal();
    else if (name === 'Paste Link') setIsLinkModalOpen(true);
    else if (name === 'Upload from Drive') handleCloudImport('Google Drive');
    else if (name === 'Upload from Dropbox') handleCloudImport('Dropbox');
    else if (name === 'Upload from OneDrive') handleCloudImport('OneDrive');
    else navigate('/upload');
  };

  return (
    <div className="flex-1 bg-mainBg min-h-screen p-8 md:p-12 lg:p-16 text-gray-200">
      <div className="max-w-4xl mx-auto space-y-12">
        
        {/* Header / Prompt Input */}
        <div className="space-y-4">
          <h1 className="text-2xl font-medium text-white mb-6">What do you want to work on today?</h1>
          
          <div className="bg-cardBg  rounded-none p-4 flex flex-col justify-between border border-borderDark focus-within:border-white/20 transition-colors  min-h-[120px]">
            <textarea
              className="w-full bg-transparent border-none text-white placeholder-gray-500 resize-none focus:ring-0 focus:outline-none"
              placeholder="Describe your task or ask anything"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={2}
            />
            
            <div className="flex items-center justify-between mt-4">
              <button className="w-8 h-8 rounded-none flex items-center justify-center hover:bg-white/10 text-gray-400 transition">
                <Plus className="w-5 h-5" />
              </button>
              
              <div className="flex items-center space-x-2">
                <button className="flex items-center space-x-1 text-xs font-medium text-gray-400 hover:text-white px-2 py-1 rounded-none hover:bg-cardHover transition">
                  <span>Auto</span>
                  <ChevronDown className="w-3 h-3" />
                </button>
                <button className="w-8 h-8 rounded-none flex items-center justify-center hover:bg-white/10 text-gray-400 transition">
                  <Mic className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => openTextModal(prompt.trim())}
                  className={`w-8 h-8 rounded-none flex items-center justify-center transition ${prompt.trim() ? 'bg-white text-black' : 'bg-white/10 text-gray-500'}`}
                  disabled={!prompt.trim()}
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Workflows */}
        <div>
          <h2 className="text-xl font-medium text-white mb-6">Workflows</h2>
          
          <div className="flex items-center space-x-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
            {workflows.map((wf, idx) => (
              <button 
                key={wf}
                className={`px-4 py-1.5 rounded-none text-sm font-medium whitespace-nowrap transition ${
                  idx === 0 ? 'bg-white/10 text-white border border-borderDark' : 'text-gray-400 hover:text-white hover:bg-cardHover'
                }`}
              >
                {wf}
              </button>
            ))}
          </div>

          {/* Hawking listen banner */}
          <div className="bg-cardBg  rounded-none p-4 flex items-center justify-between mb-4 border border-borderDark">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 rounded-none bg-brand flex items-center justify-center text-white shrink-0">
                <Headphones className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-medium text-white text-sm">Listen with Hawking</h3>
                <p className="text-xs text-gray-400">PDF, DOCX, EPUB, and more</p>
              </div>
            </div>
            <button 
              onClick={() => navigate('/upload')}
              className="bg-brand hover:bg-brand-hover text-white text-sm font-medium px-5 py-2 rounded-none transition  whitespace-nowrap"
            >
              Upload Files
            </button>
          </div>

          {/* Action Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {actionCards.map((card) => (
              <button 
                key={card.name}
                className="bg-cardBg  hover:bg-cardHover rounded-none p-6 flex flex-col items-center justify-center space-y-4 border border-borderDark transition group"
                onClick={() => handleCardClick(card.name)}
              >
                <div className="w-12 h-12 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill={card.color} xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 opacity-90 group-hover:opacity-100 transition">
                    <path d={card.icon} />
                  </svg>
                </div>
                <span className="text-sm font-medium text-gray-300 group-hover:text-white transition">{card.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Modals */}
      <PasteTextModal isOpen={isTextModalOpen} onClose={closeTextModal} initialText={textModalInitial} />
      <PasteLinkModal isOpen={isLinkModalOpen} onClose={() => setIsLinkModalOpen(false)} />

    </div>
  );
}


