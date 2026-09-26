/**
 * Pure bionic-reading transform — no React, no string mutation.
 *
 * Returns display segments `{ text, bold }` that concatenate back to the
 * original input exactly. Bold length is based on alphanumeric characters
 * only; attached punctuation is preserved outside the bold calculation.
 */

export interface BionicSegment {
  text: string;
  bold: boolean;
}

export type BionicDisplayPart =
  | { kind: 'whitespace'; text: string }
  | { kind: 'word'; text: string; segments: BionicSegment[] };

const WORD_CHUNK_RE = /(\s+)|([^\s]+)/g;

/** Letters and digits — mirrors textHighlight's Latin supplement range plus ASCII. */
const ALNUM_RE = /[A-Za-z0-9\u00C0-\u024F]/;
const BODY_RE = /^([^A-Za-z0-9\u00C0-\u024F]*)([A-Za-z0-9\u00C0-\u024F][A-Za-z0-9\u00C0-\u024F.-]*[A-Za-z0-9\u00C0-\u024F]|[A-Za-z0-9\u00C0-\u024F])([^A-Za-z0-9\u00C0-\u024F]*)$/;

export function countAlphanumeric(value: string): number {
  let count = 0;
  for (const char of value) {
    if (ALNUM_RE.test(char)) count += 1;
  }
  return count;
}

/**
 * How many leading alphanumeric characters to bold (~45%, rounded up).
 * 1-letter words: bold the single anchor; 2-letter: bold 1; longer: ceil(45%).
 */
export function bionicBoldLength(letterCount: number): number {
  if (letterCount <= 0) return 0;
  if (letterCount <= 2) return 1;
  return Math.ceil(letterCount * 0.45);
}

/** Split a word body (no attached punctuation) into bold / normal segments. */
export function splitWordBody(body: string): BionicSegment[] {
  const boldTarget = bionicBoldLength(countAlphanumeric(body));
  if (boldTarget === 0) {
    return [{ text: body, bold: false }];
  }

  let seenLetters = 0;
  let boldText = '';
  let normalText = '';

  for (const char of body) {
    if (ALNUM_RE.test(char)) {
      seenLetters += 1;
      if (seenLetters <= boldTarget) {
        boldText += char;
      } else {
        normalText += char;
      }
      continue;
    }

    if (seenLetters < boldTarget) {
      boldText += char;
    } else {
      normalText += char;
    }
  }

  const segments: BionicSegment[] = [];
  if (boldText) segments.push({ text: boldText, bold: true });
  if (normalText) segments.push({ text: normalText, bold: false });
  return segments.length > 0 ? segments : [{ text: body, bold: false }];
}

function parseWordToken(token: string): { lead: string; body: string; trail: string } {
  const match = token.match(BODY_RE);
  if (!match) {
    return { lead: '', body: '', trail: token };
  }
  return { lead: match[1], body: match[2], trail: match[3] };
}

/**
 * Parse plain text into whitespace runs and bionic word units.
 * Each word unit's segments concatenate to the original token string.
 */
export function parseBionicText(text: string): BionicDisplayPart[] {
  const parts: BionicDisplayPart[] = [];
  WORD_CHUNK_RE.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = WORD_CHUNK_RE.exec(text)) !== null) {
    const whitespace = match[1];
    const token = match[2];

    if (whitespace) {
      parts.push({ kind: 'whitespace', text: whitespace });
      continue;
    }

    const { lead, body, trail } = parseWordToken(token);
    if (!body) {
      parts.push({
        kind: 'word',
        text: token,
        segments: [{ text: token, bold: false }],
      });
      continue;
    }

    const segments: BionicSegment[] = [];
    if (lead) segments.push({ text: lead, bold: false });
    segments.push(...splitWordBody(body));
    if (trail) segments.push({ text: trail, bold: false });

    parts.push({ kind: 'word', text: token, segments });
  }

  return parts;
}

/** Flat segment list (useful for tests and reconstruction checks). */
export function tokenizeBionicSegments(text: string): BionicSegment[] {
  return parseBionicText(text).flatMap((part) => {
    if (part.kind === 'whitespace') {
      return [{ text: part.text, bold: false }];
    }
    return part.segments;
  });
}

export function segmentsToPlainText(segments: BionicSegment[]): string {
  return segments.map((segment) => segment.text).join('');
}
