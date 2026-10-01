import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { Property } from '@/types';
import { promotedOutsideArea } from '@/src/features/search/outOfArea';
import { validateActivePromotion } from '@/shared/utils/validation';
import OutOfAreaBanner from '@/src/features/search/components/OutOfAreaBanner';

/**
 * Searching a place with no listings in it ("Budva").
 *
 * The bug these hold shut: the list fell back to every nearest listing, so a
 * Durrës apartment read as a result for Budva. Now the page says the area is
 * empty and lists only actively promoted listings from elsewhere.
 */

// Render the English default text with {{vars}} filled in.
vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string, opts?: string | Record<string, unknown>) => {
            if (typeof opts === 'string') return opts;
            const template = (opts?.defaultValue as string) ?? key;
            return template.replace(/{{(\w+)}}/g, (_, k) => String(opts?.[k] ?? ''));
        },
        i18n: { language: 'en' },
    }),
}));

const NOW = 1_800_000_000_000;
const DAY = 86_400_000;
const BUDVA = { lat: 42.289, lng: 18.842 };

const listing = (id: string, overrides: Partial<Property> = {}): Property => ({
    id,
    lat: 41.36,
    lng: 19.54,
    city: 'Durrës',
    country: 'Albania',
    ...overrides,
} as Property);

const promoted = (id: string, tier: Property['promotionTier'], overrides: Partial<Property> = {}) =>
    listing(id, { isPromoted: true, promotionTier: tier, promotionEndDate: NOW + DAY, ...overrides });

describe('validateActivePromotion', () => {
    it('accepts a running promotion', () => {
        expect(validateActivePromotion({ isPromoted: true, promotionEndDate: NOW + 1 }, NOW)).toEqual({ isValid: true });
    });

    it('accepts an ISO end date from older payloads', () => {
        const iso = new Date(NOW + DAY).toISOString();
        expect(validateActivePromotion({ isPromoted: true, promotionEndDate: iso }, NOW).isValid).toBe(true);
    });

    it.each([
        ['not promoted', { isPromoted: false, promotionEndDate: NOW + DAY }],
        ['truthy but not boolean flag', { isPromoted: 'yes', promotionEndDate: NOW + DAY }],
        ['missing end date', { isPromoted: true }],
        ['garbage end date', { isPromoted: true, promotionEndDate: 'soon' }],
        ['NaN end date', { isPromoted: true, promotionEndDate: NaN }],
        ['expired', { isPromoted: true, promotionEndDate: NOW - 1 }],
    ])('rejects %s with a reason', (_, input) => {
        const result = validateActivePromotion(input, NOW);
        expect(result.isValid).toBe(false);
        expect(result.error).toBeTruthy();
    });

    it('rejects null without throwing', () => {
        expect(validateActivePromotion(null, NOW).isValid).toBe(false);
    });
});

describe('promotedOutsideArea', () => {
    it('drops ordinary and expired listings, keeping only live promotions', () => {
        const result = promotedOutsideArea(
            [
                listing('plain'),
                promoted('expired', 'premium', { promotionEndDate: NOW - DAY }),
                promoted('live', 'highlight'),
            ],
            BUDVA,
            NOW
        );
        expect(result.listProperties.map(p => p.id)).toEqual(['live']);
        expect(result.location).toBe('Durrës');
    });

    it('ranks premium over highlight over featured, then nearest first', () => {
        const result = promotedOutsideArea(
            [
                promoted('featured', 'featured', { lat: 42.29, lng: 18.85, city: 'Budva' }),
                promoted('highlight', 'highlight'),
                promoted('premium-far', 'premium', { lat: 44.8, lng: 20.4, city: 'Belgrade' }),
                promoted('premium-near', 'premium', { lat: 42.42, lng: 18.77, city: 'Kotor' }),
            ],
            BUDVA,
            NOW
        );
        expect(result.listProperties.map(p => p.id)).toEqual(['premium-near', 'premium-far', 'highlight', 'featured']);
        expect(result.location).toBe('Kotor');
    });

    it('returns an empty list — not everything — when nothing is promoted', () => {
        expect(promotedOutsideArea([listing('a'), listing('b')], BUDVA, NOW)).toEqual({
            listProperties: [],
            location: null,
        });
    });

    it('ranks listings with unusable coordinates last instead of throwing', () => {
        const result = promotedOutsideArea(
            [
                promoted('broken', 'premium', { lat: NaN, lng: 999 }),
                promoted('ok', 'premium'),
            ],
            BUDVA,
            NOW
        );
        expect(result.listProperties.map(p => p.id)).toEqual(['ok', 'broken']);
    });

    it('still orders by tier when the map centre is invalid', () => {
        const result = promotedOutsideArea(
            [promoted('h', 'highlight'), promoted('p', 'premium')],
            { lat: NaN, lng: NaN },
            NOW
        );
        expect(result.listProperties.map(p => p.id)).toEqual(['p', 'h']);
    });
});

describe('OutOfAreaBanner', () => {
    it('names the unmatched query and introduces the promoted listings', () => {
        render(
            <OutOfAreaBanner query="Budva" isQueryUnmatched promotedCount={2} location="Kotor" onResetFilters={() => {}} />
        );
        expect(screen.getByRole('status')).toHaveTextContent('No properties in “Budva” right now');
        expect(screen.getByRole('status')).toHaveTextContent('the nearest is in Kotor');
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('sanitises the echoed query', () => {
        render(
            <OutOfAreaBanner query="<b>Budva</b>" isQueryUnmatched promotedCount={1} location={null} onResetFilters={() => {}} />
        );
        expect(screen.getByRole('status').textContent).not.toContain('<');
    });

    it('offers a reset when there is nothing promoted to show', () => {
        const onReset = vi.fn();
        render(
            <OutOfAreaBanner query="" isQueryUnmatched={false} promotedCount={0} location={null} onResetFilters={onReset} />
        );
        expect(screen.getByRole('status')).toHaveTextContent('No properties in this area right now');
        fireEvent.click(screen.getByRole('button'));
        expect(onReset).toHaveBeenCalledOnce();
    });
});
