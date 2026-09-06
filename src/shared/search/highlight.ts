/**
 * Bolding the part of a suggestion the user typed.
 *
 * Google's autocomplete bolds what it added and leaves what you typed plain;
 * most product search bars do the opposite and bold the match. Either way the
 * job is the same — locate the query inside the label — and the reason to do
 * it at all is that it tells the user *why* a row is in the list, which is
 * how a long suggestion list stays readable.
 *
 * Ranges are computed in the coordinates of the original label, so accents
 * and punctuation stay exactly where they were: typing "becici" bolds the
 * whole of "Bečići", not six of its eight characters.
 */

import { foldWithOffsets, tokenizeQuery } from './text';
import { boundedEditDistance, typoBudget } from './fuzzy';

export interface HighlightRange {
  start: number;
  end: number;
}

export interface HighlightPart {
  text: string;
  match: boolean;
}

/** Merge overlapping and adjacent ranges, in order. */
const mergeRanges = (ranges: HighlightRange[]): HighlightRange[] => {
  if (ranges.length === 0) return [];

  const sorted = [...ranges].sort((a, b) => a.start - b.start || a.end - b.end);
  const merged: HighlightRange[] = [sorted[0]];

  for (const range of sorted.slice(1)) {
    const last = merged[merged.length - 1];
    if (range.start <= last.end) last.end = Math.max(last.end, range.end);
    else merged.push({ ...range });
  }

  return merged;
};

/**
 * Where each query term appears in `label`.
 *
 * A term is looked for as a prefix of the label, then as the start of any
 * word in it, then — for terms long enough to have a typo budget — as a near
 * miss of a word, so a misspelled query still bolds the word it found.
 */
export const highlightRanges = (label: string, query: string): HighlightRange[] => {
  const terms = tokenizeQuery(query);
  if (terms.length === 0 || !label) return [];

  const { folded, offsets } = foldWithOffsets(label);
  if (!folded) return [];

  /** Translate a folded span to original coordinates. */
  const toOriginal = (start: number, length: number): HighlightRange | null => {
    if (length <= 0 || start < 0 || start + length > offsets.length) return null;
    const first = offsets[start];
    const last = offsets[start + length - 1];
    return { start: first, end: last + 1 };
  };

  const ranges: HighlightRange[] = [];

  for (const term of terms) {
    // Prefer a word-start hit over one buried mid-word.
    const wordStart = folded.startsWith(term) ? 0 : folded.indexOf(` ${term}`) + 1;
    const direct = wordStart > 0 || folded.startsWith(term) ? wordStart : folded.indexOf(term);

    if (direct >= 0) {
      const range = toOriginal(direct, term.length);
      if (range) ranges.push(range);
      continue;
    }

    const budget = typoBudget(term.length);
    if (budget === 0) continue;

    // Fuzzy: bold the whole word that came closest, since a partial bold of
    // a misspelled match reads as a rendering bug rather than a match.
    let offset = 0;
    let best: { range: HighlightRange; distance: number } | null = null;

    for (const word of folded.split(' ')) {
      if (word.length > 0) {
        const distance = boundedEditDistance(term, word, budget);
        if (distance <= budget && (!best || distance < best.distance)) {
          const range = toOriginal(offset, word.length);
          if (range) best = { range, distance };
        }
      }
      offset += word.length + 1;
    }

    if (best) ranges.push(best.range);
  }

  return mergeRanges(ranges);
};

/**
 * Split `label` into alternating matched and unmatched parts, ready to render
 * as `<strong>` / plain text without the caller doing any index arithmetic.
 */
export const splitHighlights = (label: string, query: string): HighlightPart[] => {
  const ranges = highlightRanges(label, query);
  if (ranges.length === 0) return label ? [{ text: label, match: false }] : [];

  const parts: HighlightPart[] = [];
  let cursor = 0;

  for (const range of ranges) {
    if (range.start > cursor) parts.push({ text: label.slice(cursor, range.start), match: false });
    parts.push({ text: label.slice(range.start, range.end), match: true });
    cursor = range.end;
  }

  if (cursor < label.length) parts.push({ text: label.slice(cursor), match: false });
  return parts;
};
