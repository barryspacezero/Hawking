import { memo } from 'react';
import { BionicPlainText, renderBionicInline } from '../utils/bionicTextRender';
import { buildTextTokens, isTokenActiveAtTime, type WordTimestamp } from '../utils/textHighlight';

interface ReaderBlockTextProps {
  text: string;
  wordTimestamps: string | null;
  currentTime: number;
  isActive: boolean;
  bionicEnabled: boolean;
}

/**
 * Single shared renderer for document block text.
 * Highlighting (playback sync) and bionic bolding are independent visual layers:
 * each aligned word is wrapped in a highlight span; bionic <strong> segments
 * render inside that span. Raw block.text is never mutated.
 */
export const ReaderBlockText = memo(function ReaderBlockText({
  text,
  wordTimestamps,
  currentTime,
  isActive,
  bionicEnabled,
}: ReaderBlockTextProps) {
  if (isActive && wordTimestamps) {
    try {
      const whisperWords: WordTimestamp[] = JSON.parse(wordTimestamps);
      const tokens = buildTextTokens(text, whisperWords);
      const wordTokenIndices = tokens
        .map((token, idx) => (token.type === 'word' ? idx : -1))
        .filter((idx) => idx >= 0);
      const lastWordTokenIndex = wordTokenIndices[wordTokenIndices.length - 1] ?? -1;

      return (
        <p className="whitespace-pre-wrap">
          {tokens.map((token, idx) => {
            if (token.type === 'sep') {
              return <span key={idx}>{token.text}</span>;
            }

            const isWordActive = isTokenActiveAtTime(token, currentTime, idx === lastWordTokenIndex);
            return (
              <span
                key={idx}
                className={`transition-colors duration-75 ${
                  isWordActive ? 'bg-brand/20 text-brand rounded-none' : ''
                }`}
                aria-label={token.text}
              >
                {bionicEnabled ? (
                  <span aria-hidden="true">{renderBionicInline(token.text)}</span>
                ) : (
                  <span aria-hidden="true">{token.text}</span>
                )}
              </span>
            );
          })}
        </p>
      );
    } catch {
      // Fall through to bionic/plain path if timestamps are malformed.
    }
  }

  return (
    <p className="whitespace-pre-wrap">
      <BionicPlainText text={text} enabled={bionicEnabled} />
    </p>
  );
});

