import { describe, expect, it } from 'vitest';
import {
  bionicBoldLength,
  parseBionicText,
  segmentsToPlainText,
  splitWordBody,
  tokenizeBionicSegments,
} from './bionicText';

describe('bionicBoldLength', () => {
  it('bolds one character for 1-2 letter words', () => {
    expect(bionicBoldLength(1)).toBe(1);
    expect(bionicBoldLength(2)).toBe(1);
  });

  it('bolds ~45% rounded up for longer words', () => {
    expect(bionicBoldLength(5)).toBe(3); // ceil(2.25)
    expect(bionicBoldLength(10)).toBe(5); // ceil(4.5)
    expect(bionicBoldLength(11)).toBe(5); // ceil(4.95)
  });
});

describe('splitWordBody', () => {
  it('splits medium and long words at the expected boundary', () => {
    const medium = splitWordBody('reading');
    expect(medium.find((s) => s.bold)?.text).toBe('read');
    expect(medium.find((s) => !s.bold)?.text).toBe('ing');

    const long = splitWordBody('understanding');
    expect(long.find((s) => s.bold)?.text).toBe('unders');
    expect(long.find((s) => !s.bold)?.text).toBe('tanding');
  });

  it('keeps hyphens with the correct side of the split', () => {
    const hyphenated = splitWordBody('well-known');
    expect(segmentsToPlainText(hyphenated)).toBe('well-known');
    expect(hyphenated.find((s) => s.bold)?.text).toBe('well-k');
    expect(hyphenated.find((s) => !s.bold)?.text).toBe('nown');
  });
});

describe('parseBionicText', () => {
  it('preserves whitespace and newlines exactly', () => {
    const input = 'Line one.\n\nLine two.\tTabbed.';
    const flat = tokenizeBionicSegments(input);
    expect(segmentsToPlainText(flat)).toBe(input);
  });

  it('bolds word cores without including attached punctuation', () => {
    const parts = parseBionicText('Hello, reading world!');
    const hello = parts.find((p) => p.kind === 'word' && p.text === 'Hello,');
    expect(hello).toBeDefined();
    if (hello?.kind === 'word') {
      expect(hello.segments[0]).toEqual({ text: 'Hel', bold: true });
      expect(hello.segments[1]).toEqual({ text: 'lo', bold: false });
      expect(hello.segments[2]).toEqual({ text: ',', bold: false });
    }

    const reading = parts.find((p) => p.kind === 'word' && p.text === 'reading');
    expect(reading).toBeDefined();
    if (reading?.kind === 'word') {
      expect(reading.segments.some((s) => s.bold && s.text === 'read')).toBe(true);
      expect(reading.segments.some((s) => !s.bold && s.text === 'ing')).toBe(true);
    }
  });

  it('handles numbers without dropping or adding characters', () => {
    const input = 'Count 42 items and 3.14 pi.';
    expect(segmentsToPlainText(tokenizeBionicSegments(input))).toBe(input);
  });

  it('reconstructed text matches the original input exactly', () => {
    const samples = [
      'A',
      'I am',
      'ADHD-friendly reading, fast!',
      'well-known self-paced 2026.',
      'Mixed: (parens) and "quotes" — dash.',
    ];
    for (const sample of samples) {
      expect(segmentsToPlainText(tokenizeBionicSegments(sample))).toBe(sample);
    }
  });
});
