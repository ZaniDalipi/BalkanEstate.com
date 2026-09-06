import { useEffect, useState } from 'react';

/**
 * The natural width / height of an image, once the browser knows it.
 *
 * Used to give the room-styler preview the picture's own proportions, so a
 * portrait photo gets a portrait frame instead of being letterboxed — or worse,
 * cropped — inside a fixed landscape box. Returns `null` until the size is
 * known so callers can fall back to a neutral frame.
 *
 * The probe uses the same `crossOrigin` as the `<img>` tags that display these
 * photos, so both share a single cache entry and the picture is fetched once.
 */
export const useImageAspect = (src?: string): number | null => {
    const [aspect, setAspect] = useState<number | null>(null);

    useEffect(() => {
        if (!src) {
            setAspect(null);
            return;
        }

        let cancelled = false;
        const probe = new Image();
        probe.crossOrigin = 'anonymous';
        probe.onload = () => {
            if (!cancelled && probe.naturalWidth > 0 && probe.naturalHeight > 0) {
                setAspect(probe.naturalWidth / probe.naturalHeight);
            }
        };
        probe.src = src;

        return () => {
            cancelled = true;
        };
    }, [src]);

    return aspect;
};

export default useImageAspect;
