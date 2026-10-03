import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import L from 'leaflet';
import type { Property } from '@/types';
import { outOfAreaFallback, OUT_OF_AREA_RADIUS_KM } from '@/src/features/search/outOfArea';
import { narrowToMapView } from '@/src/features/search/mapList';
import { validateActivePromotion } from '@/shared/utils/validation';
import OutOfAreaBanner from '@/src/components/search/OutOfAreaBanner';

/**
 * Searching a place with no listings in it ("Budva").
 *
 * The bug these hold shut: the list fell back to every nearest listing, so a
 * Durrës apartment read as a result for Budva. Now the page says the area is
 * empty; premium listings are always shown, other promotions only nearby,
 * and the nearest listings only when no promotion qualifies — never nothing.
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
// Distances from Budva, roughly: Kotor ~15 km, Bar ~35 km, Durrës ~130 km, Belgrade ~300 km.
const KOTOR = { lat: 42.424, lng: 18.771, city: 'Kotor', country: 'Montenegro' };
const BAR = { lat: 42.093, lng: 19.1, city: 'Bar', country: 'Montenegro' };
const DURRES = { lat: 41.323, lng: 19.441, city: 'Durrës', country: 'Albania' };
const BELGRADE = { lat: 44.787, lng: 20.457, city: 'Belgrade', country: 'Serbia' };

const listing = (id: string, overrides: Partial<Property> = {}): Property => ({
    id,
    ...DURRES,
    ...overrides,
} as Property);

const promoted = (id: string, tier: Property['promotionTier'], overrides: Partial<Property> = {}) =>
    listing(id, { isPromoted: true, promotionTier: tier, promotionEndDate: NOW + DAY, ...overrides });

const ids = (ps: Property[]) => ps.map(p => p.id);

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

describe('outOfAreaFallback', () => {
    it('always shows premium, however far away', () => {
        const result = outOfAreaFallback([promoted('belgrade', 'premium', BELGRADE), listing('plain', KOTOR)], BUDVA, NOW);
        expect(result.kind).toBe('promoted');
        expect(ids(result.listProperties)).toEqual(['belgrade']);
        expect(result.location).toBe('Belgrade');
    });

    it('shows highlight and featured only within their radius', () => {
        expect(OUT_OF_AREA_RADIUS_KM.highlight).toBeGreaterThan(OUT_OF_AREA_RADIUS_KM.featured);
        const result = outOfAreaFallback(
            [
                promoted('highlight-near', 'highlight', BAR),
                promoted('highlight-far', 'highlight', BELGRADE),
                promoted('featured-near', 'featured', KOTOR),
                promoted('featured-far', 'featured', DURRES),
            ],
            BUDVA,
            NOW
        );
        expect(ids(result.listProperties)).toEqual(['highlight-near', 'featured-near']);
    });

    it('ranks by importance: tier, then urgent, then nearest', () => {
        const result = outOfAreaFallback(
            [
                promoted('featured', 'featured', KOTOR),
                promoted('highlight', 'highlight', BAR),
                promoted('premium-far', 'premium', BELGRADE),
                promoted('premium-near', 'premium', KOTOR),
                promoted('premium-urgent', 'premium', { ...DURRES, hasUrgentBadge: true }),
            ],
            BUDVA,
            NOW
        );
        expect(ids(result.listProperties)).toEqual(['premium-urgent', 'premium-near', 'premium-far', 'highlight', 'featured']);
    });

    it('ignores expired promotions', () => {
        const result = outOfAreaFallback(
            [promoted('expired', 'premium', { ...BELGRADE, promotionEndDate: NOW - DAY }), listing('plain', BAR)],
            BUDVA,
            NOW
        );
        expect(result.kind).toBe('nearest');
        expect(ids(result.listProperties)).toEqual(['plain']);
    });

    it('falls back to the nearest town when no promotion qualifies — never nothing', () => {
        const result = outOfAreaFallback(
            [
                listing('durres'),
                listing('kotor-1', KOTOR),
                listing('kotor-2', { ...KOTOR, lat: 42.43 }),
                promoted('highlight-far', 'highlight', BELGRADE),
            ],
            BUDVA,
            NOW
        );
        expect(result.kind).toBe('nearest');
        expect(ids(result.listProperties)).toEqual(['kotor-1', 'kotor-2']);
        expect(result.location).toBe('Kotor');
    });

    it('is empty only when there is nothing at all', () => {
        expect(outOfAreaFallback([], BUDVA, NOW)).toEqual({ listProperties: [], kind: 'nearest', location: null });
    });

    it('ranks listings with unusable coordinates last instead of throwing', () => {
        const result = outOfAreaFallback(
            [promoted('broken', 'premium', { lat: NaN, lng: 999 }), promoted('ok', 'premium', KOTOR)],
            BUDVA,
            NOW
        );
        expect(ids(result.listProperties)).toEqual(['ok', 'broken']);
    });

    it('with an invalid centre keeps premium but cannot measure a radius', () => {
        const result = outOfAreaFallback(
            [promoted('h', 'highlight', KOTOR), promoted('p', 'premium', BELGRADE)],
            { lat: NaN, lng: NaN },
            NOW
        );
        expect(ids(result.listProperties)).toEqual(['p']);
    });
});

describe('narrowToMapView (rent and villa pages)', () => {
    const budvaView = L.latLngBounds([42.25, 18.8], [42.33, 18.9]);

    it('lists what is in view and reports no out-of-area state', () => {
        const inBudva = listing('budva', { lat: 42.29, lng: 18.84, city: 'Budva' });
        const result = narrowToMapView({ properties: [inBudva, listing('durres')], drawnBounds: null, mapBounds: budvaView, ready: true });
        expect(ids(result.listProperties)).toEqual(['budva']);
        expect(result.outOfArea).toBeNull();
        expect(result.fallbackLocation).toBeNull();
    });

    it('answers an empty view with the shared out-of-area rule', () => {
        const result = narrowToMapView({
            properties: [listing('plain', KOTOR), promoted('premium', 'premium', BELGRADE)],
            drawnBounds: null,
            mapBounds: budvaView,
            ready: true,
        });
        expect(result.outOfArea).toBe('promoted');
        expect(ids(result.listProperties)).toEqual(['premium']);
        expect(result.fallbackLocation).toBe('Belgrade');
    });
});

describe('OutOfAreaBanner', () => {
    it('names the unmatched query and introduces the promoted listings', () => {
        render(<OutOfAreaBanner kind="promoted" query="Budva" isQueryUnmatched location="Kotor" onResetFilters={() => {}} />);
        expect(screen.getByRole('status')).toHaveTextContent('No properties in “Budva” right now');
        expect(screen.getByRole('status')).toHaveTextContent('premium and highlighted listings from elsewhere');
        expect(screen.getByRole('status')).toHaveTextContent('the nearest is in Kotor');
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('introduces the nearest listings and offers a reset when nothing is promoted', () => {
        const onReset = vi.fn();
        render(<OutOfAreaBanner kind="nearest" query="" isQueryUnmatched={false} location="Kotor" onResetFilters={onReset} />);
        expect(screen.getByRole('status')).toHaveTextContent('No properties in this area right now');
        expect(screen.getByRole('status')).toHaveTextContent('the nearest listings, in Kotor');
        fireEvent.click(screen.getByRole('button'));
        expect(onReset).toHaveBeenCalledOnce();
    });

    it('sanitises the echoed query', () => {
        render(<OutOfAreaBanner kind="promoted" query="<b>Budva</b>" isQueryUnmatched location={null} />);
        expect(screen.getByRole('status').textContent).not.toContain('<');
    });
});
