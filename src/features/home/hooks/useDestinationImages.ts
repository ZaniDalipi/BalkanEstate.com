import { useEffect, useMemo, useState } from 'react';
import { getCityImageUrl, optimizeCloudinaryUrl } from '@/config/cloudinaryConfig';
import { useImageBudget, type ImageBudget } from '@/src/shared/hooks/useImageBudget';
import type { VillaDestination } from '../data/villaDestinations';

/**
 * The corridor card is 18 wide by 25 tall in the geometry's own units, so
 * every request keeps exactly that ratio. Asking for any other shape would
 * make Cloudinary's `c_fill` throw away more of the photo than the card
 * actually hides, and asking for one that disagrees with the card would leave
 * `object-cover` to crop the difference a second time. Deriving the height
 * from the width is what stops the two drifting apart.
 */
const CARD_ASPECT = 18 / 25;

/**
 * Widest image worth fetching. The master stored on upload is 2200px, so
 * anything beyond this is Cloudinary upscaling — more bytes, no more detail.
 */
const MAX_IMAGE_WIDTH = 2200;

/**
 * The same ceiling for a metered or 2G/3G connection. A corridor card is a
 * moving, perspective-warped tile that is never still for long, so the detail
 * a 1400px file has over a 1000px one is detail this section cannot show —
 * while the bytes are the visitor's either way.
 */
const MAX_IMAGE_WIDTH_LITE = 1000;

/**
 * How wide a photo has to be to look sharp on this device.
 *
 * A fixed 900px was too small on a phone and wasteful on a laptop, because
 * what matters is CSS width times device pixel ratio, and a 3x phone asks for
 * three device pixels per CSS pixel. Measured on the real corridor: a
 * mid-corridor card on a 390px phone at 3x needs about 1080 device pixels
 * across, and the large cards near the frame edge need several thousand. The
 * multiplier targets the big readable cards rather than the ones sweeping off
 * the edges — matching those exactly would mean multi-megabyte downloads for
 * pixels that are mostly off-screen anyway.
 */
function idealImageWidth(budget: ImageBudget = 'full'): number {
    if (typeof window === 'undefined') return 1400;
    const lite = budget === 'lite';
    // A saver-mode visitor gets the 2x file a 3x screen can still show
    // convincingly at this size, not the 3x one.
    const dpr = Math.min(window.devicePixelRatio || 1, lite ? 2 : 3);
    const target = window.innerWidth * dpr * (lite ? 1 : 1.2);
    const ceiling = lite ? MAX_IMAGE_WIDTH_LITE : MAX_IMAGE_WIDTH;
    return Math.round(Math.min(ceiling, Math.max(lite ? 700 : 900, target)));
}

/** Photos fetched immediately — comfortably more than the corridor shows at once. */
const EAGER_COUNT = 10;
const EAGER_COUNT_LITE = 6;
/** How long the rest waits, so it lands after the first wave and the page settle. */
const DEFER_REST_MS = 1200;

/**
 * How many of the tail photos may be in flight at once.
 *
 * The tail is the part that hurt: the destination list runs to a couple of
 * hundred places, and releasing all of them at a fixed delay put every
 * remaining photo on the wire together — on a phone, tens of megabytes
 * competing for the same few connections as the hero and the city gallery the
 * visitor is actually looking at. A queue of two or four keeps the corridor
 * ahead of what it is about to show without ever being the reason something
 * else on the page is waiting.
 */
