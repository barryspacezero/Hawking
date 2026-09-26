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

/**
 * Aligns Whisper word timestamps to source text tokens.
 * Returns an array of tokens where each word token has start/end times
 * for real-time highlight syncing.
 */
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
    wordTokens[tIdx].start = wordTimestamps[wIdx].start;
    wordTokens[tIdx].end = wordTimestamps[wIdx].end;
    tIdx++;
    wIdx++;
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
