/**
 * Photo credits on the destination cards.
 *
 * Stock libraries require the photographer to be named wherever their picture
 * appears, so the credit has to survive the whole path — from the record, to
 * the card, and only for the picture actually on screen. Crediting a
 * photographer while the card is still showing a generated gradient would be
 * plainly wrong, so the gating is tested as carefully as the rendering.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, renderHook, waitFor } from '@testing-library/react';
import { ImageStreamHero } from '@/components/ui/image-stream-hero';
import { useDestinationImages } from '../features/home/hooks/useDestinationImages';
import type { VillaDestination } from '../features/home/data/villaDestinations';

const dest = (over: Partial<VillaDestination> = {}): VillaDestination => ({
    id: 'theth',
    fallback: 'Theth',
    query: 'Theth',
    country: 'Albania',
    imageCity: 'Shkoder',
    imageCountry: 'Albania',
    center: [42.39, 19.77] as const,
    zoom: 12,
    ...over,
});

describe('the card renders a credit when it has one', () => {
    it('prints the credit under the name', () => {
        render(
            <ImageStreamHero
                images={[{ src: 'x', alt: '', label: 'L', caption: 'Theth', sublabel: 'ALBANIA', credit: 'Photo: Ada L / Unsplash' }]}
                onImageSelect={() => {}}
                cards={2}
            />,
        );
        expect(screen.getAllByText('Photo: Ada L / Unsplash').length).toBeGreaterThan(0);
    });

    it('prints nothing when there is no credit', () => {
        render(
            <ImageStreamHero
                images={[{ src: 'x', alt: '', label: 'L', caption: 'Theth', sublabel: 'ALBANIA' }]}
                onImageSelect={() => {}}
                cards={2}
            />,
        );
        expect(screen.queryByText(/Unsplash|Wikimedia/)).toBeNull();
    });
});

describe('useDestinationImages — when a credit is attached', () => {
    // jsdom never loads an image, so the hook would never leave its gradient.
    // A stub that fires onload lets the "photo is really on screen" branch run.
    let loads: boolean;
    beforeEach(() => {
        loads = true;
        class FakeImage {
            onload: (() => void) | null = null;
            onerror: (() => void) | null = null;
            decoding = '';
            set src(_v: string) {
                if (loads) setTimeout(() => this.onload?.(), 0);
            }
        }
        vi.stubGlobal('Image', FakeImage as unknown as typeof Image);
    });
    afterEach(() => vi.unstubAllGlobals());

    const creditFor = (d: VillaDestination) =>
        d.imageUrl
            ? (d.imageCredit ? `Photo: ${d.imageCredit} / Unsplash` : undefined)
            : '© Wikimedia Commons';

    const run = (d: VillaDestination) =>
        renderHook(() =>
            useDestinationImages([d], x => x.fallback, x => x.fallback, creditFor),
        );

    it('credits the photographer of a stock photo', async () => {
        const { result } = run(dest({ imageUrl: 'https://res.cloudinary.com/x/image/upload/a.jpg', imageCredit: 'Ada L' }));
        await waitFor(() => expect(result.current[0].credit).toBe('Photo: Ada L / Unsplash'));
    });

    it('credits Wikimedia when the card is on the seeded city photo', async () => {
        const { result } = run(dest());
        await waitFor(() => expect(result.current[0].credit).toBe('© Wikimedia Commons'));
    });

    it('credits nobody for a photo an admin uploaded themselves', async () => {
        const { result } = run(dest({ imageUrl: 'https://res.cloudinary.com/x/image/upload/own.jpg' }));
        await waitFor(() => expect(result.current[0].src).toContain('cloudinary'));
        expect(result.current[0].credit).toBeUndefined();
    });

    it('credits nobody while the card is still a gradient', () => {
        loads = false; // the photo never arrives
        const { result } = run(dest());
        expect(result.current[0].src.startsWith('data:image/svg+xml')).toBe(true);
        expect(result.current[0].credit).toBeUndefined();
    });
});