const TAIL_CONCURRENCY = 4;
const TAIL_CONCURRENCY_LITE = 2;

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
    /** Full sentence for assistive tech. */
    label: string;
    /** Short place name printed on the card. */
    caption: string;
    /** Country, printed under the name. */
    sublabel: string;
    /** Photo credit, printed small under the country. Absent while the card
     *  is still showing its gradient placeholder. */
    credit?: string;
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
    captionFor: (dest: VillaDestination) => string,
    /**
     * Credit line for the photo actually on screen. Passed in rather than
     * built here because the wording is translated, and the hook has no `t`.
     */
    creditFor: (dest: VillaDestination) => string | undefined,
): ResolvedDestinationImage[] {
    const [loaded, setLoaded] = useState<Record<string, string>>({});

    // What this connection should be asked to carry. Read once, like the width
    // below, and for the same reason: it is an input to every URL here.
    const budget = useImageBudget();

    // Resolved once per mount rather than per render: the width only changes
    // if the device changes, and recomputing it inside the memo would make
    // every render produce fresh URLs and refetch every photo.
    const [imageWidth] = useState(() => idealImageWidth(budget));
    const imageHeight = Math.round(imageWidth / CARD_ASPECT);
    // `auto:best` is worth its bytes on a fast link, where these are the
    // largest photos on the page. On a metered one it is the first thing to
    // give up: `auto:good` is Cloudinary's own "looks right, costs less".
    const quality = budget === 'lite' ? ('auto:good' as const) : ('auto:best' as const);

    // Stable identity for the effect: the set of destinations that need photos.
    const sources = useMemo(
        () =>
            destinations.map(dest => ({
                id: dest.id,
                // An admin-curated photo always wins; the seeded city image is
                // only the stand-in for places nobody has curated yet.
                //
                // The curated one goes through the same crop as the seeded
                // ones rather than being used as uploaded. The card is a
                // fixed 18:25 portrait, so an upload of any other shape has
                // to lose something — `c_fill` with `g_auto` makes Cloudinary
                // pick the crop around the subject instead of blindly taking
                // the middle, and asking for the card's exact size stops a
                // large original being downloaded in full and squeezed by the
                // browser. `optimizeCloudinaryUrl` strips any transform
                // already baked into the stored URL first, and returns
                // non-Cloudinary URLs untouched.
                url: dest.imageUrl
                    ? optimizeCloudinaryUrl(dest.imageUrl, {
                        width: imageWidth,
                        height: imageHeight,
                        crop: 'fill',
                        gravity: 'auto',
                        // These are the hero of the section and are shown very
                        // large; on a fast connection `auto:best` spends the
                        // extra bytes rather than letting Cloudinary trade
                        // detail for size. See `quality` above for what a
                        // metered connection gets instead.
                        quality,
                    }) || dest.imageUrl
                    : getCityImageUrl(dest.imageCity, {
                        country: dest.imageCountry,
                        width: imageWidth,
                        height: imageHeight,
                        crop: 'fill',
                        gravity: 'auto',
                        quality,
                    }),
            })),
        [destinations, imageWidth, imageHeight, quality],
    );

    useEffect(() => {
        let cancelled = false;
        const images: HTMLImageElement[] = [];
        let deferred: number | undefined;

        const isLite = budget === 'lite';

        /**
         * Starts one photo. `onDone` fires on success *and* on failure, which
         * is what keeps the queue below moving past a destination whose photo
         * was never seeded — a stall there would freeze every photo behind it.
         */
        const load = (
            { id, url }: { id: string; url: string },
            priority: 'auto' | 'low',
            onDone?: () => void,
        ) => {
            const img = new Image();
            img.decoding = 'async';
            // A hint, not a guarantee, and ignored outside Chromium — but where
            // it lands it tells the browser these photos may yield to the hero
            // and the city gallery, which are what the visitor is looking at.
            (img as HTMLImageElement & { fetchPriority?: string }).fetchPriority = priority;
            img.onload = () => {
                if (!cancelled) setLoaded(prev => (prev[id] ? prev : { ...prev, [id]: url }));
                onDone?.();
            };
            // A failed photo needs no handling beyond releasing the queue: the
            // card keeps its gradient, which is a finished-looking card rather
            // than a broken-image icon.
            img.onerror = () => onDone?.();
            img.src = url;
            images.push(img);
        };

        // Only the front of the list is fetched up front. The corridor shows
        // 6-8 cards at a time and cycles slowly, so the tail isn't needed for
        // many seconds.
        const eagerCount = isLite ? EAGER_COUNT_LITE : EAGER_COUNT;
        for (const source of sources.slice(0, eagerCount)) {
            if (cancelled) return;
            load(source, 'auto');
        }

        /*
         * The tail — everything the corridor will reach eventually — is drained
         * through a fixed number of workers rather than released in one go.
         * The destination list runs to a couple of hundred places, so "the
         * rest, after a delay" was in practice "every photo at once, 1.2
         * seconds in": a phone spent the whole of that connection on cards it
         * would not show for minutes, while the photos on screen waited behind
         * them. Each worker starts the next photo only when its own has
         * finished, so the corridor stays ahead of itself at a cost bounded by
         * the number of workers.
         */
        const rest = sources.slice(eagerCount);
        if (rest.length > 0) {
            deferred = window.setTimeout(() => {
                let next = 0;
                const pump = () => {
                    if (cancelled) return;
                    const source = rest[next++];
                    if (!source) return;
                    load(source, 'low', pump);
                };
                const workers = Math.min(isLite ? TAIL_CONCURRENCY_LITE : TAIL_CONCURRENCY, rest.length);
                for (let i = 0; i < workers; i++) pump();
            }, DEFER_REST_MS);
        }

        return () => {
            cancelled = true;
            if (deferred !== undefined) window.clearTimeout(deferred);
            // Drop handlers so a late load can't set state after unmount, and
            // so a in-flight photo cannot pump the queue for a dead component.
            for (const img of images) {
                img.onload = null;
                img.onerror = null;
            }
        };
    }, [budget, sources]);

    return useMemo(
        () =>
            destinations.map((dest, i) => ({
                src: loaded[dest.id] ?? gradientDataUri(i),
                // The photo is decorative; the button's label carries the meaning.
                alt: '',
                label: labelFor(dest),
                caption: captionFor(dest),
                sublabel: dest.country,
                // Only once the photograph has actually decoded. Until then the
                // card is showing a generated gradient, and crediting a
                // photographer for that would be plainly wrong.
                credit: loaded[dest.id] ? creditFor(dest) : undefined,
            })),
        [destinations, loaded, labelFor, captionFor, creditFor],
    );
}
