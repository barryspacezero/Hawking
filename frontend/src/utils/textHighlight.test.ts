import { describe, expect, it } from 'vitest';
import {
  alignmentTokensMatch,
  assignWordTimestamps,
  buildTextTokens,
  compoundTextMatchLength,
  getActiveWordIndex,
  isTokenActiveAtTime,
} from './textHighlight';

describe('alignmentTokensMatch', () => {
  it('matches number words to digits', () => {
    expect(alignmentTokensMatch('one', '1')).toBe(true);
    expect(alignmentTokensMatch('two', '2')).toBe(true);
  });
});

describe('assignWordTimestamps', () => {
  it('maps number words to digit whisper tokens without shifting later words', () => {
    const text = 'Baseline test paragraph one for TTS validation.'.split(/\s+/).filter(Boolean);
    const whisper = [
      { word: 'baseline', start: 0, end: 0.7 },
      { word: 'test', start: 0.7, end: 1.24 },
      { word: 'paragraph', start: 1.24, end: 1.76 },
      { word: '1', start: 1.76, end: 2.18 },
      { word: 'for', start: 2.18, end: 2.56 },
      { word: 'TTS', start: 2.56, end: 2.96 },
      { word: 'validation', start: 2.96, end: 3.52 },
    ];

    const assigned = assignWordTimestamps(text, whisper);
    expect(assigned[3]).toEqual({ start: 1.76, end: 2.18 });
    expect(assigned[4]).toEqual({ start: 2.18, end: 2.56 });
  });

  it('joins compound text words for merged whisper tokens', () => {
    const text = ['queue', 'test', 'B'];
    const len = compoundTextMatchLength(text, 0, 'QTestB.');
    expect(len).toBe(3);
  });
});

describe('buildTextTokens + getActiveWordIndex', () => {
  const blockText = 'Baseline test paragraph one for TTS validation.';
  const whisper = [
    { word: 'baseline', start: 0, end: 0.7 },
    { word: 'test', start: 0.7, end: 1.24 },
    { word: 'paragraph', start: 1.24, end: 1.76 },
    { word: '1', start: 1.76, end: 2.18 },
    { word: 'for', start: 2.18, end: 2.56 },
    { word: 'TTS', start: 2.56, end: 2.96 },
    { word: 'validation', start: 2.96, end: 3.52 },
  ];

  it('highlights the spoken word at representative playback times', () => {
    const tokens = buildTextTokens(blockText, whisper);
    const cases: Array<[number, string]> = [
      [0.5, 'Baseline'],
      [1.0, 'test'],
      [1.5, 'paragraph'],
      [2.0, 'one'],
      [2.5, 'for'],
      [3.0, 'validation'],
    ];

    for (const [time, expectedWord] of cases) {
      const idx = getActiveWordIndex(tokens, time);
      expect(tokens[idx]?.text).toBe(expectedWord);
    }
  });

  it('does not double-highlight at shared boundaries', () => {
    const tokens = buildTextTokens(blockText, whisper);
    const atBoundary = getActiveWordIndex(tokens, 0.7);
    expect(tokens[atBoundary]?.text).toBe('test');
  });
});

describe('isTokenActiveAtTime', () => {
  it('uses half-open intervals except for the final word', () => {
    const word = { type: 'word' as const, text: 'test', start: 0.7, end: 1.24 };
    expect(isTokenActiveAtTime(word, 0.7, false)).toBe(true);
    expect(isTokenActiveAtTime(word, 1.24, false)).toBe(false);
    expect(isTokenActiveAtTime(word, 1.24, true)).toBe(true);
  });
});

