'use client';

import React, { createContext, useContext, useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * "Scatter then assemble" row — the technique from
 * `components/ui/text-scroll-animation.tsx`, generalised so any row of tiles
 * can use it: items start pushed away from the centre and slide into place
 * when the row enters the viewport.
 *
 * Two things this deliberately gets right:
 *
 * 1. Position only, never opacity. The `initial opacity 0` + `whileInView`
 *    pattern it replaces flickers for a row already on screen at first
 *    paint: the element renders invisible, then an IntersectionObserver
 *    callback a frame or two later starts the fade, so a refresh shows a
 *    blank row that pops in. Here every item is painted at full opacity on
 *    the very first frame; only its offset changes.
 *
 * 2. Triggered by `whileInView` (an IntersectionObserver), not by a
 *    continuous `useScroll` progress value. A first attempt used
 *    `useScroll` so the assembly would track the scroll position directly —
 *    but a row with no scroll room above it (e.g. sitting right below the
 *    header) has no range to animate through: at scroll position 0 its
 *    progress is already resolved to "fully assembled", so nothing visibly
 *    moves. `whileInView` doesn't have that failure mode — it fires once
 *    the row is in view, mount included, so above-the-fold rows still play
 *    the entrance instead of skipping it.
 */

interface AssembleContextValue {
    centerIndex: number;
    /** When true the animation is skipped entirely — prefers-reduced-motion. */
    reduced: boolean;
}

const AssembleContext = createContext<AssembleContextValue | null>(null);

interface ScrollAssembleProps {
    /** Number of items, so each one knows how far it sits from the centre. */
    count: number;
    className?: string;
    children: React.ReactNode;
}

export const ScrollAssemble: React.FC<ScrollAssembleProps> = ({ count, className, children }) => {
    const reduced = useReducedMotion();
    const value = useMemo<AssembleContextValue>(
        () => ({ centerIndex: (count - 1) / 2, reduced: !!reduced }),
        [count, reduced],
    );

    return (
        <div className={className} style={{ perspective: '900px' }}>
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
    if (!ctx || ctx.reduced) return <div className={className}>{children}</div>;

    const offset = index - ctx.centerIndex;

    return (
        <motion.div
            className={cn('will-change-transform', className)}
            style={{ transformOrigin: 'center' }}
            // Outer items start furthest away, so the row closes in from both ends.
            initial={{ x: offset * 46, y: Math.abs(offset) * 14, rotate: offset * 5, scale: 0.86 }}
            whileInView={{ x: 0, y: 0, rotate: 0, scale: 1 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{
                type: 'spring',
                stiffness: 260,
                damping: 24,
                // Outer items settle slightly later, so the assembly reads as
                // closing inward rather than every tile snapping at once.
                delay: Math.abs(offset) * 0.04,
            }}
        >
            {children}
        </motion.div>
    );
};

export default ScrollAssemble;
