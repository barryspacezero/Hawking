import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'

// Placeholder pages — to be built out in subsequent commits
function Home() {
  return (
    <div className="flex items-center justify-center h-screen bg-mainBg">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-3">Hawking</h1>
        <p className="text-textMuted text-lg">Your documents, read aloud.</p>
      </div>
    </div>
  )
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

export default App
