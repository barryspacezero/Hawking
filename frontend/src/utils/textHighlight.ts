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

const NUMBER_TO_DIGIT: Record<string, string> = {
  zero: '0',
  one: '1',
  two: '2',
  three: '3',
  four: '4',
  five: '5',
  six: '6',
  seven: '7',
  eight: '8',
  nine: '9',
  ten: '10',
};

export function normalizeAlignmentToken(word: string): string {
  return word.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function vowellessToken(word: string): string {
  return normalizeAlignmentToken(word).replace(/[aeiou]/g, '');
}

export function alignmentTokensMatch(textWord: string, whisperWord: string): boolean {
  const a = normalizeAlignmentToken(textWord);
  const b = normalizeAlignmentToken(whisperWord);
  if (!a || !b) return false;
  if (a === b) return true;
  if (NUMBER_TO_DIGIT[a] === b || NUMBER_TO_DIGIT[b] === a) return true;
  if (a.length >= 3 && b.length >= 3 && (a.includes(b) || b.includes(a))) return true;
  return false;
}

/** How many consecutive text words concatenate to match one whisper token (e.g. queue+test+B → QTestB). */
export function compoundTextMatchLength(
  textWords: string[],
  startIndex: number,
  whisperWord: string,
  maxJoin = 4,
): number {
  const target = normalizeAlignmentToken(whisperWord);
  if (!target) return 0;

  let joined = '';
  let joinedVowelless = '';
  for (let offset = 0; offset < maxJoin && startIndex + offset < textWords.length; offset++) {
    joined += normalizeAlignmentToken(textWords[startIndex + offset]);
    joinedVowelless += vowellessToken(textWords[startIndex + offset]);
    if (joined === target || joinedVowelless === vowellessToken(whisperWord)) {
      return offset + 1;
    }
    if (!target.startsWith(joined) && !joined.startsWith(target)) {
      const vowelTarget = vowellessToken(whisperWord);
      if (!vowelTarget.startsWith(joinedVowelless) && !joinedVowelless.startsWith(vowelTarget)) {
        break;
      }
    }
  }
  return 0;
}

export function assignWordTimestamps(
  textWords: string[],
  wordTimestamps: WordTimestamp[],
): Array<{ start: number; end: number }> {
  const assigned: Array<{ start: number; end: number }> = [];
  let wIdx = 0;

  for (let tIdx = 0; tIdx < textWords.length; tIdx++) {
    if (wIdx >= wordTimestamps.length) {
      const last = wordTimestamps[wordTimestamps.length - 1]?.end ?? 0;
      assigned.push({ start: last, end: last });
      continue;
    }

    const compoundLen = compoundTextMatchLength(textWords, tIdx, wordTimestamps[wIdx].word);
    if (compoundLen > 1) {
      const ts = wordTimestamps[wIdx];
      for (let c = 0; c < compoundLen; c++) {
        assigned.push({ start: ts.start, end: ts.end });
      }
      tIdx += compoundLen - 1;
      wIdx++;
      continue;
    }

    let found = -1;
    for (let j = wIdx; j < Math.min(wIdx + 8, wordTimestamps.length); j++) {
      if (alignmentTokensMatch(textWords[tIdx], wordTimestamps[j].word)) {
        found = j;
        break;
      }
    }

    if (found >= 0) {
      assigned.push({
        start: wordTimestamps[found].start,
        end: wordTimestamps[found].end,
      });
      wIdx = found + 1;
      continue;
    }

    // No match — consume the next whisper slot but keep text order (timing is best-effort).
    assigned.push({
      start: wordTimestamps[wIdx].start,
      end: wordTimestamps[wIdx].end,
    });
    wIdx++;
  }

  return assigned;
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
  const textWords = wordTokens.map((t) => t.text);
  const assigned = assignWordTimestamps(textWords, wordTimestamps);

  for (let i = 0; i < wordTokens.length; i++) {
    wordTokens[i].start = assigned[i]?.start ?? 0;
    wordTokens[i].end = assigned[i]?.end ?? 0;
  }

  return tokens;
}

/** Half-open interval [start, end) avoids double-highlighting at word boundaries. */
export function isTokenActiveAtTime(token: TextToken, currentTime: number, isLastWord: boolean): boolean {
  if (token.type !== 'word') return false;
  if (currentTime < token.start) return false;
  if (isLastWord) return currentTime <= token.end;
  return currentTime < token.end;
}

export function getActiveWordIndex(tokens: TextToken[], currentTime: number): number {
  const wordIndices = tokens
    .map((token, idx) => ({ token, idx }))
    .filter(({ token }) => token.type === 'word');

  for (let i = 0; i < wordIndices.length; i++) {
    const { token, idx } = wordIndices[i];
    const isLast = i === wordIndices.length - 1;
    if (isTokenActiveAtTime(token, currentTime, isLast)) {
      return idx;
    }
  }
  return -1;
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

