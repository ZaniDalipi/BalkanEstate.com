import { useCallback, useRef, useState } from 'react';

/**
 * Tracks whether a scroll container is being scrolled down through its content.
 * Attach `onScroll` to the container. `isScrollingDown` turns on after a small
 * downward move past the top, and back off on a small upward move or at the top,
 * so a jittery finger or trackpad does not make chrome flicker in and out.
 */
export function useScrollDirection(threshold = 4, topZone = 24) {
    const lastTop = useRef(0);
    const [isScrollingDown, setIsScrollingDown] = useState(false);

    const onScroll = useCallback((e: React.UIEvent<HTMLElement>) => {
        const top = e.currentTarget.scrollTop;
        const delta = top - lastTop.current;
        lastTop.current = top;
        if (top <= topZone || delta < -threshold) setIsScrollingDown(false);
        else if (delta > threshold) setIsScrollingDown(true);
    }, [threshold, topZone]);

    return { onScroll, isScrollingDown };
}
