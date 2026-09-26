import { Link } from 'react-router-dom';
import { Play, Headphones, Brain, Eye, Sparkles } from 'lucide-react';
import AsciiBackground from '../components/AsciiBackground';

export default function Landing() {
  return (
    <div className="min-h-screen bg-mainBg text-gray-300 pb-24 relative overflow-hidden">      <AsciiBackground />
      {/* Top Navigation */}
      <nav className="flex items-center justify-between px-8 py-6 border-b border-borderDark/50 bg-mainBg/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 flex items-center justify-center bg-brand/10 text-brand rounded-none border border-brand/20">
            <Headphones className="w-4 h-4" />
          </div>
          <span className="text-xl font-extrabold text-white tracking-wide">Hawking <span className="text-[10px] uppercase tracking-widest text-brand border border-brand/30 px-1.5 py-0.5 ml-2 rounded-none bg-brand/5">Pre-Release</span></span>
        </div>
        <div className="flex items-center space-x-6 text-sm font-medium">
          <a href="https://github.com/barryspacezero/Hawking" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition">GitHub</a>
          <Link to="/auth" className="text-brand hover:text-brand-light transition">Login</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-8 pt-20 relative z-10">
        <div className="flex flex-col lg:flex-row gap-16 lg:gap-24 mb-24">
          
          {/* Left: Copy & CTA */}
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-6 flex items-center space-x-2">
              <span className="text-brand">ADHD</span>
              <span className="w-1 h-1 rounded-none bg-borderDark"></span>
              <span className="text-brand">Dyslexia</span>
              <span className="w-1 h-1 rounded-none bg-borderDark"></span>
              <span className="text-brand">Autism</span>
            </div>
            
            <h1 className="text-5xl lg:text-7xl font-extrabold text-white leading-[1.1] mb-8">
              Reading,<br />reimagined for<br />every mind.
            </h1>
            
            <p className="text-base lg:text-lg text-gray-400 leading-relaxed mb-8 max-w-lg">
              Traditional reading formats can be overwhelming for children with ADHD, Dyslexia, and Autism. Hawking transforms dense texts into multi-sensory experiences.
              <br /><br />
              <strong className="text-gray-200 font-medium">Combine Bionic Reading visual anchors with ultra-realistic AI voices to regain focus and comprehension.</strong>
            </p>

            <Link 
              to="/auth"
              className="inline-flex flex-col items-center justify-center bg-brand hover:bg-brand-hover text-white px-8 py-4 rounded-none font-bold transition group mb-4 w-full sm:w-auto min-w-[280px] border border-brand-light/50"
            >
              <div className="flex items-center space-x-2">
                <Play className="w-5 h-5 fill-white" />
                <span className="text-base">Start Listening for Free</span>
              </div>
              <span className="text-[11px] opacity-70 mt-1 font-mono uppercase tracking-wider">Web, Windows, macOS</span>
            </Link>

            <div className="flex items-center space-x-4 text-xs font-mono text-gray-500 mt-4">
              <span>v1.0.0-rc.10</span>
              <span>·</span>
              <span>Built for Neurodiversity</span>
              <span>·</span>
              <Link to="/auth" className="text-brand hover:underline">View demo</Link>
            </div>
          </div>

          {/* Right: What's New Panel */}
          <div className="w-full lg:w-[420px] shrink-0">
            <div className="bg-cardBg border border-borderDark rounded-none p-6">
              <div className="flex items-center justify-between mb-8">
                <h3 className="font-bold text-white uppercase tracking-wider text-sm">Our Core Features</h3>
                <span className="text-[10px] font-mono text-brand">v1.0.0</span>
              </div>

              <div className="space-y-8 relative before:absolute before:inset-0 before:ml-[5px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-borderDark before:to-transparent hidden-timeline-line">
                {/* Timeline Item 1 */}
                <div className="relative border-l border-borderDark pl-6 pb-2">
                  <div className="absolute w-2 h-2 bg-brand rounded-none -left-[4.5px] top-1.5 shadow-[0_0_8px_rgba(234,88,12,0.5)]"></div>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-[10px] uppercase font-bold text-white bg-brand px-1.5 py-0.5 rounded-none">Focus</span>
                    <h4 className="text-sm font-bold text-white">Bionic Reading Engine</h4>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Automatically bolds the first few letters of every word, creating visual anchors that guide eyes seamlessly through the text. Proven to reduce eye strain and improve reading speed for ADHD.
                  </p>
                </div>

                {/* Timeline Item 2 */}
                <div className="relative border-l border-borderDark pl-6 pb-2">
                  <div className="absolute w-2 h-2 bg-brand rounded-none -left-[4.5px] top-1.5 shadow-[0_0_8px_rgba(234,88,12,0.5)]"></div>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-[10px] uppercase font-bold text-white bg-brand px-1.5 py-0.5 rounded-none">Audio</span>
                    <h4 className="text-sm font-bold text-white">Familiar AI Voices</h4>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Children learn best when they feel safe. Clone the voice of a parent, teacher, or familiar narrator with just 30 seconds of audio.
                  </p>
                </div>
                
                {/* Timeline Item 3 */}
                <div className="relative border-l border-borderDark pl-6 pb-2">
                  <div className="absolute w-2 h-2 bg-emerald-500 rounded-none -left-[4.5px] top-1.5"></div>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-[10px] uppercase font-bold text-emerald-950 bg-emerald-500 px-1.5 py-0.5 rounded-none">Sensory</span>
                    <h4 className="text-sm font-bold text-white">Calm, Minimal UI</h4>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Designed with an ultra-flat, distraction-free interface to prevent sensory overload and cognitive fatigue.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Grid Table */}
        <div className="mb-24">
          <div className="flex items-end space-x-4 mb-6">
            <h2 className="text-2xl font-bold text-white">Accessibility First</h2>
            <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest pb-1">Built to empower</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-cardBg border border-borderDark rounded-none p-6">
              <div className="w-10 h-10 bg-brand/10 text-brand flex items-center justify-center mb-4 border border-brand/20">
                <Brain className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white mb-2">ADHD Friendly</h3>
              <p className="text-xs text-gray-400 leading-relaxed">Audio pacing controls and bionic visual anchors ensure that wandering minds stay tethered to the content.</p>
            </div>
            
            <div className="bg-cardBg border border-borderDark rounded-none p-6">
              <div className="w-10 h-10 bg-brand/10 text-brand flex items-center justify-center mb-4 border border-brand/20">
                <Eye className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white mb-2">Dyslexia Support</h3>
              <p className="text-xs text-gray-400 leading-relaxed">By simultaneously highlighting text while playing natural audio, users can associate visual words with sounds.</p>
            </div>
            
            <div className="bg-cardBg border border-borderDark rounded-none p-6">
              <div className="w-10 h-10 bg-brand/10 text-brand flex items-center justify-center mb-4 border border-brand/20">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white mb-2">Autism & Sensory</h3>
              <p className="text-xs text-gray-400 leading-relaxed">A strictly flat, dark aesthetic with zero popups or disruptive animations prevents sensory overload and frustration.</p>
            </div>
          </div>
        </div>

        {/* FAQs */}
        <div className="mb-24">
          <h2 className="text-2xl font-bold text-white mb-6">Frequently Asked Questions</h2>
          <div className="border border-borderDark rounded-none divide-y divide-borderDark bg-cardBg">
            <div className="p-5">
              <h4 className="text-sm font-bold text-white mb-1 flex items-center justify-between">
                Is this suitable for young children?
                <span className="text-brand font-mono">-</span>
              </h4>
              <p className="text-xs text-gray-400 leading-relaxed mt-4 max-w-3xl">
                Absolutely. Hawking was built specifically to help young learners who struggle with traditional reading methods. The interface is designed to be completely intuitive.
              </p>
            </div>
            <div className="p-5 flex items-center justify-between cursor-pointer hover:bg-cardHover transition">
              <div>
                <h4 className="text-sm font-bold text-white mb-1">What file formats are supported?</h4>
                <p className="text-[10px] text-gray-500 font-mono">PDF, DOCX, TXT, EPUB.</p>
              </div>
              <span className="text-gray-500 font-mono">+</span>
            </div>
            <div className="p-5 flex items-center justify-between cursor-pointer hover:bg-cardHover transition">
              <div>
                <h4 className="text-sm font-bold text-white mb-1">Can I clone a parent's voice?</h4>
                <p className="text-[10px] text-gray-500 font-mono">Yes, 30s of clear audio is required to generate a safe, familiar voice.</p>
              </div>
              <span className="text-gray-500 font-mono">+</span>
            </div>
          </div>
        </div>

        {/* Footer / Community */}
        <div className="border-t border-borderDark pt-12">
          <h2 className="text-xl font-bold text-white mb-4">Support our mission</h2>
          <p className="text-xs text-gray-400 leading-relaxed max-w-2xl mb-8">
            Hawking is built to democratize accessible learning for neurodivergent children. Maintaining GPU infrastructure for high-fidelity AI voices is resource-intensive.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-24">
            <div className="border border-borderDark bg-cardBg p-5 rounded-none hover:border-brand/30 transition cursor-pointer group">
              <h4 className="text-sm font-bold text-white mb-2 group-hover:text-brand transition">Sponsor the Project</h4>
              <p className="text-[10px] text-gray-500 font-mono">Helps keep the servers running for kids who need it.</p>
            </div>
            <div className="border border-borderDark bg-cardBg p-5 rounded-none hover:border-brand/30 transition cursor-pointer group">
              <h4 className="text-sm font-bold text-white mb-2 group-hover:text-brand transition">Share with Schools</h4>
              <p className="text-[10px] text-gray-500 font-mono">Introduce Hawking to special education teachers.</p>
            </div>
            <div className="border border-borderDark bg-cardBg p-5 rounded-none hover:border-brand/30 transition cursor-pointer group">
              <h4 className="text-sm font-bold text-white mb-2 group-hover:text-brand transition">Report issues</h4>
              <p className="text-[10px] text-gray-500 font-mono">Help us fix bugs to improve the reading experience.</p>
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-gray-500 pb-8">
            <div className="flex items-center space-x-4">
              <span className="font-bold text-white">HAWKING</span>
              <span>v1.0.0-rc.10</span>
            </div>
            <div className="flex items-center space-x-4">
              <a href="#" className="hover:text-white transition">Source</a>
              <a href="#" className="hover:text-white transition">Privacy Policy</a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}





