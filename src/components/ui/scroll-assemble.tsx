'use client';

import React, { createContext, useContext, useMemo, useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * "Scatter then assemble" row, tied to live scroll position — the same
 * `useScroll` + `useTransform` technique as the reference
 * `components/ui/text-scroll-animation.tsx`, generalised so any row of
 * tiles can use it. Drag the scrollbar and the cards move with it; this is
 * deliberately not a fire-once entrance animation.
 *
 * Two things this gets right that a first attempt at it got wrong:
 *
 * 1. The scroll range is the row's full transit through the viewport
 *    (`'start end'` → `'end start'`: from the row's top touching the
 *    viewport's bottom, to the row's bottom passing the viewport's top),
 *    not a short range like "top reaches centre". A short range resolves
 *    to "done" almost immediately for any row near the top of the page —
 *    at scroll position 0 there's no scroll room *before* it, so progress
 *    is already past the end and nothing visibly moves. The full-transit
 *    range doesn't have that failure mode: it's on the order of one
 *    viewport-height + one row-height long, which a row has real room to
 *    move through even when it's already partway into that range at load.
 *    Framer computes this from actual element/viewport geometry each
 *    frame, not by simulating scroll to a hypothetical negative position,
 *    so a row already visible at load simply starts partway through its
 *    range instead of failing to animate.
 * 2. Interpolated through a narrower sub-range (`[0, 0.4]`) of that
 *    transit, so the assembly settles well before the row scrolls fully
 *    past — matching the reference, whose characters finish at the
 *    scroll-fraction midpoint rather than only on the very last frame
 *    the section is on screen.
 *
 * Position only, never opacity: an item that's scattered is still fully
 * visible, just offset, so there's no blank first frame to flicker.
 */

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

    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ['start end', 'end start'],
    });

    const value = useMemo<AssembleContextValue>(
        () => ({ progress: scrollYProgress, centerIndex: (count - 1) / 2, still: !!reduced }),
        [scrollYProgress, count, reduced],
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

    // Settle late in the row's transit, not at the very end of it — matches
    // the reference's own [0, 0.5]-style sub-range, just wider.
    //
    // It has to be wider than the reference's 0.5: their sections are 210vh
    // tall and deliberately stacked to manufacture a huge scroll range, so
    // a narrow settle window still has plenty of room to be visible. A
    // compact row has no such artificial buffer — for one sitting close to
    // the top of the page, most of its full-viewport-transit range is
    // already behind the initial scroll position before the user has
    // scrolled at all (there's no "before" to have scrolled through). A
    // low SETTLE can end up already exceeded at load for exactly that case,
    // which reads as "not animated" — the failure this replaced. 0.85 keeps
    // that window as wide as the geometry allows without requiring the
    // last, physically-unreachable sliver of the transit.
    const SETTLE = 0.85;

    // Outer items travel furthest, so the row closes in from both ends.
    const x = useTransform(progress, [0, SETTLE], [still ? 0 : offset * 46, 0]);
    const y = useTransform(progress, [0, SETTLE], [still ? 0 : Math.abs(offset) * 14, 0]);
    const rotate = useTransform(progress, [0, SETTLE], [still ? 0 : offset * 5, 0]);
    const scale = useTransform(progress, [0, SETTLE], [still ? 1 : 0.86, 1]);

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
