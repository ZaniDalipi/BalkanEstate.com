/**
 * City Showcase Tests
 * Covers the two places the home-page gallery can go wrong: the data it
 * accepts from the API, and the interaction rules that separate expanding a
 * panel from acting on it.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ElasticGallery, type ElasticGalleryItem } from '../components/ui/elastic-gallery';
import { validateCityShowcase } from '../shared/utils/validation';
import { pickShowcaseCities } from '../features/home/utils/pickShowcaseCities';
import type { ShowcaseCity } from '../features/home/api/cityShowcaseApi';

vi.mock('@/src/shared/api', () => ({
    apiRequest: vi.fn(),
}));

import { apiRequest } from '@/src/shared/api';
import { getShowcaseCities } from '../features/home/api/cityShowcaseApi';

const mockApiRequest = vi.mocked(apiRequest);

const apiRow = (overrides: Record<string, unknown> = {}) => ({
    _id: 'panel-1',
    city: 'Belgrade',
    country: 'Serbia',
    searchQuery: 'Belgrade',
    imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/belgrade.jpg',
    ...overrides,
});

describe('getShowcaseCities', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('maps a complete row to a panel', async () => {
        mockApiRequest.mockResolvedValueOnce({ cities: [apiRow()] });

        const cities = await getShowcaseCities();

        expect(mockApiRequest).toHaveBeenCalledWith('/city-showcase', { requiresAuth: false });
        expect(cities).toEqual([
            {
                id: 'panel-1',
                city: 'Belgrade',
                country: 'Serbia',
                searchQuery: 'Belgrade',
                imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/belgrade.jpg',
            },
        ]);
    });

    it('drops rows that cannot be drawn or acted on', async () => {
        mockApiRequest.mockResolvedValueOnce({
            cities: [
                apiRow({ _id: 'no-photo', imageUrl: '' }),
                apiRow({ _id: 'no-query', searchQuery: '   ' }),
                apiRow({ _id: 'no-city', city: '' }),
                apiRow({ _id: 'keeper' }),
            ],
        });

        const cities = await getShowcaseCities();

        expect(cities.map(c => c.id)).toEqual(['keeper']);
    });

    it('rejects a photo URL that is not https', async () => {
        // The value lands in an `img src`, so a `javascript:` or `data:` URL
        // must never survive this boundary.
        mockApiRequest.mockResolvedValueOnce({
            cities: [apiRow({ imageUrl: 'javascript:alert(1)' })],
        });

        expect(await getShowcaseCities()).toEqual([]);
    });

    it('treats a missing list as no panels', async () => {
        mockApiRequest.mockResolvedValueOnce({});

        expect(await getShowcaseCities()).toEqual([]);
    });
});

describe('validateCityShowcase', () => {
    const valid = {
        city: 'Belgrade',
        country: 'Serbia',
        searchQuery: 'Belgrade',
        imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/belgrade.jpg',
        displayOrder: 0,
    };

    it('accepts a complete panel', () => {
        expect(validateCityShowcase(valid).isValid).toBe(true);
    });

    it('requires a photo', () => {
        const result = validateCityShowcase({ ...valid, imageUrl: '' });
        expect(result.isValid).toBe(false);
        expect(result.error).toMatch(/photo/i);
    });

    it('requires the photo to be https', () => {
        expect(validateCityShowcase({ ...valid, imageUrl: 'http://example.com/a.jpg' }).isValid).toBe(false);
    });

    it('requires a search term', () => {
        expect(validateCityShowcase({ ...valid, searchQuery: '' }).isValid).toBe(false);
    });

    it('requires a numeric order', () => {
        expect(validateCityShowcase({ ...valid, displayOrder: 'later' }).isValid).toBe(false);
    });
});

describe('ElasticGallery', () => {
    const items: ElasticGalleryItem[] = [
        { id: 'a', title: 'Belgrade', subtitle: 'Serbia', imageUrl: 'https://img/a.jpg', alt: 'Belgrade' },
        { id: 'b', title: 'Ohrid', subtitle: 'North Macedonia', imageUrl: 'https://img/b.jpg', alt: 'Ohrid' },
    ];

    const renderGallery = () => {
        const onBuy = vi.fn();
        const onRent = vi.fn();
        render(
            <ElasticGallery
                items={items}
                label="Explore cities"
                actions={[
                    { id: 'buy', label: 'Buy', onSelect: onBuy },
                    { id: 'rent', label: 'Rent', variant: 'secondary', onSelect: onRent },
                ]}
            />,
        );
        return { onBuy, onRent };
    };

    /** The full-bleed control behind a panel's content. */
    const panelOf = (name: RegExp) => screen.getByRole('button', { name });

    it('expands the first panel by default', () => {
        renderGallery();

        expect(panelOf(/^Belgrade/)).toHaveAttribute('aria-current', 'true');
        expect(panelOf(/^Ohrid/)).toHaveAttribute('aria-current', 'false');
    });

    it('expands a panel on click without navigating anywhere', () => {
        const { onBuy, onRent } = renderGallery();

        fireEvent.click(panelOf(/^Ohrid/));

        expect(panelOf(/^Ohrid/)).toHaveAttribute('aria-current', 'true');
        expect(onBuy).not.toHaveBeenCalled();
        expect(onRent).not.toHaveBeenCalled();
    });

    it('expands a panel on hover', () => {
        renderGallery();

        fireEvent.pointerEnter(panelOf(/^Ohrid/).parentElement!);

        expect(panelOf(/^Ohrid/)).toHaveAttribute('aria-current', 'true');
    });

    it('expands a panel on keyboard focus', () => {
        renderGallery();

        fireEvent.focus(panelOf(/^Ohrid/));

        expect(panelOf(/^Ohrid/)).toHaveAttribute('aria-current', 'true');
    });

    it('runs the action for the panel it belongs to', () => {
        const { onBuy, onRent } = renderGallery();

        // Only the expanded panel's buttons are exposed, so a plain query
        // always addresses the panel a visitor can actually see.
        fireEvent.click(screen.getByRole('button', { name: 'Buy' }));
        expect(onBuy).toHaveBeenCalledWith(items[0]);

        fireEvent.click(panelOf(/^Ohrid/));
        fireEvent.click(screen.getByRole('button', { name: 'Rent' }));
        expect(onRent).toHaveBeenCalledWith(items[1]);
    });

    it('keeps the buttons of collapsed panels mounted but unreachable', () => {
        renderGallery();

        // Mounted, so a panel collapsing under the pointer cannot strand focus
        // on a button that disappeared — but hidden from the accessibility
        // tree and out of the tab order, so nobody can press a button
        // belonging to a panel they cannot see.
        // Queried by text, not by role+name: an `aria-hidden` button has no
        // accessible name to match on — which is the point of the assertion.
        const buyButtons = screen.getAllByText('Buy');
        expect(buyButtons).toHaveLength(2);
        expect(buyButtons[0]).toHaveAttribute('tabindex', '0');
        expect(buyButtons[1]).toHaveAttribute('tabindex', '-1');
        expect(buyButtons[1]).toHaveAttribute('aria-hidden', 'true');
    });

    it('keeps the label when a photo fails to load', () => {
        renderGallery();

        fireEvent.error(screen.getByAltText('Ohrid'));

        expect(screen.queryByAltText('Ohrid')).not.toBeInTheDocument();
        expect(panelOf(/^Ohrid/)).toBeInTheDocument();
    });

    it('renders nothing without items', () => {
        const { container } = render(
            <ElasticGallery items={[]} label="Explore cities" actions={[]} />,
        );

        expect(container).toBeEmptyDOMElement();
    });
});

