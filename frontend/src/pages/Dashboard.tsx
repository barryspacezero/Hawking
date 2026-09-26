import { useState, useEffect } from 'react';
import { Type, Link as LinkIcon, BookOpen, Headphones, FileText, Clock, ChevronRight } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import PasteTextModal from '../components/PasteTextModal';
import PasteLinkModal from '../components/PasteLinkModal';
import { fetchDocuments } from '../api/library';
import type { DocumentItem } from '../types/library';

export default function Dashboard() {
  const navigate = useNavigate();
  const [isTextModalOpen, setIsTextModalOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [textModalInitial, setTextModalInitial] = useState('');
  const [recentDocs, setRecentDocs] = useState<DocumentItem[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);

  useEffect(() => {
    const loadRecent = async () => {
      try {
        const docs = await fetchDocuments();
        // Sort by id or upload_date descending (assuming higher id is newer)
        const sorted = docs.sort((a, b) => b.id - a.id).slice(0, 3);
        setRecentDocs(sorted);
      } catch (err) {
        console.error("Failed to load recent docs", err);
      } finally {
        setLoadingDocs(false);
      }
    };
    loadRecent();
  }, []);

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
          <h2 className="text-2xl font-medium text-white mb-6">Welcome back to Hawking</h2>
          
          <div className="flex items-center space-x-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
            {workflows.map((wf, idx) => (
              <button 
                key={wf}
                className={`px-4 py-1.5 rounded-none text-sm font-medium whitespace-nowrap transition ${idx === 0 ? 'bg-white/10 text-white border border-borderDark' : 'text-gray-400 hover:text-white hover:bg-cardHover'}`}
              >
                {wf}
              </button>
            ))}
          </div>

          {/* Hawking listen banner */}
          <div className="bg-cardBg rounded-none p-5 flex items-center justify-between mb-8 border border-borderDark hover:border-brand/30 transition group cursor-pointer" onClick={() => navigate('/upload')}>
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-none bg-brand/10 flex items-center justify-center text-brand shrink-0 group-hover:bg-brand group-hover:text-white transition">
                <Headphones className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-medium text-white text-base">Listen with Hawking</h3>
                <p className="text-sm text-gray-400 mt-0.5">Upload PDF, DOCX, EPUB, and more</p>
              </div>
            </div>
            <div className="text-brand flex items-center text-sm font-medium">
              Upload Files <ChevronRight className="w-4 h-4 ml-1" />
            </div>
          </div>

          {/* Action Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-12">
            {actionCards.map((card) => (
              <button 
                key={card.name}
                className="bg-cardBg hover:bg-cardHover rounded-none p-6 flex flex-col items-center justify-center space-y-4 border border-borderDark hover:border-brand/30 transition group"
                onClick={() => handleCardClick(card.name)}
              >
                <div className="w-12 h-12 flex items-center justify-center opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300">{card.icon}</div>
                <span className="text-sm font-medium text-gray-300 group-hover:text-white transition">{card.name}</span>
              </button>
            ))}
          </div>
          
          {/* Recent Documents */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-white">Recent Documents</h2>
              <Link to="/library" className="text-sm text-brand hover:text-brand-light transition">View All</Link>
            </div>
            
            {loadingDocs ? (
              <div className="text-sm text-gray-500 py-4">Loading your recent files...</div>
            ) : recentDocs.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {recentDocs.map((doc) => (
                  <Link
                    key={doc.id}
                    to={`/document/${doc.id}`}
                    className="bg-cardBg rounded-none border border-borderDark p-4 hover:border-brand/50 hover:bg-cardHover transition flex items-start gap-3 group"
                  >
                    <div className="w-10 h-10 rounded-none bg-white/5 flex items-center justify-center text-brand flex-shrink-0 group-hover:bg-brand/10 transition">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white truncate group-hover:text-brand-light transition">{doc.filename}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(doc.upload_date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="bg-cardBg border border-borderDark border-dashed p-8 text-center">
                <p className="text-sm text-gray-400">No documents yet. Upload a file to get started.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <PasteTextModal isOpen={isTextModalOpen} onClose={closeTextModal} initialText={textModalInitial} />
      <PasteLinkModal isOpen={isLinkModalOpen} onClose={() => setIsLinkModalOpen(false)} />

    </div>
  );
}
