import { useEffect, useState } from 'react';

/**
 * True while the visitor is scrolling down through any scroll container on
 * the page, false again on a small upward move or near the top.
 *
 * For fixed chrome (the floating header) that has no scroll container of its
 * own to attach `useScrollDirection` to: the app scrolls inside `<main>`, the
 * search list, a dashboard pane… so this listens to every scroll in the
 * capture phase (scroll events don't bubble, but they are captured) and keeps
 * the last offset per element. Off when `enabled` is false — the caller only
 * hides chrome where the screen is too short to keep it.
 */
export function useHideOnScroll(enabled: boolean, threshold = 6, topZone = 48): boolean {
    const [hidden, setHidden] = useState(false);

    useEffect(() => {
        if (!enabled) {
            setHidden(false);
            return;
        }
        const lastTops = new WeakMap<EventTarget, number>();

        const onScroll = (e: Event) => {
            const target = e.target;
            if (!target) return;
            const el = target === document ? document.scrollingElement : target;
            if (!(el instanceof Element)) return;
            // Only page content counts: not the sidebar's own list, a menu or a
            // dialog. Horizontal carousels scroll too, but their scrollTop
            // never moves, so they never register below.
            if (el.closest('aside, nav, [role="dialog"], [role="listbox"]')) return;
            const top = el.scrollTop;
            const last = lastTops.get(el);
            lastTops.set(el, top);
            if (last === undefined) return;
            const delta = top - last;
            if (top <= topZone || delta < -threshold) setHidden(false);
            else if (delta > threshold) setHidden(true);
        };

        document.addEventListener('scroll', onScroll, { capture: true, passive: true });
        return () => document.removeEventListener('scroll', onScroll, { capture: true });
    }, [enabled, threshold, topZone]);

    return enabled && hidden;
}
