import { useState } from 'react';
import { Type, Link as LinkIcon, BookOpen, Headphones } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PasteTextModal from '../components/PasteTextModal';
import PasteLinkModal from '../components/PasteLinkModal';

export default function Dashboard() {
  const navigate = useNavigate();
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
    { name: 'Paste Text', icon: <Type className="w-10 h-10" color="#0ea5e9" /> },
    { name: 'Find a Book', icon: <BookOpen className="w-10 h-10" color="#eab308" /> },
    { name: 'Paste Link', icon: <LinkIcon className="w-10 h-10" color="#10b981" /> },
  ];

  const handleCardClick = (name: string) => {
    if (name === 'Paste Text') openTextModal();
    else if (name === 'Paste Link') setIsLinkModalOpen(true);
    else navigate('/upload');
  };

  return (
    <div className="flex-1 bg-mainBg min-h-screen p-8 md:p-12 lg:p-16 text-gray-200">
      <div className="max-w-4xl mx-auto space-y-12">
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
          <div className="bg-cardBg rounded-none p-4 flex items-center justify-between mb-4 border border-borderDark">
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
              className="bg-brand hover:bg-brand-hover text-white text-sm font-medium px-5 py-2 rounded-none transition whitespace-nowrap"
            >
              Upload Files
            </button>
          </div>

          {/* Action Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {actionCards.map((card) => (
              <button 
                key={card.name}
                className="bg-cardBg hover:bg-cardHover rounded-none p-6 flex flex-col items-center justify-center space-y-4 border border-borderDark transition group"
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
