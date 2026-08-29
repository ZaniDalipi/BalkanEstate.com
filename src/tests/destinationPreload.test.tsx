/**
 * How the destination corridor spends a phone's connection.
 *
 * The corridor is backed by a couple of hundred places, and every one of them
 * is a large portrait photo. What is tested here is that the section never puts
 * more than a handful of them on the wire at once: the rest of the home page —
 * the hero, the city gallery — is competing for the same connection, and it is
 * the part the visitor is actually looking at.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDestinationImages } from '../features/home/hooks/useDestinationImages';
import type { VillaDestination } from '../features/home/data/villaDestinations';

/** Every photo this hook started, in order, still holding its handlers. */
interface StartedImage {
    url: string;
    priority: string;
    finish: () => void;
    fail: () => void;
}

let started: StartedImage[];

const destinations: VillaDestination[] = Array.from({ length: 30 }, (_, i) => ({
    id: `d${i}`,
    fallback: `Place ${i}`,
    query: `Place ${i}`,
    country: 'Albania',
    imageCity: `City${i}`,
    imageCountry: 'Albania',
    center: [42.39, 19.77] as const,
    zoom: 12,
}));

const run = () =>
    renderHook(() =>
        useDestinationImages(destinations, d => d.fallback, d => d.fallback, () => undefined),
    );

beforeEach(() => {
    started = [];
    vi.useFakeTimers();

    // jsdom never fetches, so completion is driven by hand — which is the only
    // way to observe a queue that advances on completion.
    class FakeImage {
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        decoding = '';
        fetchPriority = 'auto';
        set src(url: string) {
            started.push({
                url,
                priority: this.fetchPriority,
                finish: () => this.onload?.(),
                fail: () => this.onerror?.(),
            });
        }
    }
    vi.stubGlobal('Image', FakeImage as unknown as typeof Image);
});

afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
});

describe('useDestinationImages — preloading', () => {
    it('starts only the first screenful immediately', () => {
        run();

        // Ten, not thirty: the corridor shows 6-8 cards and cycles slowly, so
        // everything past the first wave can wait.
        expect(started).toHaveLength(10);
        expect(started.every(img => img.priority === 'auto')).toBe(true);
    });

    it('drains the tail through a bounded queue instead of releasing it at once', () => {
        run();

        act(() => {
            vi.advanceTimersByTime(1300);
        });

        // The regression this guards: the tail used to be released in a single
        // batch, which on the real list meant ~200 large photos in flight
        // 1.2 seconds into the page.
        expect(started).toHaveLength(14);
        expect(started.slice(10).every(img => img.priority === 'low')).toBe(true);
    });

    it('starts the next photo only when one finishes', () => {
        run();
        act(() => {
            vi.advanceTimersByTime(1300);
        });

        act(() => {
            started[10].finish();
        });

        expect(started).toHaveLength(15);
    });

    it('keeps the queue moving when a photo fails', () => {
        run();
        act(() => {
            vi.advanceTimersByTime(1300);
        });

        // A destination whose photo was never seeded must not park a worker
        // forever — every photo behind it in the queue depends on this.
        act(() => {
            started[11].fail();
        });

        expect(started).toHaveLength(15);
    });

    it('stops the queue when the section unmounts', () => {
        const { unmount } = run();
        act(() => {
            vi.advanceTimersByTime(1300);
        });
        const inFlight = started[12];

        unmount();
        act(() => {
            inFlight.finish();
        });

        // A late completion after unmount can neither set state nor pull
        // another photo off the queue.
        expect(started).toHaveLength(14);
    });
});
