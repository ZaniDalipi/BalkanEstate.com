/**
 * The search engine: one ranked index, used for every kind of thing the app
 * lets people search for.
 *
 * The behaviour it is modelled on is Google's, in the three ways that
 * actually matter to a user:
 *
 *   1. **Every word has to be there.** Typing more words narrows the result
 *      set instead of widening it. The old matcher ORed its terms, so
 *      "Budva apartment" returned every apartment in the Balkans; here a
 *      document has to answer all of them (`requireAllTerms`, on by default).
 *   2. **Where a word matched decides the order.** A name that starts with
 *      the query beats a description that mentions it, and both beat a typo.
 *   3. **A near-miss still counts.** One or two typos are forgiven quietly
 *      rather than turning the page empty.
 *
 * Indexing is eager and synchronous: folding a few thousand listings costs
 * about a millisecond, which is cheaper than a round trip and means results
 * can be recomputed on every keystroke.
 */

import { foldText, tokenizeQuery } from './text';
import { matchTermAcrossFields, type FieldMatch } from './match';

export interface SearchField<T> {
  /** Field name, echoed back in `matchedFields` so callers can highlight it. */
  key: string;
  /** Pull the searchable text out of a document. Multiple values are allowed. */
  value: (doc: T) => string | string[] | null | undefined;
  /**
   * Multiplier on this field's match score. A title is worth several times a
   * description; the numbers only ever matter relative to each other.
   */
  weight?: number;
}

export interface SearchIndexOptions<T> {
  fields: SearchField<T>[];
  /**
   * Intrinsic quality of a document, independent of the query — views, a
   * promoted flag, a curated place. Added after term scoring so it breaks
   * ties between comparable matches without ever promoting a worse match.
   * Keep it small relative to a tier gap (roughly 0-100).
   */
  boost?: (doc: T) => number;
}

export interface SearchOptions {
  limit?: number;
  /** Drop results scoring below this. */
  minScore?: number;
  /**
   * When false, a document matching some of the query's words still counts,
   * scored down for each word it misses. Useful for a long free-text query
   * where an empty result set is worse than a loose one.
   */
  requireAllTerms?: boolean;
}

export interface SearchResult<T> {
  doc: T;
  score: number;
  /** How many query terms this document answered. */
  matchedTerms: number;
  /** Best match per query term, in query order; null where a term missed. */
  matchedFields: (FieldMatch | null)[];
}

interface IndexedDoc<T> {
  doc: T;
  fields: { key: string; folded: string; weight: number }[];
  boost: number;
}

export interface SearchIndex<T> {
  readonly size: number;
  search: (query: string, options?: SearchOptions) => SearchResult<T>[];
  /** Everything in the index, best-boosted first — what an empty query shows. */
  top: (limit?: number) => T[];
}

const foldFieldValue = (value: string | string[] | null | undefined): string => {
  if (!value) return '';
  return foldText(Array.isArray(value) ? value.filter(Boolean).join(' ') : value);
};

/**
 * Build a searchable index over `docs`.
 *
 * The index is immutable — rebuild it when the documents change. In React
 * that means wrapping the call in `useMemo` keyed on the source array, which
 * is what the app's hooks do.
 */
export const createSearchIndex = <T>(
  docs: readonly T[],
  { fields, boost }: SearchIndexOptions<T>
): SearchIndex<T> => {
  const indexed: IndexedDoc<T>[] = docs.map((doc) => ({
    doc,
    fields: fields
      .map((field) => ({
        key: field.key,
        folded: foldFieldValue(field.value(doc)),
        weight: field.weight ?? 1,
      }))
      .filter((field) => field.folded.length > 0),
    boost: boost?.(doc) ?? 0,
  }));

  const search = (query: string, options: SearchOptions = {}): SearchResult<T>[] => {
    const { limit = 20, minScore = 0, requireAllTerms = true } = options;
    const terms = tokenizeQuery(query);
    if (terms.length === 0) return [];

    const results: SearchResult<T>[] = [];

    for (const entry of indexed) {
      const matchedFields: (FieldMatch | null)[] = [];
      let score = 0;
      let matchedTerms = 0;

      for (const term of terms) {
        const match = matchTermAcrossFields(term, entry.fields);
        matchedFields.push(match);

        if (match) {
          score += match.score;
          matchedTerms += 1;
        } else if (requireAllTerms) {
          score = 0;
          break;
        } else {
          // A missing word is a real penalty, so a document answering two of
          // three terms still ranks under one answering all three.
          score -= 150;
        }
      }

      if (matchedTerms === 0) continue;
      if (requireAllTerms && matchedTerms < terms.length) continue;

      // Average rather than sum, so a two-word query and a five-word query
      // produce scores on the same scale and `minScore` means one thing.
      const finalScore = score / terms.length + entry.boost;
      if (finalScore < minScore) continue;

      results.push({ doc: entry.doc, score: finalScore, matchedTerms, matchedFields });
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  };

  const top = (limit = 20): T[] =>
    [...indexed]
      .sort((a, b) => b.boost - a.boost)
      .slice(0, limit)
      .map((entry) => entry.doc);

  return { size: indexed.length, search, top };
};

/**
 * One-off ranked search over documents that change every call — a small
 * list, or one already narrowed by other filters. Builds a throwaway index;
 * for anything reused across keystrokes build the index once instead.
 */
export const searchDocuments = <T>(
  docs: readonly T[],
  query: string,
  options: SearchIndexOptions<T> & SearchOptions
): SearchResult<T>[] =>
  createSearchIndex(docs, options).search(query, options);
