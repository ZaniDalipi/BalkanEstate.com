/**
 * The AI assistant's swipe deck.
 *
 * These cover the three ways the deck used to stop working: the incoming match
 * list changing identity under a half-finished session (which snapped the deck
 * back to card one), a swipe not actually advancing, and undo leaving a
 * favourite behind. Drag gestures themselves belong to framer-motion and are
 * exercised through the buttons and keyboard, which run the same handler.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitForElementToBeRemoved } from '@testing-library/react';
import PropertySwipeDeck, { collectCardImages } from '@/src/features/search/components/swipe/PropertySwipeDeck';
import type { Property } from '@/types';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string, options?: unknown) => {
            if (typeof options === 'string') return options;
            if (options && typeof options === 'object') {
                const opts = options as { defaultValue?: string; count?: number };
                if (opts.defaultValue) {
                    return opts.defaultValue.replace('{{count}}', String(opts.count ?? ''));
                }
            }
            return key;
        },
    }),
}));

const makeProperty = (id: string, overrides: Partial<Property> = {}): Property => ({
    id,
    title: `Property ${id}`,
    sellerId: 'seller-1',
    listingType: 'sale',
    status: 'active',
    price: 120000,
    address: 'Rruga 1',
    city: 'Tirana',
    country: 'Albania',
    beds: 2,
    baths: 1,
    livingRooms: 1,
    sqft: 80,
    yearBuilt: 2015,
    parking: 1,
    description: 'A place',
    specialFeatures: [],
    materials: [],
    amenities: [],
    imageUrl: `https://res.cloudinary.com/demo/image/upload/v1/${id}.jpg`,
    images: [],
    lat: 41.3,
    lng: 19.8,
    seller: { id: 'seller-1', name: 'Seller', type: 'agent' },
    propertyType: 'apartment',
    ...overrides,
} as unknown as Property);

interface HarnessOverrides {
    properties?: Property[];
    savedIds?: Set<string>;
    canSave?: boolean;
    onToggleSave?: (property: Property, shouldSave: boolean) => void;
    onRequireAuth?: () => void;
    onViewProperty?: (property: Property) => void;
    onClose?: () => void;
    onGoToFavorites?: () => void;
}

function renderDeck(overrides: HarnessOverrides = {}) {
    const savedIds = overrides.savedIds ?? new Set<string>();
    const onToggleSave = overrides.onToggleSave ?? vi.fn();
    const props = {
        isOpen: true,
        properties: overrides.properties ?? [makeProperty('a'), makeProperty('b'), makeProperty('c')],
        onClose: overrides.onClose ?? vi.fn(),
        onGoToFavorites: overrides.onGoToFavorites ?? vi.fn(),
        onViewProperty: overrides.onViewProperty ?? vi.fn(),
        isSaved: (property: Property) => savedIds.has(property.id),
        onToggleSave,
        canSave: overrides.canSave ?? true,
        onRequireAuth: overrides.onRequireAuth ?? vi.fn(),
    };
    const view = render(<PropertySwipeDeck {...props} />);
    return { ...view, props, onToggleSave };
}

const progress = () => screen.getByTestId('swipe-progress').textContent;
const savedCount = () => screen.getByTestId('swipe-saved-count').textContent;
// The i18n mock above resolves a key to its inline fallback, so the buttons
// carry the English labels.
const save = () => fireEvent.click(screen.getByRole('button', { name: 'Save' }));
const skip = () => fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
const undo = () => fireEvent.click(screen.getByRole('button', { name: 'Undo last swipe' }));

describe('collectCardImages', () => {
    it('puts the main image first and drops duplicates', () => {
        const property = makeProperty('a', {
            imageUrl: 'https://cdn/one.jpg',
            images: [{ url: 'https://cdn/one.jpg' }, { url: 'https://cdn/two.jpg' }] as Property['images'],
        });

        expect(collectCardImages(property)).toEqual(['https://cdn/one.jpg', 'https://cdn/two.jpg']);
    });

    it('tolerates a gallery of plain strings and empty entries', () => {
        const property = makeProperty('a', {
            imageUrl: 'https://cdn/one.jpg',
            images: ['https://cdn/two.jpg', '', null] as unknown as Property['images'],
        });

        expect(collectCardImages(property)).toEqual(['https://cdn/one.jpg', 'https://cdn/two.jpg']);
    });
});

describe('PropertySwipeDeck', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('advances one card per swipe', () => {
        renderDeck();

        expect(progress()).toBe('1 / 3');
        skip();
        expect(progress()).toBe('2 / 3');
        save();
        expect(progress()).toBe('3 / 3');
    });

    it('advances twice when two swipes land back to back', () => {
        renderDeck();

        act(() => {
            skip();
            skip();
        });

        expect(progress()).toBe('3 / 3');
    });

    it('saves on a right swipe and not on a left one', () => {
        const onToggleSave = vi.fn();
        const properties = [makeProperty('a'), makeProperty('b'), makeProperty('c')];
        renderDeck({ properties, onToggleSave });

        save();
        expect(onToggleSave).toHaveBeenCalledWith(properties[0], true);
        expect(savedCount()).toContain('1');

        skip();
        expect(onToggleSave).toHaveBeenCalledTimes(1);
        expect(savedCount()).toContain('1');
    });

    it('does not re-save a property that is already a favourite', () => {
        const properties = [makeProperty('a'), makeProperty('b')];
        const onToggleSave = vi.fn();
        renderDeck({ properties, onToggleSave, savedIds: new Set(['a']) });

        save();

        expect(onToggleSave).not.toHaveBeenCalled();
        expect(savedCount()).toContain('1');
    });

    it('keeps its place when the incoming match list is replaced mid-session', () => {
        // The search page re-runs its query and every favourite toggle
        // re-renders the context, so the array identity churns constantly.
        const first = [makeProperty('a'), makeProperty('b'), makeProperty('c')];
        const { rerender, props } = renderDeck({ properties: first });

        skip();
        expect(progress()).toBe('2 / 3');

        rerender(<PropertySwipeDeck {...props} properties={[...first]} />);
        expect(progress()).toBe('2 / 3');

        rerender(<PropertySwipeDeck {...props} properties={[makeProperty('x'), makeProperty('y')]} />);
        expect(progress()).toBe('2 / 3');
    });

    it('takes a refreshed match list while the deck is still untouched', () => {
        const { rerender, props } = renderDeck({ properties: [makeProperty('a'), makeProperty('b')] });

        expect(progress()).toBe('1 / 2');

        rerender(<PropertySwipeDeck {...props} properties={[makeProperty('x'), makeProperty('y'), makeProperty('z')]} />);

        expect(progress()).toBe('1 / 3');
    });

    it('undoes a swipe and releases the favourite it created', () => {
        const properties = [makeProperty('a'), makeProperty('b')];
        const onToggleSave = vi.fn();
        renderDeck({ properties, onToggleSave });

        save();
        expect(progress()).toBe('2 / 2');
        expect(savedCount()).toContain('1');

        undo();

        expect(progress()).toBe('1 / 2');
        expect(savedCount()).toContain('0');
        expect(onToggleSave).toHaveBeenLastCalledWith(properties[0], false);
    });

    it('leaves a pre-existing favourite alone when undoing', () => {
        const properties = [makeProperty('a'), makeProperty('b')];
        const onToggleSave = vi.fn();
        renderDeck({ properties, onToggleSave, savedIds: new Set(['a']) });

        save();
        undo();

        expect(onToggleSave).not.toHaveBeenCalled();
        expect(progress()).toBe('1 / 2');
    });

    it('disables undo on the first card', () => {
        renderDeck();

        expect(screen.getByRole('button', { name: 'Undo last swipe' })).toBeDisabled();
        skip();
        expect(screen.getByRole('button', { name: 'Undo last swipe' })).not.toBeDisabled();
    });

    it('asks a signed-out visitor to sign in instead of silently dropping the save', () => {
        const onRequireAuth = vi.fn();
        const onToggleSave = vi.fn();
        renderDeck({ canSave: false, onRequireAuth, onToggleSave });

        save();

        expect(onRequireAuth).toHaveBeenCalled();
        expect(onToggleSave).not.toHaveBeenCalled();
        expect(progress()).toBe('1 / 3');

        // Skipping still works while signed out.
        skip();
        expect(progress()).toBe('2 / 3');
    });

    it('flies the card out in the direction it was swiped', () => {
        renderDeck();

        save();
        expect(screen.getByTestId('swipe-card-flyout')).toHaveAttribute('data-direction', 'right');
    });

    it('drives the deck from the keyboard', () => {
        const onViewProperty = vi.fn();
        const onClose = vi.fn();
        const properties = [makeProperty('a'), makeProperty('b'), makeProperty('c')];
        renderDeck({ properties, onViewProperty, onClose });

        fireEvent.keyDown(window, { key: 'ArrowRight' });
        expect(progress()).toBe('2 / 3');
        expect(savedCount()).toContain('1');

        fireEvent.keyDown(window, { key: 'ArrowLeft' });
        expect(progress()).toBe('3 / 3');

        fireEvent.keyDown(window, { key: 'Backspace' });
        expect(progress()).toBe('2 / 3');

        fireEvent.keyDown(window, { key: 'ArrowUp' });
        expect(onViewProperty).toHaveBeenCalledWith(properties[1]);

        fireEvent.keyDown(window, { key: 'Escape' });
        expect(onClose).toHaveBeenCalled();
    });

    it('opens the property under the cursor, not the first one', () => {
        const onViewProperty = vi.fn();
        const properties = [makeProperty('a'), makeProperty('b')];
        renderDeck({ properties, onViewProperty });

        skip();
        fireEvent.click(screen.getByRole('button', { name: 'View details' }));

        expect(onViewProperty).toHaveBeenCalledWith(properties[1]);
    });

    it('shows the summary once the deck is exhausted and can deal it again', () => {
        renderDeck({ properties: [makeProperty('a')] });

        save();

        expect(screen.getByText('1 properties saved!')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Swipe again' }));
        expect(progress()).toBe('1 / 1');
        expect(savedCount()).toContain('0');
    });

    it('restores page scrolling on close', async () => {
        const { rerender, props } = renderDeck();

        expect(document.body.style.overflow).toBe('hidden');

        rerender(<PropertySwipeDeck {...props} isOpen={false} />);

        expect(document.body.style.overflow).not.toBe('hidden');
        await waitForElementToBeRemoved(() => screen.queryByTestId('swipe-progress'));
    });

    it('stacks at most three cards regardless of deck size', () => {
        renderDeck({ properties: Array.from({ length: 12 }, (_, i) => makeProperty(`p${i}`)) });

        expect(screen.getAllByTestId('swipe-card')).toHaveLength(3);
        expect(progress()).toBe('1 / 12');
    });
});
