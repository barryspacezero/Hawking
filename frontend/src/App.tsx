import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import MobileNav from './components/MobileNav';
import { LibraryProvider } from './context/LibraryContext';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import ReaderSettingsMenu from './components/ReaderSettingsMenu';
import Dashboard from './pages/Dashboard';
import DocumentLibrary from './pages/DocumentLibrary';
import DocumentUpload from './pages/DocumentUpload';
import DocumentDetail from './pages/DocumentDetail';
import VoiceClone from './pages/VoiceClone';
import VoiceLibrary from './pages/VoiceLibrary';
import Auth from './pages/Auth';

function App() {
  return (
    <AuthProvider>
      <Router>
        <LibraryProvider>
          <ReaderSettingsMenu />
          <Routes>
            <Route path="/auth" element={<Auth />} />

            <Route
              element={
                <div className="h-screen flex flex-col lg:flex-row bg-mainBg overflow-hidden">
                  <MobileNav />
                  <Sidebar />
                  <main className="flex-1 overflow-y-auto min-w-0">
                    <ProtectedRoute />
                  </main>
                </div>
              }
            >
              <Route path="/" element={<Dashboard />} />
              <Route path="/library" element={<DocumentLibrary />} />
              <Route path="/library/folder/:folderId" element={<DocumentLibrary />} />
              <Route path="/upload" element={<DocumentUpload />} />
              <Route path="/document/:id" element={<DocumentDetail />} />
              <Route path="/voice-clone" element={<VoiceClone />} />
              <Route path="/voice-library" element={<VoiceLibrary />} />
            </Route>
          </Routes>
        </LibraryProvider>
      </Router>
    </AuthProvider>
  );
}

export default App;

