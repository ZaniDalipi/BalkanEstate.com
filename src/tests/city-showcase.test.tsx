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
