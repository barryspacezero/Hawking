import { useEffect, useState } from 'react';
import { FileText, AlertCircle } from 'lucide-react';
import PdfDocumentViewer from './PdfDocumentViewer';
import type { ReaderBlock } from './TextViewReader';
import { ReaderBlockText } from './ReaderBlockText';
import { useBionicReading } from '../hooks/useBionicReading';
import { useReader } from '../context/ReaderContext';
import { TEXT_PREVIEW_FILE_TYPES } from '../constants/uploads';
import { API_URL } from '../config/api';

interface OriginalDocumentViewerProps {
  documentId: number;
  fileType: string;
  sourcePath: string | null;
  pageCount: number | null;
  blocks: ReaderBlock[];
}

export default function OriginalDocumentViewer({
  documentId,
  fileType,
  sourcePath,
  pageCount,
  blocks,
}: OriginalDocumentViewerProps) {
  const [txtContent, setTxtContent] = useState<string | null>(null);
  const [txtError, setTxtError] = useState('');
  const { enabled: bionicReading } = useBionicReading();
  const { activeBlockId, currentTime, fontSize } = useReader();

  useEffect(() => {
    if (!TEXT_PREVIEW_FILE_TYPES.has(fileType) || !sourcePath) return;

    fetch(`${API_URL}/documents/${documentId}/source`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load original file');
        return res.text();
      })
      .then(setTxtContent)
      .catch((err) => setTxtError(err.message));
  }, [documentId, fileType, sourcePath]);

  if (!sourcePath) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
        <AlertCircle className="w-10 h-10 text-amber-400 mb-4" />
        <p className="text-gray-300 font-medium mb-2">Original file not available</p>
        <p className="text-sm text-gray-500 max-w-md">
          This document was created from pasted text or a link. Switch to Text View to read the extracted content.
        </p>
      </div>
    );
  }

  if (fileType === 'pdf') {
    return (
      <PdfDocumentViewer
        documentId={documentId}
        blocks={blocks}
        pageCount={pageCount ?? blocks.length}
      />
    );
  }

  if (TEXT_PREVIEW_FILE_TYPES.has(fileType)) {
    if (txtError) {
      return <div className="text-red-400 text-center py-20">{txtError}</div>;
    }
    if (!txtContent) {
      return <div className="text-gray-400 text-center py-20">Loading original document...</div>;
    }

    return (
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div
          className="rounded-none border overflow-hidden"
          style={{ borderColor: 'var(--player-border)', backgroundColor: 'var(--player-bg)' }}
        >
          <div
            className="flex items-center gap-2 px-4 py-3 border-b text-xs opacity-60"
            style={{ borderColor: 'var(--player-border)', color: 'var(--reader-text)' }}
          >
            <FileText className="w-4 h-4" />
            Original file — preserved formatting
          </div>
          <div
            className="p-6 whitespace-pre-wrap font-mono text-sm leading-relaxed overflow-x-auto"
            style={{ color: 'var(--reader-text)', fontSize: `${fontSize}px` }}
          >
            {blocks.length > 0 ? (
              <div className="space-y-4">
                {blocks.map((block) => {
                  const isActive = activeBlockId === block.id;
                  return (
                    <div
                      key={block.id}
                      id={`block-${block.id}`}
                      className={isActive ? 'ring-2 ring-brand/30 rounded-none p-2 -m-2' : undefined}
                    >
                      <ReaderBlockText
                        text={block.text}
                        wordTimestamps={block.word_timestamps}
                        currentTime={currentTime}
                        isActive={isActive}
                        bionicEnabled={bionicReading}
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <ReaderBlockText
                text={txtContent}
                wordTimestamps={null}
                currentTime={0}
                isActive={false}
                bionicEnabled={bionicReading}
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center py-20 text-gray-400">
      Original view is not supported for this file type.
    </div>
  );
}

