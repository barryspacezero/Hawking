export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
}

export interface TextToken {
  type: 'word' | 'sep';
  text: string;
  start: number;
  end: number;
}

export interface PdfWordSpan {
  word: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface PdfSpanData {
  page_width: number;
  page_height: number;
  words: PdfWordSpan[];
}

export function buildTextTokens(blockText: string, wordTimestamps: WordTimestamp[]): TextToken[] {
  const tokens: TextToken[] = [];
  const regex = /([\w\u00C0-\u024F]+)|([^\w\u00C0-\u024F]+)/g;
  let match;
  while ((match = regex.exec(blockText)) !== null) {
    if (match[1]) {
      tokens.push({ type: 'word', text: match[1], start: 0, end: 0 });
    } else {
      tokens.push({ type: 'sep', text: match[2], start: 0, end: 0 });
    }
  }

  const wordTokens = tokens.filter((t) => t.type === 'word');
  let wIdx = 0;
  let tIdx = 0;

  while (tIdx < wordTokens.length && wIdx < wordTimestamps.length) {
    const tStr = wordTokens[tIdx].text.toLowerCase();
    const wStr = wordTimestamps[wIdx].word.toLowerCase().replace(/[^a-z0-9]/g, '');

    if (!wStr) {
      wIdx++;
      continue;
    }

    wordTokens[tIdx].start = wordTimestamps[wIdx].start;
    wordTokens[tIdx].end = wordTimestamps[wIdx].end;

    if (tStr === wStr || tStr.includes(wStr) || wStr.includes(tStr)) {
      tIdx++;
      wIdx++;
    } else {
      tIdx++;
      wIdx++;
    }
  }

  const lastTime = wordTimestamps.length > 0 ? wordTimestamps[wordTimestamps.length - 1].end : 0;
  for (; tIdx < wordTokens.length; tIdx++) {
    wordTokens[tIdx].start = lastTime;
    wordTokens[tIdx].end = lastTime;
  }

  return tokens;
}

export function getActiveWordIndex(tokens: TextToken[], currentTime: number): number {
  let wordIdx = -1;
  tokens.forEach((token, idx) => {
    if (token.type === 'word' && currentTime >= token.start && currentTime <= token.end) {
      wordIdx = idx;
    }
  });
  return wordIdx;
}

/** Map aligned text tokens to PDF word span indices for highlight overlays. */
export function getActivePdfHighlights(
  blockText: string,
  wordTimestamps: WordTimestamp[],
  spanData: PdfSpanData,
  currentTime: number,
): PdfWordSpan[] {
  const tokens = buildTextTokens(blockText, wordTimestamps);
  const activeWordIdx = getActiveWordIndex(tokens, currentTime);
  if (activeWordIdx < 0) return [];

  const wordTokenIndex = tokens
    .slice(0, activeWordIdx + 1)
    .filter((t) => t.type === 'word').length - 1;

  if (wordTokenIndex < 0 || wordTokenIndex >= spanData.words.length) return [];

  const span = spanData.words[wordTokenIndex];
  return span ? [span] : [];
}

export function pdfSpanToPercent(
  span: PdfWordSpan,
  pageWidth: number,
  pageHeight: number,
): { left: number; top: number; width: number; height: number } {
  return {
    left: (span.x0 / pageWidth) * 100,
    top: ((pageHeight - span.y1) / pageHeight) * 100,
    width: ((span.x1 - span.x0) / pageWidth) * 100,
    height: ((span.y1 - span.y0) / pageHeight) * 100,
  };
}
