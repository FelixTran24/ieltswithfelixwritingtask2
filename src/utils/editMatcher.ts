import type { EssayEditItem } from '../types/ielts';

export interface LocatedEdit {
  id: string;
  index: number;
  start: number;
  end: number;
  edit: EssayEditItem;
}

export interface TextSegment {
  type: 'plain' | 'edit';
  text: string;
  locatedEdit?: LocatedEdit;
}

export interface ParagraphDiff {
  paragraphIndex: number;
  segments: TextSegment[];
}

export interface EssayDiffResult {
  paragraphs: ParagraphDiff[];
  matchedEdits: LocatedEdit[];
  unmatchedEdits: Array<{ id: string; edit: EssayEditItem }>;
}

interface NormalizedMap {
  normalized: string;
  indexMap: number[];
}

function normalizeChar(ch: string): string {
  if (ch === '\u2018' || ch === '\u2019') return "'";
  if (ch === '\u201C' || ch === '\u201D') return '"';
  if (ch === '\u2013' || ch === '\u2014') return '-';
  return ch;
}

function buildNormalizedMap(input: string): NormalizedMap {
  let normalized = '';
  const indexMap: number[] = [];
  let inSpace = false;

  for (let i = 0; i < input.length; i++) {
    const raw = normalizeChar(input[i]);
    if (/\s/.test(raw)) {
      if (!inSpace && normalized.length > 0) {
        normalized += ' ';
        indexMap.push(i);
        inSpace = true;
      }
    } else {
      normalized += raw;
      indexMap.push(i);
      inSpace = false;
    }
  }

  // Trim trailing space
  if (normalized.endsWith(' ')) {
    normalized = normalized.slice(0, -1);
    indexMap.pop();
  }

  return { normalized, indexMap };
}

function normalizeNeedle(needle: string): string {
  return needle
    .trim()
    .split('')
    .map(normalizeChar)
    .join('')
    .replace(/\s+/g, ' ');
}

function hasOverlap(
  start: number,
  end: number,
  occupied: Array<{ start: number; end: number }>
): boolean {
  return occupied.some((span) => start < span.end && end > span.start);
}

function findNonOverlappingRange(
  essay: string,
  normMap: NormalizedMap,
  originalText: string,
  occupied: Array<{ start: number; end: number }>
): { start: number; end: number } | null {
  const needle = originalText.trim();
  if (!needle) return null;

  // 1. Exact substring search
  let searchFrom = 0;
  while (searchFrom < essay.length) {
    const idx = essay.indexOf(needle, searchFrom);
    if (idx === -1) break;
    const end = idx + needle.length;
    if (!hasOverlap(idx, end, occupied)) {
      return { start: idx, end };
    }
    searchFrom = idx + 1;
  }

  // 2. Whitespace & smart-quote normalized search
  const normNeedle = normalizeNeedle(needle);
  if (!normNeedle) return null;

  const tryNormalized = (haystack: string, target: string) => {
    let from = 0;
    while (from < haystack.length) {
      const idx = haystack.indexOf(target, from);
      if (idx === -1) break;
      const startOrig = normMap.indexMap[idx];
      const lastNormIdx = idx + target.length - 1;
      const endOrig = normMap.indexMap[lastNormIdx] + 1;
      if (
        startOrig !== undefined &&
        endOrig !== undefined &&
        !hasOverlap(startOrig, endOrig, occupied)
      ) {
        return { start: startOrig, end: endOrig };
      }
      from = idx + 1;
    }
    return null;
  };

  const exactNorm = tryNormalized(normMap.normalized, normNeedle);
  if (exactNorm) return exactNorm;

  // 3. Case-insensitive normalized search
  return tryNormalized(
    normMap.normalized.toLowerCase(),
    normNeedle.toLowerCase()
  );
}

/**
 * Matches structured AI edits back onto the original essay without altering user text.
 * Any edit that cannot be reliably located (or conflicts with an existing span) is placed
 * into unmatchedEdits so it is displayed cleanly at the bottom of the essay.
 */
export function matchEditsToEssay(
  essay: string,
  edits: EssayEditItem[]
): EssayDiffResult {
  const normMap = buildNormalizedMap(essay);
  const occupied: Array<{ start: number; end: number }> = [];
  const matchedRaw: Array<{ start: number; end: number; edit: EssayEditItem }> =
    [];
  const unmatchedEdits: Array<{ id: string; edit: EssayEditItem }> = [];

  edits.forEach((edit, idx) => {
    const range = findNonOverlappingRange(
      essay,
      normMap,
      edit.original_text,
      occupied
    );
    if (range) {
      occupied.push(range);
      matchedRaw.push({ start: range.start, end: range.end, edit });
    } else {
      unmatchedEdits.push({ id: `unmatched-${idx + 1}`, edit });
    }
  });

  // Sort matched spans by appearance order in the essay
  matchedRaw.sort((a, b) => a.start - b.start);

  const matchedEdits: LocatedEdit[] = matchedRaw.map((item, idx) => ({
    id: `edit-${idx + 1}`,
    index: idx + 1,
    start: item.start,
    end: item.end,
    edit: item.edit,
  }));

  // Split essay into paragraphs while preserving absolute character offsets
  const paragraphs: ParagraphDiff[] = [];
  const paraRegex = /[^\n]+/g;
  let match: RegExpExecArray | null;
  let pIdx = 0;

  while ((match = paraRegex.exec(essay)) !== null) {
    const pStart = match.index;
    const pEnd = pStart + match[0].length;
    const segments: TextSegment[] = [];
    let cursor = pStart;

    const paraEdits = matchedEdits.filter(
      (e) => e.start >= pStart && e.start < pEnd
    );

    for (const located of paraEdits) {
      const clampedEnd = Math.min(located.end, pEnd);
      if (located.start > cursor) {
        segments.push({
          type: 'plain',
          text: essay.slice(cursor, located.start),
        });
      }
      segments.push({
        type: 'edit',
        text: essay.slice(located.start, clampedEnd),
        locatedEdit: located,
      });
      cursor = clampedEnd;
    }

    if (cursor < pEnd) {
      segments.push({
        type: 'plain',
        text: essay.slice(cursor, pEnd),
      });
    }

    paragraphs.push({ paragraphIndex: pIdx, segments });
    pIdx += 1;
  }

  return {
    paragraphs,
    matchedEdits,
    unmatchedEdits,
  };
}
