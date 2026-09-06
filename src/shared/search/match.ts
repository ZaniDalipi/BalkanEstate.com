/**
 * How one query term scores against one field of text.
 *
 * The tiers are ordered the way a person reads a suggestion list: the thing
 * whose name *is* what I typed, then the thing whose name *starts* with what
 * I typed, then a word inside it, then something that merely contains it,
 * then a near-miss. Every tier is a wide band apart, so a better kind of
 * match always beats a longer or better-placed worse one — the property of
 * Google's ranking that makes it feel decisive rather than fuzzy.
 */

import { fuzzyPrefixDistance, isFuzzyMatch, typoBudget } from './fuzzy';

export type MatchTier = 'exact' | 'prefix' | 'word-prefix' | 'word-fuzzy' | 'contains' | 'fuzzy';

const TIER_SCORE: Record<MatchTier, number> = {
  exact: 1000,
  prefix: 700,
  'word-prefix': 500,
  'word-fuzzy': 300,
  contains: 200,
  fuzzy: 120,
};

export interface TermMatch {
  tier: MatchTier;
  score: number;
  /** Offset of the match inside the folded field, for highlighting. */
  index: number;
  length: number;
}

/**
 * Score `term` against `folded` (an already-folded field value).
 * Returns null when the term does not appear in the field at all.
 *
 * `folded` is expected to be space-separated words, which is what `foldText`
 * produces, so word boundaries can be found by scanning for spaces rather
 * than by splitting and re-joining on every comparison.
 */
export const matchTerm = (term: string, folded: string): TermMatch | null => {
  if (!term || !folded) return null;

  if (folded === term) {
    return { tier: 'exact', score: TIER_SCORE.exact, index: 0, length: term.length };
  }

  if (folded.startsWith(term)) {
    // A prefix that lands on a word boundary is a cleaner hit than one that
    // stops mid-word, but both outrank anything deeper in the string.
    const completesWord = folded[term.length] === ' ';
    return {
      tier: 'prefix',
      score: TIER_SCORE.prefix + (completesWord ? 60 : 0),
      index: 0,
      length: term.length,
    };
  }

  const wordStart = folded.indexOf(` ${term}`);
  if (wordStart !== -1) {
    const index = wordStart + 1;
    const completesWord = folded[index + term.length] === ' ' || index + term.length === folded.length;
    return {
      tier: 'word-prefix',
      // Earlier words matter more: "Budva Beach" ranks above "Beach Bar Budva".
      score: TIER_SCORE['word-prefix'] + (completesWord ? 40 : 0) - Math.min(index, 40),
      index,
      length: term.length,
    };
  }

  const anywhere = folded.indexOf(term);
  if (anywhere !== -1) {
    return {
      tier: 'contains',
      score: TIER_SCORE.contains - Math.min(anywhere, 40),
      index: anywhere,
      length: term.length,
    };
  }

  if (typoBudget(term.length) === 0) return null;

  // Nothing matched literally — allow one word of the field to be a typo of
  // the term. Whole-word equality within budget beats a fuzzy prefix, since
  // "budvva" → "budva" is a surer thing than "budvva" → "budvanska".
  let bestWordFuzzy: TermMatch | null = null;
  let offset = 0;

  for (const word of folded.split(' ')) {
    if (word) {
      if (isFuzzyMatch(term, word)) {
        const score = TIER_SCORE['word-fuzzy'] - Math.min(offset, 30);
        if (!bestWordFuzzy || score > bestWordFuzzy.score) {
          bestWordFuzzy = { tier: 'word-fuzzy', score, index: offset, length: word.length };
        }
      } else {
        const distance = fuzzyPrefixDistance(term, word);
        if (distance <= typoBudget(term.length)) {
          const score = TIER_SCORE.fuzzy - distance * 20 - Math.min(offset, 30);
          if (!bestWordFuzzy || score > bestWordFuzzy.score) {
            bestWordFuzzy = {
              tier: 'fuzzy',
              score,
              index: offset,
              length: Math.min(word.length, term.length + distance),
            };
          }
        }
      }
    }
    offset += word.length + 1;
  }

  return bestWordFuzzy;
};

/**
 * Score a term against several fields and keep the best hit.
 * Field weights scale the tier score, so a title match outranks the same
 * tier of match in a description without changing the tier ordering itself.
 */
export interface WeightedField {
  /** Folded field value. */
  folded: string;
  weight: number;
  /** Identifier the caller uses to attribute highlights back to a field. */
  key: string;
}

export interface FieldMatch extends TermMatch {
  key: string;
}

export const matchTermAcrossFields = (term: string, fields: WeightedField[]): FieldMatch | null => {
  let best: FieldMatch | null = null;

  for (const field of fields) {
    const match = matchTerm(term, field.folded);
    if (!match) continue;

    const weighted: FieldMatch = { ...match, score: match.score * field.weight, key: field.key };
    if (!best || weighted.score > best.score) best = weighted;
  }

  return best;
};
