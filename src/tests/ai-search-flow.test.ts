/**
 * When the AI assistant's answer is allowed to run a search.
 *
 * The reported symptom: typing "property in Kosovo" ran the search and moved
 * the map immediately, while the assistant was still asking "would you like to
 * narrow down by city, price range, or property type?". The model had set
 * isFinalQuery on a bare location. The prompt now forbids that; this is the
 * guard that holds the line if a model slips anyway.
 */
import { describe, it, expect } from 'vitest';
import { hasSearchCriteria, looksLikeQuestion, shouldRunSearch } from '@/src/features/search/components/aiSearchFlow';
import type { AiSearchQuery } from '@/types';

describe('hasSearchCriteria', () => {
    it('is false for nothing gathered yet', () => {
        expect(hasSearchCriteria(null)).toBe(false);
        expect(hasSearchCriteria(undefined)).toBe(false);
        expect(hasSearchCriteria({} as AiSearchQuery)).toBe(false);
    });

    it('ignores blanks and empty feature lists', () => {
        expect(hasSearchCriteria({ location: '', features: [] } as unknown as AiSearchQuery)).toBe(false);
    });

    it('is true once any real criterion is present', () => {
        expect(hasSearchCriteria({ country: 'Kosovo' } as AiSearchQuery)).toBe(true);
        expect(hasSearchCriteria({ maxPrice: 150000 } as AiSearchQuery)).toBe(true);
        expect(hasSearchCriteria({ features: ['sea view'] } as unknown as AiSearchQuery)).toBe(true);
    });

    it('counts a zero-valued number as gathered', () => {
        expect(hasSearchCriteria({ minPrice: 0 } as AiSearchQuery)).toBe(true);
    });
});

describe('looksLikeQuestion', () => {
    it('spots a trailing question in each language the assistant speaks', () => {
        expect(looksLikeQuestion('Would you like to narrow down by city, price range, or property type?')).toBe(true);
        expect(looksLikeQuestion('A dëshironi të filtroj sipas çmimit?')).toBe(true);
        expect(looksLikeQuestion('Želite li da suzim izbor po gradu?')).toBe(true);
        expect(looksLikeQuestion('Искате ли да стесним по град?')).toBe(true);
        expect(looksLikeQuestion('Doriți să restrâng după oraș?')).toBe(true);
    });

    it('reads a Greek semicolon as a question mark', () => {
        expect(looksLikeQuestion('Θέλετε να περιορίσω την αναζήτηση ανά πόλη;')).toBe(true);
    });

    it('does not read a plain semicolon as a question outside Greek', () => {
        expect(looksLikeQuestion('Here are your matches; swipe through them;')).toBe(false);
    });

    it('sees past trailing decoration', () => {
        expect(looksLikeQuestion('Do you have a city in mind? 🏙️')).toBe(true);
        expect(looksLikeQuestion('Shall I look across the whole country?"')).toBe(true);
    });

    it('is false for a statement that merely contains a question mark earlier on', () => {
        expect(looksLikeQuestion('You asked "what do you have?" — here is everything I found in Kosovo.')).toBe(false);
    });

    it('is false for a plain statement and for nothing at all', () => {
        expect(looksLikeQuestion('Here are the apartments in Pristina up to €150,000.')).toBe(false);
        expect(looksLikeQuestion('')).toBe(false);
        expect(looksLikeQuestion(null)).toBe(false);
    });
});

describe('shouldRunSearch', () => {
    it('holds back while the assistant is still gathering', () => {
        expect(shouldRunSearch({
            responseMessage: 'Kosovo it is! Do you have a city in mind?',
            searchQuery: { country: 'Kosovo' } as AiSearchQuery,
            isFinalQuery: false,
        })).toBe(false);
    });

    it('holds back on the exact reported case — a final flag alongside a question', () => {
        expect(shouldRunSearch({
            responseMessage: 'Here are all properties available in Kosovo! Would you like to narrow down the search by city, price range, or property type?',
            searchQuery: { country: 'Kosovo' } as AiSearchQuery,
            isFinalQuery: true,
        })).toBe(false);
    });

    it('runs once the buyer is done and the assistant stops asking', () => {
        expect(shouldRunSearch({
            responseMessage: 'Here are the apartments in Pristina up to €150,000 — swipe through them.',
            searchQuery: { location: 'Pristina', country: 'Kosovo', maxPrice: 150000 } as AiSearchQuery,
            isFinalQuery: true,
        })).toBe(true);
    });

    it('treats an empty-but-present query as "show me everything"', () => {
        expect(shouldRunSearch({
            responseMessage: 'Here is everything I have.',
            searchQuery: {} as AiSearchQuery,
            isFinalQuery: true,
        })).toBe(true);
    });

    it('never runs without a query at all', () => {
        expect(shouldRunSearch({
            responseMessage: 'Here you go.',
            searchQuery: null,
            isFinalQuery: true,
        })).toBe(false);
    });
});
