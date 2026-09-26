import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ReaderProvider } from './context/ReaderContext';
import Sidebar from './components/Sidebar';
import DocumentLibrary from './pages/DocumentLibrary';
import DocumentUpload from './pages/DocumentUpload';
import DocumentDetail from './pages/DocumentDetail';
import VoiceClone from './pages/VoiceClone';

function Home() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-3">Hawking</h1>
        <p className="text-textMuted text-lg">Your documents, read aloud.</p>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <ReaderProvider>
        <div className="h-screen flex bg-mainBg overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/library" element={<DocumentLibrary />} />
              <Route path="/library/folder/:folderId" element={<DocumentLibrary />} />
              <Route path="/upload" element={<DocumentUpload />} />
              <Route path="/documents/:id" element={<DocumentDetail />} />
              <Route path="/voice-clone" element={<VoiceClone />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </ReaderProvider>
    </Router>
  );
}

export default App;
