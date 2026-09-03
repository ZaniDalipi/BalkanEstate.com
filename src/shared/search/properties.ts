/**
 * Searching listings.
 *
 * The rules a property search has to get right are not the same as a place
 * search's:
 *
 *   - **More words must mean fewer results.** The matcher this replaced ORed
 *     its terms, so "Budva apartment" returned every apartment in eleven
 *     countries and every listing in Budva — the opposite of what typing a
 *     second word is for.
 *   - **A listing is found by where it is, not by its prose.** Location
 *     fields carry the weight; the description is searchable but can never
 *     outrank an address.
 *   - **The sentence is filters, not text.** "3 bed villa in Budva under
 *     300k" is one location term and four filters, so the numbers and the
 *     type words are lifted out by the parser before anything is matched —
 *     otherwise "3" and "300k" are searched for in street names.
 */

import type { Property } from '@/types';
import { foldText } from './text';
import { matchTerm } from './match';
import { parseSearchQuery, type ParsedQuery } from './parseQuery';
import { createSearchIndex, type SearchResult } from './engine';

/**
 * Fields a text query is matched against, and what each is worth.
 * A listing reference is worth as much as a title: someone typing "BE-1042"
 * has it written down and wants that exact listing.
 */
const PROPERTY_FIELDS = [
  { key: 'title', weight: 3, value: (property: Property) => property.title },
  { key: 'address', weight: 3, value: (property: Property) => property.address },
  { key: 'city', weight: 2.5, value: (property: Property) => property.city },
  { key: 'country', weight: 1, value: (property: Property) => property.country },
  {
    key: 'reference',
    weight: 3,
    value: (property: Property) => [property.propertyId, property.id].filter(Boolean).join(' '),
  },
  { key: 'type', weight: 0.8, value: (property: Property) => property.propertyType },
  {
    key: 'amenities',
    weight: 0.6,
    value: (property: Property) => (property.amenities ?? []).join(' '),
  },
  { key: 'description', weight: 0.4, value: (property: Property) => property.description },
] as const;

/** Location fields only — what a place name is allowed to match. */
const LOCATION_KEYS = new Set(['title', 'address', 'city', 'country', 'reference']);

export interface PropertyMatcher {
  /** False when the query says nothing about text, so every listing passes. */
  isActive: boolean;
  parsed: ParsedQuery;
  matches: (property: Property) => boolean;
}

/**
 * Build a reusable test for one query.
 *
 * Parsing happens once per query rather than once per listing, which is what
 * makes this cheap enough to run over the whole result set on every
 * keystroke.
 */
export const createPropertyMatcher = (query: string): PropertyMatcher => {
  const parsed = parseSearchQuery(query ?? '');
  const terms = parsed.terms;
  const { phrases, exclusions } = parsed;

  const isActive = terms.length > 0 || phrases.length > 0 || exclusions.length > 0;
  if (!isActive) {
    return { isActive: false, parsed, matches: () => true };
  }

  const matches = (property: Property): boolean => {
    const folded = PROPERTY_FIELDS.map((field) => ({
      key: field.key,
      weight: field.weight,
      folded: foldText(String(field.value(property) ?? '')),
    })).filter((field) => field.folded.length > 0);

    const haystack = folded.map((field) => field.folded).join(' ');

    // `-word` wins over everything: an exclusion the user typed is a hard no.
    for (const excluded of exclusions) {
      if (matchTerm(excluded, haystack)) return false;
    }

    // A quoted phrase is matched verbatim, with no typo tolerance — that is
    // what the quotes are asking for.
    for (const phrase of phrases) {
      if (!haystack.includes(phrase)) return false;
    }

    // Every remaining word has to be somewhere in the listing.
    return terms.every((term) => folded.some((field) => matchTerm(term, field.folded) !== null));
  };

  return { isActive: true, parsed, matches };
};

/** Does this listing answer this query? Prefer the matcher for a whole list. */
export const matchesPropertyQuery = (property: Property, query: string): boolean =>
  createPropertyMatcher(query).matches(property);

export interface RankPropertiesOptions {
  limit?: number;
  /** Only score against location fields — for a place-name query. */
  locationOnly?: boolean;
}

/**
 * Order listings by how well they answer the query.
 *
 * Used for the "most relevant" sort and for the omnibox's listing rows.
 * Views break ties between comparable matches, so of two listings equally on
 * the nose the busier one is shown first — but a popular listing can never
 * climb over a better textual match, because the boost is small next to the
 * gap between two match tiers.
 */
export const rankProperties = (
  properties: readonly Property[],
  query: string,
  { limit = properties.length, locationOnly = false }: RankPropertiesOptions = {}
): SearchResult<Property>[] => {
  const parsed = parseSearchQuery(query ?? '');
  const text = parsed.text.trim() || parsed.raw.trim();
  if (!text) return [];

  const fields = PROPERTY_FIELDS.filter((field) => !locationOnly || LOCATION_KEYS.has(field.key)).map(
    (field) => ({ key: field.key, weight: field.weight, value: field.value })
  );

  const index = createSearchIndex(properties, {
    fields,
    boost: (property) => Math.min(30, Math.log10((property.views ?? 0) + 1) * 10),
  });

  return index.search(text, { limit });
};

/**
 * Sort a list by relevance to a query, leaving it untouched when the query
 * says nothing — so a "most relevant" sort with an empty box is a no-op
 * rather than an arbitrary reshuffle.
 */
export const sortByRelevance = (properties: Property[], query: string): Property[] => {
  const ranked = rankProperties(properties, query);
  if (ranked.length === 0) return properties;

  const scores = new Map(ranked.map((result) => [result.doc.id, result.score]));
  return [...properties].sort((a, b) => (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0));
};
