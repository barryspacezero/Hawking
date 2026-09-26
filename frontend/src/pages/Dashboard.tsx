import { useState } from 'react';
import { FaGoogleDrive, FaDropbox, FaMicrosoft } from 'react-icons/fa';
import { Type, Link as LinkIcon, BookOpen, Headphones, ChevronDown, Mic, ArrowUp, Plus } from 'lucide-react';
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
    { name: 'Upload from Drive', icon: <FaGoogleDrive className="w-10 h-10" color="#1FA463" /> },
    { name: 'Upload from Dropbox', icon: <FaDropbox className="w-10 h-10" color="#0061FE" /> },
    { name: 'Upload from OneDrive', icon: <FaMicrosoft className="w-10 h-10" color="#0078D4" /> },
    { name: 'Paste Text', icon: <Type className="w-10 h-10" color="#0ea5e9" /> },
    { name: 'Find a Book', icon: <BookOpen className="w-10 h-10" color="#eab308" /> },
    { name: 'Paste Link', icon: <LinkIcon className="w-10 h-10" color="#10b981" /> },
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
                <div className="w-12 h-12 flex items-center justify-center opacity-80 group-hover:opacity-100 transition">{card.icon}</div>
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





