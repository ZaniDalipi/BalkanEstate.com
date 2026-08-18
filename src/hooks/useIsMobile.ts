import { useEffect, useState } from 'react';

/**
 * True below `breakpointPx` (default 640, Tailwind's `sm`). Used where a
 * component needs different numeric props on mobile — not just different
 * classes — e.g. corridor geometry, so a plain CSS breakpoint can't do it.
 */
export function useIsMobile(breakpointPx = 640): boolean {
    const [isMobile, setIsMobile] = useState(
        () => typeof window !== 'undefined' && window.innerWidth < breakpointPx,
    );

    useEffect(() => {
        const mql = window.matchMedia(`(max-width: ${breakpointPx - 1}px)`);
        const update = () => setIsMobile(mql.matches);
        update();
        mql.addEventListener('change', update);
        return () => mql.removeEventListener('change', update);
    }, [breakpointPx]);

    return isMobile;
}
