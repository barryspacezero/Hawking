import { Play } from 'lucide-react';
import { useReader } from '../context/ReaderContext';
import { useBionicReading } from '../hooks/useBionicReading';
import { buildTextTokens, type WordTimestamp } from '../utils/textHighlight';
import { BionicPlainText } from '../utils/bionicTextRender';

export interface ReaderBlock {
  id: number;
  block_index: number;
  page_number: number | null;
  text: string;
  audio_status: string;
  word_timestamps: string | null;
  text_spans?: string | null;
}

interface TextViewReaderProps {
  blocks: ReaderBlock[];
  onBlockClick: (blockId: number, isPlayable: boolean) => void;
}

export default function TextViewReader({ blocks, onBlockClick }: TextViewReaderProps) {
  const { fontSize, fontFamily, layout, activeBlockId, currentTime } = useReader();
  const { enabled: bionicReading } = useBionicReading();

  return (
    <div
      className="mx-auto px-6 md:px-12 py-6 transition-all duration-300 ease-in-out"
      style={{
        maxWidth: layout === 'single' ? '700px' : '900px',
        fontFamily,
      }}
    >
      <div
        className="mb-6 rounded-xl border px-4 py-3 text-xs opacity-70"
        style={{ borderColor: 'var(--player-border)', color: 'var(--reader-text)' }}
      >
        Extracted text used for text-to-speech. This is the verbatim source text — not a summary or rewrite.
      </div>

      {blocks.length === 0 ? (
        <p className="opacity-50 italic text-center">No readable text found in this document.</p>
      ) : (
        <div className="space-y-6">
          {blocks.map((block, blockIdx) => {
            const prevPage = blockIdx > 0 ? blocks[blockIdx - 1].page_number : null;
            const showPageHeader = block.page_number != null && block.page_number !== prevPage;
            const isPlayable = block.audio_status === 'done';
            const isActive = activeBlockId === block.id;

            let content = (
              <p className="whitespace-pre-wrap">
                <BionicPlainText text={block.text} enabled={bionicReading} />
              </p>
            );

            if (isActive && block.word_timestamps) {
              try {
                const whisperWords: WordTimestamp[] = JSON.parse(block.word_timestamps);
                const tokens = buildTextTokens(block.text, whisperWords);

                content = (
                  <p className="whitespace-pre-wrap">
                    {tokens.map((token, idx) => {
                      if (token.type === 'sep') {
                        return <span key={idx}>{token.text}</span>;
                      }
                      const isWordActive = currentTime >= token.start && currentTime <= token.end;
                      return (
                        <span
                          key={idx}
                          className={`transition-colors duration-75 ${
                            isWordActive ? 'bg-brand/20 text-brand rounded-sm' : ''
                          }`}
                        >
                          {token.text}
                        </span>
                      );
                    })}
                  </p>
                );
              } catch {
                // fallback to plain text
              }
            }

            return (
              <div key={block.id}>
                {showPageHeader && (
                  <div
                    className="flex items-center gap-3 mb-4 pt-2"
                    style={{ color: 'var(--reader-text)' }}
                  >
                    <div className="h-px flex-1 opacity-20 bg-current" />
                    <span className="text-xs font-bold uppercase tracking-widest opacity-50">
                      Page {block.page_number}
                    </span>
                    <div className="h-px flex-1 opacity-20 bg-current" />
                  </div>
                )}
                <div
                  id={`block-${block.id}`}
                  onClick={() => onBlockClick(block.id, isPlayable)}
                  className={`
                    relative group rounded-xl p-4 -mx-4 transition-all duration-300 cursor-pointer
                    ${isActive ? 'ring-2 ring-brand/30' : ''}
                    ${isPlayable ? 'hover:bg-black/5' : 'opacity-60 cursor-not-allowed'}
                  `}
                  style={{
                    backgroundColor: isActive ? 'var(--reader-highlight)' : 'transparent',
                    fontSize: `${fontSize}px`,
                    lineHeight: '1.6',
                  }}
                >
                  {block.page_number && (
                    <div className="absolute -left-12 top-4 hidden lg:block text-xs font-semibold uppercase tracking-wider opacity-30 select-none">
                      P{block.page_number}
                    </div>
                  )}
                  {isPlayable && !isActive && (
                    <div className="absolute -left-12 top-1/2 -translate-y-1/2 hidden lg:flex items-center justify-center w-8 h-8 rounded-full bg-brand/20 text-brand opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play className="w-4 h-4 ml-0.5" />
                    </div>
                  )}
                  {content}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
