/**
 * City Showcase Tests
 * Covers the two places the home-page gallery can go wrong: the data it
 * accepts from the API, and the two-step interaction that decides when a panel
 * expands versus when it navigates.
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

    const renderGallery = (onItemSelect = vi.fn()) => {
        render(
            <ElasticGallery
                items={items}
                label="Explore cities"
                actionLabel="View properties"
                onItemSelect={onItemSelect}
            />,
        );
        return onItemSelect;
    };

    it('expands the first panel by default', () => {
        renderGallery();

        expect(screen.getByRole('button', { name: /Belgrade/ })).toHaveAttribute('aria-current', 'true');
        expect(screen.getByRole('button', { name: /Ohrid/ })).toHaveAttribute('aria-current', 'false');
    });

    it('expands an inactive panel on the first click instead of selecting it', () => {
        const onSelect = renderGallery();

        fireEvent.click(screen.getByRole('button', { name: /Ohrid/ }));

        expect(onSelect).not.toHaveBeenCalled();
        expect(screen.getByRole('button', { name: /Ohrid/ })).toHaveAttribute('aria-current', 'true');
    });

    it('selects on a click on the already-expanded panel', () => {
        const onSelect = renderGallery();

        fireEvent.click(screen.getByRole('button', { name: /Belgrade/ }));

        expect(onSelect).toHaveBeenCalledWith(items[0]);
    });

    it('selects on the first mouse click, because hover already expanded the panel', () => {
        const onSelect = renderGallery();
        const panel = screen.getByRole('button', { name: /Ohrid/ });

        fireEvent.pointerEnter(panel, { pointerType: 'mouse' });
        fireEvent.click(panel);

        expect(onSelect).toHaveBeenCalledWith(items[1]);
    });

    it('does not navigate on the first tap, even though a tap synthesises hover and focus', () => {
        // A touchscreen sends pointerenter and focus before the click. If
        // either expanded the panel, the tap's own click would read as a
        // click on the active panel and navigate immediately.
        const onSelect = renderGallery();
        const panel = screen.getByRole('button', { name: /Ohrid/ });

        fireEvent.pointerEnter(panel, { pointerType: 'touch' });
        fireEvent.pointerDown(panel, { pointerType: 'touch' });
        fireEvent.focus(panel);
        fireEvent.click(panel);

        expect(onSelect).not.toHaveBeenCalled();
        expect(panel).toHaveAttribute('aria-current', 'true');

        fireEvent.pointerDown(panel, { pointerType: 'touch' });
        fireEvent.click(panel);

        expect(onSelect).toHaveBeenCalledWith(items[1]);
    });

    it('expands on keyboard focus, which arrives without a pointer press', () => {
        renderGallery();
        const panel = screen.getByRole('button', { name: /Ohrid/ });

        fireEvent.focus(panel);

        expect(panel).toHaveAttribute('aria-current', 'true');
    });

    it('selects on Enter without needing a second key press', () => {
        const onSelect = renderGallery();
        const panel = screen.getByRole('button', { name: /Ohrid/ });

        fireEvent.focus(panel);
        fireEvent.keyDown(panel, { key: 'Enter' });

        expect(onSelect).toHaveBeenCalledWith(items[1]);
    });

    it('keeps the label when a photo fails to load', () => {
        renderGallery();

        fireEvent.error(screen.getByAltText('Ohrid'));

        expect(screen.queryByAltText('Ohrid')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Ohrid/ })).toBeInTheDocument();
    });

    it('renders nothing without items', () => {
        const { container } = render(
            <ElasticGallery items={[]} label="Explore cities" actionLabel="View properties" />,
        );

        expect(container).toBeEmptyDOMElement();
    });
});
