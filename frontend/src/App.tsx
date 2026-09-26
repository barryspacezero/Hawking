import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import DocumentLibrary from './pages/DocumentLibrary';
import DocumentUpload from './pages/DocumentUpload';

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
      <div className="h-screen flex bg-mainBg overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/library" element={<DocumentLibrary />} />
            <Route path="/library/folder/:folderId" element={<DocumentLibrary />} />
            <Route path="/upload" element={<DocumentUpload />} />
            {/* /document/:id — document reader, coming in a later commit */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
