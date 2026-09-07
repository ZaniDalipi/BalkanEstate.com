import type { Property } from '@/types';
import { validateSearchQuery } from '@/shared/utils/validation';

/**
 * Free-text search over an agent's own listings.
 *
 * The agent profile shows every property one person has, which for a busy agent
 * is a wall of near-identical cards. This filters that wall in the page rather
 * than sending the visitor off to the global search, where the agent filter is
 * one of many and the context is lost.
 *
 * Matching is deliberately forgiving: the visitor types what they remember —
 * "durres", "2+1", "BE-104", "villa" — not a structured query.
 */

/** Fields worth matching on. Description is left out: it is long enough that
 *  almost any term hits it, which makes the filter feel broken. */
const FIELDS: Array<(p: Property) => string | undefined> = [
    p => p.title,
    p => p.city,
    p => p.country,
    p => p.address,
    p => p.propertyType,
    p => p.propertyId,
];

/** Diacritics are dropped so "durres" finds "Durrës" and "tirane" finds "Tiranë". */
function normalize(value: string): string {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

/**
 * Turns raw input into the terms to match on. Runs the shared
 * `validateSearchQuery` first, so the same sanitising and 200-character cap
 * that guards every other search box in the app guards this one.
 */
export function parseSearchTerms(query: string): string[] {
    const { sanitized } = validateSearchQuery(query ?? '');
    return normalize(sanitized).split(/\s+/).filter(term => term.length > 0);
}

/**
 * True when the property matches every term — terms narrow the result set, so
 * "villa durres" finds villas in Durrës rather than everything in either.
 */
export function matchesPropertyQuery(property: Property, terms: string[]): boolean {
    if (terms.length === 0) return true;
    if (!property) return false;

    const haystack = normalize(
        FIELDS
            .map(read => {
                try {
                    return read(property) ?? '';
                } catch {
                    // A malformed property must not take the whole list down.
                    return '';
                }
            })
            .filter(value => typeof value === 'string')
            .join(' '),
    );

    if (haystack.length === 0) return false;
    return terms.every(term => haystack.includes(term));
}

/** Convenience wrapper: filters a list by raw user input. */
export function filterPropertiesByQuery<T extends Property>(properties: T[], query: string): T[] {
    const terms = parseSearchTerms(query);
    if (terms.length === 0) return properties;
    return properties.filter(property => matchesPropertyQuery(property, terms));
}
