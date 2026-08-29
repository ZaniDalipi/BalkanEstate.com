import React, { useCallback, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { validateImageSrc } from '@/src/shared/utils/validation';

export interface ProgressiveImageProps {
    src: string;
    /** Responsive candidates; paired with `sizes`. */
    srcSet?: string;
    /**
     * What width the image will actually be painted at. Worth getting right on
     * mobile: a wrong `sizes` is how a 44px-tall sliver ends up downloading a
     * 1280px photo.
     */
    sizes?: string;
    alt: string;
    /** Tiny blurred stand-in painted under the photo while it loads. */
    placeholderSrc?: string;
    /**
     * Above-the-fold images only. Loads eagerly at high fetch priority and
     * decodes synchronously — the point is to win the LCP, and marking
     * everything priority is the same as marking nothing.
     */
    priority?: boolean;
    /**
     * Classes applied to the photo *and* its placeholder, so the two stay
     * aligned through any transform. Pass transform utilities (`scale-110`),
     * not `transition-*` ones: this component already declares the transition
     * covering both opacity and transform, and `cn` here is a plain join with
     * no conflict resolution — a second `transition-property` from a caller
     * would be settled by stylesheet order rather than by intent.
     */
    className?: string;
    /** `cover` fills the frame (default); `contain` shows the whole photo. */
    objectFit?: 'cover' | 'contain';
    /** Tailwind duration class for the fade-in. */
    fadeDurationClass?: string;
    /** Extra classes for the loading skeleton — its colour belongs to the caller's surface. */
    skeletonClassName?: string;
    /** Drawn instead of everything else when the photo cannot load. */
    fallback?: React.ReactNode;
    onLoad?: () => void;
    onError?: () => void;
}

/**
 * `index.html` ships an unlayered `img { max-width: 100%; height: auto }`.
 * Tailwind v4 emits its utilities inside `@layer utilities`, and an unlayered
 * rule beats a layered one however specific the layered one is — so
 * `h-full object-cover` loses that fight and the photo renders at its natural
 * height. An inline style outranks both, which is why sizing lives here rather
 * than in a class list.
 */
const fillStyle = (objectFit: 'cover' | 'contain'): React.CSSProperties => ({
    height: '100%',
    width: '100%',
    objectFit,
    maxWidth: 'none',
});

/**
 * One photo, loaded in the three stages a slow connection makes visible:
 *
 * ```
 * shimmer skeleton   ← immediately, so the frame is never a blank rectangle
 *   └── blurred LQIP ← ~1KB, arrives in one round trip, shows the real colours
 *         └── photo  ← fades in over the blur once decoded
 * ```
 *
 * Three things it handles that a bare `<img>` does not:
 *
 * - **Cached photos.** A callback ref checks `complete` on attach. An image
 *   already in the browser cache can finish loading before React attaches
 *   `onLoad`, and without this check that photo sits at `opacity-0` forever —
 *   the failure mode is an invisible image, which is worse than a slow one.
 * - **A changed `src`.** The loaded/failed state is stored as the URL it
 *   belongs to, not as a boolean, so pointing the component at a new photo
 *   re-enters the loading state in the same render instead of needing an
 *   effect to repair it a frame later.
 * - **Untrusted URLs.** The `src` is validated before it reaches the DOM
 *   (`validateImageSrc`), so a stored value that is not an `http(s)` URL
 *   renders the fallback rather than an attribute nobody vetted.
 *
 * Must be placed inside a positioned container (`relative`) with
 * `overflow-hidden`: every layer is absolutely positioned to fill it.
 */
export const ProgressiveImage: React.FC<ProgressiveImageProps> = ({
    src,
    srcSet,
    sizes,
    alt,
    placeholderSrc,
    priority = false,
    className,
    objectFit = 'cover',
    fadeDurationClass = 'duration-700',
    skeletonClassName,
    fallback,
    onLoad,
    onError,
}) => {
    // Stored as the URL each outcome belongs to rather than as a flag: when the
    // caller swaps `src`, both states fall stale on their own.
    const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
    const [failedSrc, setFailedSrc] = useState<string | null>(null);
    const notifiedRef = useRef<string | null>(null);

    const srcCheck = validateImageSrc(src);
    const isUsable = srcCheck.isValid;
    const hasFailed = !isUsable || failedSrc === src;
    const isLoaded = !hasFailed && loadedSrc === src;

    const handleLoaded = useCallback(
        (url: string) => {
            setLoadedSrc(url);
            // The callback ref and `onLoad` can both fire for one image (a
            // cached photo that completes between attach and event). The caller
            // hears about it once.
            if (notifiedRef.current !== url) {
                notifiedRef.current = url;
                onLoad?.();
            }
        },
        [onLoad],
    );

    /*
     * Runs on attach — including re-attach after a re-render — and catches the
     * image that was already complete before React could subscribe to it.
     * `naturalWidth > 0` separates a decoded image from one that completed by
     * failing.
     */
    const attachImg = useCallback(
        (node: HTMLImageElement | null) => {
            if (node?.complete && node.currentSrc !== '') {
                if (node.naturalWidth > 0) handleLoaded(src);
                else setFailedSrc(src);
            }
        },
        [handleLoaded, src],
    );

    const handleError = useCallback(() => {
        setFailedSrc(src);
        onError?.();
    }, [onError, src]);

    if (hasFailed) {
        return (
            <>
                {fallback ?? (
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-900" aria-hidden="true" />
                )}
            </>
        );
    }

    return (
        <>
            {/* Stage 1 — the frame is never empty. Sits under everything and is
                simply covered once a photo paints, so it never needs unmounting
                on a timer. */}
            {!isLoaded && (
                <div
                    aria-hidden="true"
                    className={cn('image-shimmer absolute inset-0', skeletonClassName)}
                />
            )}

            {/* Stage 2 — the LQIP. A `div` rather than a second `<img>`: it
                carries no alt text, must never enter the accessibility tree,
                and a background image cannot be dragged or long-pressed as a
                separate picture on a phone. */}
            {placeholderSrc && !isLoaded && (
                <div
                    aria-hidden="true"
                    className={cn(
                        'absolute inset-0 bg-cover bg-center transition-[opacity,transform] motion-reduce:transition-none',
                        fadeDurationClass,
                        className,
                    )}
                    style={{ backgroundImage: `url("${placeholderSrc}")` }}
                />
            )}

            {/* Stage 3 — the photo. */}
            <img
                ref={attachImg}
                src={src}
                srcSet={srcSet || undefined}
                sizes={sizes || undefined}
                alt={alt}
                loading={priority ? 'eager' : 'lazy'}
                decoding={priority ? 'sync' : 'async'}
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore fetchpriority is a valid perf hint not yet in every TS lib def
                fetchpriority={priority ? 'high' : 'auto'}
                onLoad={() => handleLoaded(src)}
                onError={handleError}
                className={cn(
                    'absolute inset-0 transition-[opacity,transform] motion-reduce:transition-none',
                    fadeDurationClass,
                    isLoaded ? 'opacity-100' : 'opacity-0',
                    className,
                )}
                style={fillStyle(objectFit)}
            />
        </>
    );
};

export default ProgressiveImage;
