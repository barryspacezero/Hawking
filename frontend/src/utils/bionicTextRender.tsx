import { memo, useMemo, type ReactNode } from 'react';
import { parseBionicText } from './bionicText';

/** Default remainder opacity — kept in sync with `--bionic-remainder-opacity` in index.css. */
export const BIONIC_REMAINDER_OPACITY = 0.65;

function bionicSegmentProps(bold: boolean): {
  className: string;
  style: { fontWeight?: number; opacity: number };
} {
  return bold
    ? { className: 'bionic-emphasis font-bold', style: { fontWeight: 700, opacity: 1 } }
    : { className: 'bionic-remainder', style: { opacity: BIONIC_REMAINDER_OPACITY } };
}

/** Bionic segments only — for nesting inside an outer span that owns aria-label. */
export function renderBionicInline(text: string): ReactNode {
  const parts = parseBionicText(text);
  return parts.map((part, partIndex) => {
    if (part.kind === 'whitespace') {
      return <span key={partIndex}>{part.text}</span>;
    }

    return part.segments.map((segment, segmentIndex) => (
      <span key={`${partIndex}-${segmentIndex}`} {...bionicSegmentProps(segment.bold)}>
        {segment.text}
      </span>
    ));
  });
}

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
          <span key={segmentIndex} aria-hidden="true" {...bionicSegmentProps(segment.bold)}>
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