describe('pickShowcaseCities', () => {
    const city = (id: string, country: string): ShowcaseCity => ({
        id,
        city: id,
        country,
        searchQuery: id,
        imageUrl: `https://img/${id}.jpg`,
    });

    const pool: ShowcaseCity[] = [
        city('tirana', 'Albania'),
        city('durres', 'Albania'),
        city('vlora', 'Albania'),
        city('split', 'Croatia'),
        city('zagreb', 'Croatia'),
        city('ohrid', 'North Macedonia'),
        city('kotor', 'Montenegro'),
    ];

    /** Deterministic stand-in for Math.random, so a pick can be asserted. */
    const sequence = (values: number[]) => {
        let i = 0;
        return () => values[i++ % values.length];
    };

    it('prefers a different country for every panel', () => {
        const picked = pickShowcaseCities(pool, 4, sequence([0.1, 0.9, 0.4, 0.7, 0.2, 0.5]));

        const countries = picked.map(c => c.country);
        expect(new Set(countries).size).toBe(countries.length);
    });

    it('fills the remaining slots once every country is represented', () => {
        // Four countries in the pool, six slots: the last two have to double up
        // rather than leaving the gallery short.
        const picked = pickShowcaseCities(pool, 6, sequence([0.3, 0.8, 0.1, 0.6]));

        expect(picked).toHaveLength(6);
        expect(new Set(picked.map(c => c.id)).size).toBe(6);
    });

    it('never returns more than the pool holds', () => {
        expect(pickShowcaseCities(pool.slice(0, 2), 6, sequence([0.5]))).toHaveLength(2);
        expect(pickShowcaseCities([], 6)).toEqual([]);
        expect(pickShowcaseCities(pool, 0)).toEqual([]);
    });

    it('draws a different set as the randomness changes', () => {
        // What "random on every visit" actually means: two draws over the same
        // curated list should not be pinned to the same cities.
        const first = pickShowcaseCities(pool, 3, sequence([0.05, 0.35, 0.65, 0.95]));
        const second = pickShowcaseCities(pool, 3, sequence([0.95, 0.65, 0.35, 0.05]));

        expect(first.map(c => c.id)).not.toEqual(second.map(c => c.id));
    });

    it('leaves the caller\'s list untouched', () => {
        const order = pool.map(c => c.id);

        pickShowcaseCities(pool, 5, sequence([0.2, 0.7, 0.4]));

        // The array belongs to the React Query cache — shuffling it in place
        // would reorder it for every other reader of that cache entry.
        expect(pool.map(c => c.id)).toEqual(order);
    });
});
