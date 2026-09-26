import { useEffect, useMemo, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { useReader } from '../context/ReaderContext';
import {
  getActivePdfHighlights,
  pdfSpanToPercent,
  type PdfSpanData,
  type WordTimestamp,
} from '../utils/textHighlight';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/legacy/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

import type { ReaderBlock } from './TextViewReader';

interface PdfDocumentViewerProps {
  documentId: number;
  blocks: ReaderBlock[];
  pageCount: number;
}

export default function PdfDocumentViewer({ documentId, blocks, pageCount }: PdfDocumentViewerProps) {
  const { activeBlockId, currentTime, pdfScale, setPdfScale } = useReader();
  const [numPages, setNumPages] = useState(pageCount);
  const [manualPage, setManualPage] = useState<number | null>(null);

  const sourceUrl = `${API_URL}/documents/${documentId}/source`;

  const blocksByPage = useMemo(() => {
    const map = new Map<number, ReaderBlock>();
    for (const block of blocks) {
      if (block.page_number != null) {
        map.set(block.page_number, block);
      }
    }
    return map;
  }, [blocks]);

  const activeBlock = useMemo(
    () => blocks.find((b) => b.id === activeBlockId) ?? null,
    [blocks, activeBlockId],
  );

  const activePage = manualPage ?? activeBlock?.page_number ?? 1;

  const highlights = useMemo(() => {
    if (!activeBlock || activeBlock.page_number !== activePage) return [];
    if (!activeBlock.word_timestamps || !activeBlock.text_spans) return [];
    try {
      const timestamps: WordTimestamp[] = JSON.parse(activeBlock.word_timestamps);
      const spanData: PdfSpanData = JSON.parse(activeBlock.text_spans);
      return getActivePdfHighlights(activeBlock.text, timestamps, spanData, currentTime);
    } catch {
      return [];
    }
  }, [activeBlock, activePage, currentTime]);

  const pageSpanData: PdfSpanData | null = useMemo(() => {
    const blockForPage = blocksByPage.get(activePage);
    const rawSpans =
      activeBlock?.page_number === activePage && activeBlock.text_spans
        ? activeBlock.text_spans
        : blockForPage?.text_spans;
    if (!rawSpans) return null;
    try {
      return JSON.parse(rawSpans);
    } catch {
      return null;
    }
  }, [activeBlock, activePage, blocksByPage]);

  useEffect(() => {
    setManualPage(null);
  }, [activeBlockId]);

  const goToPage = (page: number) => {
    const clamped = Math.max(1, Math.min(page, numPages));
    setManualPage(clamped);
  };

  const baseWidth = 680;

  return (
    <div className="flex flex-col h-full min-h-[60vh]">
      <div
        className="sticky top-[52px] z-20 flex items-center justify-between gap-3 px-4 py-2 border-b"
        style={{ backgroundColor: 'var(--player-bg)', borderColor: 'var(--player-border)' }}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={() => goToPage(activePage - 1)}
            disabled={activePage <= 1}
            className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-30 transition"
            style={{ color: 'var(--reader-text)' }}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm tabular-nums" style={{ color: 'var(--reader-text)' }}>
            Page {activePage} / {numPages}
          </span>
          <button
            onClick={() => goToPage(activePage + 1)}
            disabled={activePage >= numPages}
            className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-30 transition"
            style={{ color: 'var(--reader-text)' }}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setPdfScale(Math.max(0.5, pdfScale - 0.1))}
            className="p-2 rounded-lg hover:bg-white/10 transition"
            style={{ color: 'var(--reader-text)' }}
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs w-10 text-center tabular-nums" style={{ color: 'var(--reader-text)' }}>
            {Math.round(pdfScale * 100)}%
          </span>
          <button
            onClick={() => setPdfScale(Math.min(2.5, pdfScale + 0.1))}
            className="p-2 rounded-lg hover:bg-white/10 transition"
            style={{ color: 'var(--reader-text)' }}
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-cardHover py-6 px-4">
        <Document
          file={sourceUrl}
          onLoadSuccess={({ numPages: n }) => setNumPages(n)}
          loading={<div className="text-center py-20 text-gray-400">Loading PDF...</div>}
          error={<div className="text-center py-20 text-red-400">Failed to load PDF document.</div>}
          className="flex flex-col items-center"
        >
          <div
            className={`relative shadow-2xl rounded-sm overflow-hidden transition ring-2 ${
              activeBlockId ? 'ring-brand/60' : 'ring-transparent'
            }`}
          >
            <Page
              key={activePage}
              pageNumber={activePage}
              width={baseWidth * pdfScale}
              renderTextLayer={true}
              renderAnnotationLayer={true}
              loading={<div className="text-center py-20 text-gray-400 w-[680px]">Rendering page...</div>}
            />
            {pageSpanData && highlights.length > 0 && (
              <div className="absolute inset-0 pointer-events-none">
                {highlights.map((span, idx) => {
                  const pct = pdfSpanToPercent(
                    span,
                    pageSpanData.page_width,
                    pageSpanData.page_height,
                  );
                  return (
                    <div
                      key={idx}
                      className="absolute bg-yellow-400/50 rounded-sm transition-all duration-75"
                      style={{
                        left: `${pct.left}%`,
                        top: `${pct.top}%`,
                        width: `${pct.width}%`,
                        height: `${pct.height}%`,
                      }}
                    />
                  );
                })}
              </div>
            )}
            <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded">
              {activePage}
            </div>
          </div>
        </Document>
      </div>
    </div>
  );
}
