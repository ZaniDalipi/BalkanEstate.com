'use client';

import React, { createContext, useContext, useMemo, useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * Scroll-driven "scatter then assemble" row.
 *
 * Items start pushed away from the centre and slide into place as the row
 * scrolls into view — the technique from `components/ui/text-scroll-animation.tsx`,
 * generalised so any row of tiles can use it.
 *
 * Deliberately animates position only, never opacity. The `initial opacity 0`
 * + `whileInView` pattern it replaces flickers for any row that is already on
 * screen at first paint: the element renders invisible, then an
 * IntersectionObserver callback a frame or two later starts the fade, so a
 * refresh shows a blank row that pops in. Here every item is painted at full
 * opacity on the very first frame; only its offset changes.
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

    // Assembly completes by the time the row reaches the middle of the
    // viewport, so a row that is already on screen at load lands assembled
    // rather than mid-flight.
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ['start end', 'center center'],
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
 * simply renders static rather than throwing, so a mis-nested tile degrades to
 * "no animation" instead of taking the page down.
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
