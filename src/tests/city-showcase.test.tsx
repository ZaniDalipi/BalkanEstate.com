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

    const renderGallery = (defaultActionId?: string) => {
        const onBuy = vi.fn();
        const onRent = vi.fn();
        render(
            <ElasticGallery
                items={items}
                label="Explore cities"
                defaultActionId={defaultActionId}
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

        // `pointerType` has to be stated: jsdom's synthetic pointer event
        // leaves it undefined, and the panel deliberately ignores anything
        // that is not a real mouse or pen so a touch scroll cannot reshuffle
        // the gallery.
        fireEvent.pointerEnter(panelOf(/^Ohrid/).parentElement!, { pointerType: 'mouse' });

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

    it('runs the default action when the expanded panel itself is clicked', () => {
        const { onBuy, onRent } = renderGallery('buy');

        // Belgrade is expanded from the start, so this is the second click a
        // touch visitor makes — and the first a mouse visitor makes, hover
        // having expanded the panel already.
        fireEvent.click(panelOf(/Belgrade/));

        expect(onBuy).toHaveBeenCalledWith(items[0]);
        expect(onRent).not.toHaveBeenCalled();
    });

    it('still only expands when a collapsed panel is clicked', () => {
        const { onBuy } = renderGallery('buy');

        fireEvent.click(panelOf(/^Ohrid/));

        // The first tap reveals the panel; nothing navigates off a sliver.
        expect(panelOf(/Ohrid/)).toHaveAttribute('aria-current', 'true');
        expect(onBuy).not.toHaveBeenCalled();

        fireEvent.click(panelOf(/Ohrid/));
        expect(onBuy).toHaveBeenCalledWith(items[1]);
    });

    it('names the expanded panel by what clicking it does', () => {
        renderGallery('buy');

        // A screen-reader user cannot see the panel widen, so the two states
        // have to differ in the name they announce.
        expect(screen.getByRole('button', { name: 'Buy — Belgrade, Serbia' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Ohrid, North Macedonia' })).toBeInTheDocument();
    });

    it('leaves the panel expand-only when the default names no action', () => {
        const { onBuy, onRent } = renderGallery('compare');

        fireEvent.click(panelOf(/^Belgrade/));

        expect(onBuy).not.toHaveBeenCalled();
        expect(onRent).not.toHaveBeenCalled();
    });

    it('keeps the action buttons working alongside the default', () => {
        const { onBuy, onRent } = renderGallery('buy');

        // Rent has no other way in, so the buttons must survive the panel
        // becoming clickable.
        fireEvent.click(screen.getByRole('button', { name: 'Rent' }));

        expect(onRent).toHaveBeenCalledWith(items[0]);
        expect(onBuy).not.toHaveBeenCalled();
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

    it('asks for a small candidate while a panel is collapsed and a large one once it expands', () => {
        // The mobile cost this controls: five of six panels start as ~44px
        // slivers, and letting each claim the viewport width had a phone pull
        // six full-size photos before the visitor had seen one.
        render(
            <ElasticGallery
                items={items.map(item => ({
                    ...item,
                    imageSrcSet: `${item.imageUrl} 320w, ${item.imageUrl} 1280w`,
                    imageSizes: '100vw',
                    collapsedImageSizes: '30vw',
                }))}
                label="Explore cities"
                actions={[]}
            />,
        );

        expect(screen.getByAltText('Belgrade')).toHaveAttribute('sizes', '100vw');
        expect(screen.getByAltText('Ohrid')).toHaveAttribute('sizes', '30vw');

        fireEvent.click(panelOf(/^Ohrid/));

        // Same `srcSet`, new hint — the browser re-picks, and keeps painting
        // the small file until the larger one has decoded.
        expect(screen.getByAltText('Ohrid')).toHaveAttribute('sizes', '100vw');
        expect(screen.getByAltText('Belgrade')).toHaveAttribute('sizes', '30vw');
    });

    it('falls back to one sizes hint when the caller gives no collapsed one', () => {
        render(
            <ElasticGallery
                items={items.map(item => ({ ...item, imageSizes: '100vw' }))}
                label="Explore cities"
                actions={[]}
            />,
        );

        expect(screen.getByAltText('Ohrid')).toHaveAttribute('sizes', '100vw');
    });

    it('loads only the first panel eagerly', () => {
        renderGallery();

        // The gallery sits in the hero, so panel one is usually the LCP
        // element. Marking all six priority would queue five photos nobody is
        // looking at ahead of the one they are.
        expect(screen.getByAltText('Belgrade')).toHaveAttribute('loading', 'eager');
        expect(screen.getByAltText('Belgrade')).toHaveAttribute('fetchpriority', 'high');
        expect(screen.getByAltText('Ohrid')).toHaveAttribute('loading', 'lazy');
    });

    it('shows a shimmer in each panel until its photo arrives', () => {
        const { container } = render(
            <ElasticGallery items={items} label="Explore cities" actions={[]} />,
        );

        expect(container.querySelectorAll('.image-shimmer')).toHaveLength(2);

        fireEvent.load(screen.getByAltText('Belgrade'));

        expect(container.querySelectorAll('.image-shimmer')).toHaveLength(1);
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

    it('shows a photo credit when the item carries one', () => {
        render(
            <ElasticGallery
                items={[{ ...items[0], credit: 'Photo by Evangelos Mpikakis on Unsplash' }, items[1]]}
                label="Explore cities"
                actions={[]}
            />,
        );

        expect(screen.getByText('Photo by Evangelos Mpikakis on Unsplash')).toBeInTheDocument();
    });

    it('renders no credit caption at all when the item has none', () => {
        renderGallery(); // neither item carries a `credit`

        expect(screen.queryByText(/photo by/i)).not.toBeInTheDocument();
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
