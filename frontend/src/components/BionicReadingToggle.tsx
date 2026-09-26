import { Type } from 'lucide-react';
import { useBionicReading } from '../hooks/useBionicReading';

interface BionicReadingToggleProps {
  className?: string;
  showLabel?: boolean;
}

/** Compact global toggle — visible without opening the full settings panel. */
export default function BionicReadingToggle({ className = '', showLabel = false }: BionicReadingToggleProps) {
  const { enabled, toggle } = useBionicReading();

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={enabled}
      aria-label={enabled ? 'Disable bionic reading' : 'Enable bionic reading'}
      className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition ${
        enabled
          ? 'bg-brand/20 text-brand'
          : 'bg-white/5 text-gray-400 hover:text-gray-200 hover:bg-white/10'
      } ${className}`}
    >
      <Type className="w-4 h-4 shrink-0" />
      {showLabel && <span>Bionic</span>}
    </button>
  );
}
