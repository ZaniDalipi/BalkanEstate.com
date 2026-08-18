import { useEffect, useMemo, useState } from 'react';
import { getCityImageUrl } from '@/config/cloudinaryConfig';
import type { VillaDestination } from '../data/villaDestinations';

/** Card aspect in the corridor is 18:25, so ask Cloudinary for a portrait crop. */
const IMAGE_WIDTH = 480;
const IMAGE_HEIGHT = 666;

/** Brand-toned gradient pairs — gold, emerald and navy, cycled per destination. */
const PLACEHOLDER_STOPS: readonly (readonly [string, string])[] = [
    ['#1B2B44', '#0B1220'],
    ['#B8860B', '#2C1A00'],
    ['#0E5A46', '#08201A'],
    ['#2A3550', '#101B2D'],
];

/**
 * A tiny inline SVG gradient. Used as the first frame for every card so the
 * corridor is solid immediately — an empty `src` would render a transparent
 * card and tear a hole in the ribbon while the network is still working.
 */
export function gradientDataUri(index: number): string {
    const [from, to] = PLACEHOLDER_STOPS[index % PLACEHOLDER_STOPS.length];
    const svg =
        `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="66" viewBox="0 0 48 66">` +
        `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
        `<stop offset="0%" stop-color="${from}"/><stop offset="100%" stop-color="${to}"/>` +
        `</linearGradient></defs><rect width="48" height="66" fill="url(#g)"/></svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export interface ResolvedDestinationImage {
    src: string;
    alt: string;
    label: string;
}

/**
 * Resolves each destination to a Cloudinary city photo, falling back to a
 * gradient.
 *
 * The corridor renders gradients on the first frame and swaps in each photo
 * only once it has actually decoded. Preloading out here — rather than reacting
 * to an `onError` inside the corridor — means a missing Cloudinary asset simply
 * never swaps in: no broken-image icon, no gap, and the vendored component
 * stays untouched.
 *
 * @param destinations Destinations to resolve, in display order.
 * @param labelFor     Accessible label for a destination's card.
 */
export function useDestinationImages(
    destinations: readonly VillaDestination[],
    labelFor: (dest: VillaDestination) => string,
): ResolvedDestinationImage[] {
    const [loaded, setLoaded] = useState<Record<string, string>>({});

    // Stable identity for the effect: the set of destinations that need photos.
    const sources = useMemo(
        () =>
            destinations.map(dest => ({
                id: dest.id,
                url: getCityImageUrl(dest.imageCity, {
                    country: dest.imageCountry,
                    width: IMAGE_WIDTH,
                    height: IMAGE_HEIGHT,
                    crop: 'fill',
                    gravity: 'auto',
                }),
            })),
        [destinations],
    );

    useEffect(() => {
        let cancelled = false;
        const images: HTMLImageElement[] = [];

        for (const { id, url } of sources) {
            const img = new Image();
            img.decoding = 'async';
            img.onload = () => {
                if (!cancelled) setLoaded(prev => (prev[id] ? prev : { ...prev, [id]: url }));
            };
            // No onerror handler needed beyond silence: the gradient stays.
            img.onerror = null;
            img.src = url;
            images.push(img);
        }

        return () => {
            cancelled = true;
            // Drop handlers so a late load can't set state after unmount.
            for (const img of images) img.onload = null;
        };
    }, [sources]);

    return useMemo(
        () =>
            destinations.map((dest, i) => ({
                src: loaded[dest.id] ?? gradientDataUri(i),
                // The corridor is decorative; the button's label carries the meaning.
                alt: '',
                label: labelFor(dest),
            })),
        [destinations, loaded, labelFor],
    );
}
