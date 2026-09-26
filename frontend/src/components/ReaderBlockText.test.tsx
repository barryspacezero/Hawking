import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BIONIC_REMAINDER_OPACITY } from '../utils/bionicTextRender';
import { ReaderBlockText } from './ReaderBlockText';

function boldWeight(el: Element): string {
  return window.getComputedStyle(el).fontWeight;
}

function isBoldWeight(weight: string): boolean {
  return weight === '700' || weight === 'bold';
}

function parseOpacity(value: string): number {
  return Number.parseFloat(value);
}

describe('ReaderBlockText bionic reading', () => {
  it('renders bold segments with font-weight 700 when bionic is enabled (idle block)', () => {
    render(
      <ReaderBlockText
        text="Hello reading world"
        wordTimestamps={null}
        currentTime={0}
        isActive={false}
        bionicEnabled={true}
      />,
    );

    const boldSpans = document.querySelectorAll('.font-bold');
    expect(boldSpans.length).toBeGreaterThan(0);

    for (const span of boldSpans) {
      expect(isBoldWeight(boldWeight(span))).toBe(true);
    }

    const helloBold = Array.from(boldSpans).find((el) => el.textContent === 'Hel');
    expect(helloBold).toBeTruthy();
    expect(helloBold?.textContent).toBe('Hel');

    const remainderSpans = document.querySelectorAll('.bionic-remainder');
    expect(remainderSpans.length).toBeGreaterThan(0);
    for (const span of remainderSpans) {
      const opacity = parseOpacity(window.getComputedStyle(span).opacity);
      expect(opacity).toBeLessThan(1);
      expect(opacity).toBeCloseTo(BIONIC_REMAINDER_OPACITY, 2);
    }
    for (const span of boldSpans) {
      expect(parseOpacity(window.getComputedStyle(span).opacity)).toBe(1);
    }
  });

  it('does not render bold segments when bionic is disabled', () => {
    render(
      <ReaderBlockText
        text="Hello reading world"
        wordTimestamps={null}
        currentTime={0}
        isActive={false}
        bionicEnabled={false}
      />,
    );

    expect(document.querySelectorAll('.font-bold').length).toBe(0);
  });

  it('layers bionic bold inside highlight spans during active playback', () => {
    const wordTimestamps = JSON.stringify([
      { word: 'Hello', start: 0, end: 0.4 },
      { word: 'reading', start: 0.4, end: 0.9 },
      { word: 'world', start: 0.9, end: 1.2 },
    ]);

    render(
      <ReaderBlockText
        text="Hello reading world"
        wordTimestamps={wordTimestamps}
        currentTime={0.5}
        isActive={true}
        bionicEnabled={true}
      />,
    );

    const boldSpans = document.querySelectorAll('.font-bold');
    expect(boldSpans.length).toBeGreaterThan(0);

    for (const span of boldSpans) {
      expect(isBoldWeight(boldWeight(span))).toBe(true);
    }

    const readingBold = Array.from(boldSpans).find((el) => el.textContent === 'read');
    expect(readingBold).toBeTruthy();
  });
});

