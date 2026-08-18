'use client';

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * "Scatter then assemble" row, tied to live scroll position — the same
 * `useScroll` + `useTransform` technique as the reference
 * `components/ui/text-scroll-animation.tsx`, generalised so any row of
 * tiles can use it. Drag the scrollbar and the cards move with it; this is
 * deliberately not a fire-once entrance animation.
 *
 * The range the animation runs over is measured in absolute document
 * pixels, not viewport-relative fractions ("row's top touches the
 * viewport's bottom", etc). Two earlier attempts used viewport-relative
 * offsets and both failed the same way for a reason that's easy to miss:
 * for a row sitting close to the top of the page, the viewport-relative
 * "entering" edge of that range corresponds to a *negative* scroll
 * position — one that already happened before the page ever loaded, and
 * can never be reached going forward. How much of the range survives
 * clamping to real (non-negative) scroll depends entirely on how much
 * content sits above the row, which is exactly the part that differs by
 * breakpoint: this page's hero is noticeably shorter on mobile
 * (`pt-12 pb-16` vs `sm:pt-24 sm:pb-28`), so a range tuned to look right
 * on desktop had measurably less headroom on a phone — and for Quick
 * Access specifically, none left at all.
 *
 * Measuring the row's actual position in the document sidesteps that:
 * the window is `[rowTop - LEAD_PX, rowTop + SETTLE_PX]` in absolute
 * page-Y pixels, so how far above the row the hero happens to be doesn't
 * change how much of the window is reachable — only how much *unrelated*
 * scrolling happens before the window starts, which is fine. Remeasured
 * on resize and shortly after mount (a `ResizeObserver` on the row itself
 * catches height changes from async content — e.g. images finishing load
 * above it — that a mount-only measurement would miss).
 */

const LEAD_PX = 380;
const SETTLE_PX = 60;

interface AssembleContextValue {
    progress: MotionValue<number>;
    centerIndex: number;
    /** When true the transforms collapse to identity and nothing moves. */
    still: boolean;
}

const AssembleContext = createContext<AssembleContextValue | null>(null);

interface ScrollAssembleProps {
    /** Number of items, so each one knows how far it sits from the centre. */
    count: number;
    className?: string;
    children: React.ReactNode;
}

export const ScrollAssemble: React.FC<ScrollAssembleProps> = ({ count, className, children }) => {
    const ref = useRef<HTMLDivElement>(null);
    const reduced = useReducedMotion();
    const { scrollY } = useScroll();

    // The row's own top, in absolute document pixels — re-measured on resize
    // and once more shortly after mount to catch async layout shifts (e.g.
    // an image above the row finishing load and pushing it down).
    const [rowTop, setRowTop] = useState<number | null>(null);

    useEffect(() => {
        const measure = () => {
            const el = ref.current;
            if (!el) return;
            setRowTop(el.getBoundingClientRect().top + window.scrollY);
        };
        measure();
        const settleTimer = window.setTimeout(measure, 400);

        const ro = new ResizeObserver(measure);
        if (ref.current) ro.observe(ref.current);
        window.addEventListener('resize', measure);

        return () => {
            window.clearTimeout(settleTimer);
            ro.disconnect();
            window.removeEventListener('resize', measure);
        };
    }, []);

    // Before the first measurement, or with no scroll room above the row
    // (rowTop < LEAD_PX — content pinned right at the top of the page),
    // clamp the window's start to 0: the animation simply begins on the
    // very first pixel scrolled, rather than being undefined or negative.
    const windowStart = rowTop === null ? 0 : Math.max(0, rowTop - LEAD_PX);
    const windowEnd = rowTop === null ? 1 : Math.max(windowStart + 1, rowTop + SETTLE_PX);

    const progress = useTransform(scrollY, [windowStart, windowEnd], [0, 1]);

    const value = useMemo<AssembleContextValue>(
        () => ({ progress, centerIndex: (count - 1) / 2, still: !!reduced }),
        [progress, count, reduced],
    );

    return (
        <div ref={ref} className={className} style={{ perspective: '900px' }}>
            <AssembleContext.Provider value={value}>{children}</AssembleContext.Provider>
        </div>
    );
};

interface ScrollAssembleItemProps {
    index: number;
    className?: string;
    children: React.ReactNode;
}

/**
 * One tile. Must be rendered inside `ScrollAssemble`; outside it the item
 * simply renders static rather than throwing, so a mis-nested tile degrades
 * to "no animation" instead of taking the page down.
 */
export const ScrollAssembleItem: React.FC<ScrollAssembleItemProps> = ({ index, className, children }) => {
    const ctx = useContext(AssembleContext);
    if (!ctx) return <div className={className}>{children}</div>;
    return (
        <AssembleItemInner index={index} className={className} ctx={ctx}>
            {children}
        </AssembleItemInner>
    );
};

/**
 * Split out because the transforms are hooks: they cannot sit behind the
 * null-context guard above without breaking the rules of hooks.
 */
const AssembleItemInner: React.FC<ScrollAssembleItemProps & { ctx: AssembleContextValue }> = ({
    index,
    className,
    children,
    ctx,
}) => {
    const { progress, centerIndex, still } = ctx;
    const offset = index - centerIndex;

    // Outer items travel furthest, so the row closes in from both ends.
    const x = useTransform(progress, [0, 1], [still ? 0 : offset * 46, 0]);
    const y = useTransform(progress, [0, 1], [still ? 0 : Math.abs(offset) * 14, 0]);
    const rotate = useTransform(progress, [0, 1], [still ? 0 : offset * 5, 0]);
    const scale = useTransform(progress, [0, 1], [still ? 1 : 0.86, 1]);

    return (
        <motion.div
            className={cn('will-change-transform', className)}
            style={{ x, y, rotate, scale, transformOrigin: 'center' }}
        >
            {children}
        </motion.div>
    );
};

export default ScrollAssemble;
