import { BookOpen, FileText } from 'lucide-react';
import { useReader, type ReaderViewMode } from '../context/ReaderContext';

interface ReaderViewToggleProps {
  hasOriginalSource: boolean;
}

export default function ReaderViewToggle({ hasOriginalSource }: ReaderViewToggleProps) {
  const { readerViewMode, setReaderViewMode } = useReader();

  const modes: { id: ReaderViewMode; label: string; icon: typeof BookOpen }[] = [
    { id: 'original', label: 'Original', icon: BookOpen },
    { id: 'text', label: 'Text View', icon: FileText },
  ];

  return (
    <div className="flex bg-black/30 rounded-full p-1 border border-white/10">
      {modes.map((mode) => {
        const disabled = mode.id === 'original' && !hasOriginalSource;
        const isActive = readerViewMode === mode.id;
        return (
          <button
            key={mode.id}
            onClick={() => !disabled && setReaderViewMode(mode.id)}
            disabled={disabled}
            title={disabled ? 'Original file not available for this document' : mode.label}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition ${
              isActive
                ? 'bg-white/15 text-white'
                : disabled
                  ? 'text-gray-600 cursor-not-allowed'
                  : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <mode.icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{mode.label}</span>
          </button>
        );
      })}
    </div>
  );
}
