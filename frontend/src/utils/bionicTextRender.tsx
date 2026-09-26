import { memo, useMemo, type ReactNode } from 'react';
import { parseBionicText } from './bionicText';

/** Render plain text with bionic emphasis; does not mutate the source string. */
export function renderBionicText(text: string): ReactNode {
  const parts = parseBionicText(text);
  return parts.map((part, partIndex) => {
    if (part.kind === 'whitespace') {
      return <span key={partIndex}>{part.text}</span>;
    }

    return (
      <span key={partIndex} aria-label={part.text}>
        {part.segments.map((segment, segmentIndex) => (
          <span
            key={segmentIndex}
            className={segment.bold ? 'font-bold' : undefined}
            aria-hidden="true"
          >
            {segment.text}
          </span>
        ))}
      </span>
    );
  });
}

interface BionicPlainTextProps {
  text: string;
  enabled: boolean;
}

/** Memoized wrapper — avoids recomputing bionic markup on unrelated parent re-renders. */
export const BionicPlainText = memo(function BionicPlainText({ text, enabled }: BionicPlainTextProps) {
  const content = useMemo(
    () => (enabled ? renderBionicText(text) : text),
    [text, enabled],
  );

  return <>{content}</>;
});
