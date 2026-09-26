import { X, Check } from 'lucide-react';

interface VoiceSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentVoice: string;
  onSelectVoice: (voice: string) => void;
}

export default function VoiceSwitcherModal({ isOpen, onClose, currentVoice, onSelectVoice }: VoiceSwitcherModalProps) {
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div 
          className="w-full max-w-sm rounded-2xl p-6 pointer-events-auto shadow-2xl"
          style={{ backgroundColor: 'var(--player-bg)', color: 'var(--reader-text)', border: '1px solid var(--player-border)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Voice Model</h2>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-black/10 transition">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
            
            <div className="text-xs font-bold uppercase tracking-wider opacity-50 mt-2 mb-1">Standard (Robotic)</div>
            <button
              onClick={() => { onSelectVoice('gtts'); onClose(); }}
              className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition ${currentVoice === 'gtts' ? 'border-brand bg-brand/10' : 'border-transparent bg-black/5 hover:bg-black/10'}`}
            >
              <div className="text-left">
                <div className="font-semibold text-sm">Google TTS (Female)</div>
                <div className="text-xs opacity-70">Classic synthetic assistant.</div>
              </div>
              {currentVoice === 'gtts' && <Check className="w-5 h-5 text-brand" />}
            </button>

            <div className="text-xs font-bold uppercase tracking-wider opacity-50 mt-4 mb-1">Premium (Human-Like AI)</div>
            <button
              onClick={() => { onSelectVoice('kokoro_female_1'); onClose(); }}
              className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition ${currentVoice === 'kokoro_female_1' ? 'border-brand bg-brand/10' : 'border-transparent bg-black/5 hover:bg-black/10'}`}
            >
              <div className="text-left">
                <div className="font-semibold text-sm">Heart (Female)</div>
                <div className="text-xs opacity-70">Warm and expressive.</div>
              </div>
              {currentVoice === 'kokoro_female_1' && <Check className="w-5 h-5 text-brand" />}
            </button>

            <button
              onClick={() => { onSelectVoice('kokoro_female_2'); onClose(); }}
              className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition ${currentVoice === 'kokoro_female_2' ? 'border-brand bg-brand/10' : 'border-transparent bg-black/5 hover:bg-black/10'}`}
            >
              <div className="text-left">
                <div className="font-semibold text-sm">Bella (Female)</div>
                <div className="text-xs opacity-70">Soft and natural.</div>
              </div>
              {currentVoice === 'kokoro_female_2' && <Check className="w-5 h-5 text-brand" />}
            </button>

            <button
              onClick={() => { onSelectVoice('kokoro_male_1'); onClose(); }}
              className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition ${currentVoice === 'kokoro_male_1' ? 'border-brand bg-brand/10' : 'border-transparent bg-black/5 hover:bg-black/10'}`}
            >
              <div className="text-left">
                <div className="font-semibold text-sm">Michael (Male)</div>
                <div className="text-xs opacity-70">Deep and authoritative.</div>
              </div>
              {currentVoice === 'kokoro_male_1' && <Check className="w-5 h-5 text-brand" />}
            </button>

            <button
              onClick={() => { onSelectVoice('kokoro_male_2'); onClose(); }}
              className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition ${currentVoice === 'kokoro_male_2' ? 'border-brand bg-brand/10' : 'border-transparent bg-black/5 hover:bg-black/10'}`}
            >
              <div className="text-left">
                <div className="font-semibold text-sm">Adam (Male)</div>
                <div className="text-xs opacity-70">Clear and engaging.</div>
              </div>
              {currentVoice === 'kokoro_male_2' && <Check className="w-5 h-5 text-brand" />}
            </button>

          </div>
          
          <p className="mt-6 text-xs opacity-60 text-center leading-relaxed">
            Changing the voice model will regenerate the audio for the entire document.
          </p>
        </div>
      </div>
    </>
  );
}
