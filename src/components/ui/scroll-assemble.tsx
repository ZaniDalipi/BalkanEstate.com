'use client';

import React, { createContext, useContext, useMemo, useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * "Scatter then assemble" row, tied to live scroll position — the same
 * technique as the reference `components/ui/text-scroll-animation.tsx`
 * (reuno-ui), generalised so any row of tiles can use it. Drag the
 * scrollbar and the tiles move with it; this is deliberately not a
 * fire-once entrance animation.
 *
 * Two things were wrong with the earlier version of this file, and both
 * are worth recording because they look like separate bugs but produced
 * the same symptom ("there's no animation"):
 *
 * 1. The motion was roughly a tenth of the reference's. The reference
 *    scatters by `d * 90`px with a 0.75 starting scale; this file used
 *    `d * 46`px and 0.86, which reads as a faint shimmer rather than as
 *    pieces flying into place. The travel, lift and scale below now match
 *    the reference's `CharacterV3` (including the *upward* `-|d| * 20`
 *    lift — the old code pushed tiles down instead).
 *
 *    The one thing deliberately NOT taken from the reference is its
 *    `d * 50` degrees of rotation. That works for the reference because
 *    its items are square, wordless brand glyphs, which read fine at any
 *    angle. These tiles carry text labels, and at the outer positions
 *    `d * 50` comes to ~125 degrees — far enough past vertical that
 *    "Apartments" renders upside down on the way in. Tiles stay upright.
 *
 * 2. The scroll window was hand-measured in absolute document pixels
 *    (`rowTop - 380` to `rowTop + 60`) via getBoundingClientRect plus a
 *    ResizeObserver. That put the whole animation in the band where the
 *    row travels from 380px-below-the-viewport-top to the top edge — so
 *    on a tall screen the row sat fully visible and fully scattered for
 *    hundreds of pixels, then snapped together as it left the top of the
 *    screen, which is the part you are least likely to be looking at.
 *    Framer's own `useScroll({ target, offset })` expresses the window
 *    declaratively and re-measures on layout changes by itself, so all
 *    the manual measurement code is gone.
 *
 * The window is `['start end', 'start 0.35']`: progress is 0 the moment
 * the row's top edge appears at the bottom of the viewport, and 1 once
 * that edge has risen to 35% down the screen. The tiles therefore finish
 * assembling right as the row settles into comfortable reading position,
 * and the whole thing plays out over ~65% of a viewport height of
 * scrolling. A row sitting above the fold on load simply starts partway
 * through the window instead of being stuck scattered.
 *
 * CALLERS MUST put `overflow-x-clip` on the full-width <section> wrapping
 * the row. The outermost tiles start ~225px outside the row, so without a
 * clip somewhere they widen the document and the page gets a horizontal
 * scrollbar — very visible on a phone. It has to be the full-width section
 * and not this element: clipping at the content column slices the outer
 * tiles in half mid-screen, which reads as a rendering bug, whereas
 * clipping at the section (exactly the body's width, so it can't overflow
 * anything) hides them off the edge of the screen, which is what the
 * reference does and reads as tiles flying in from off-screen.
 *
 * `clip` rather than `hidden` on purpose: `hidden` makes the section a
 * scroll container, which breaks `position: sticky` descendants and lets
 * the section be scrolled sideways programmatically.
 */

/** Per-step outward travel, in px — the reference's `distanceFromCenter * 90`. */
const X_STEP_PX = 90;

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
        offset: ['start end', 'start 0.35'],
    });

    const value = useMemo<AssembleContextValue>(
        () => ({ progress: scrollYProgress, centerIndex: (count - 1) / 2, still: !!reduced }),
        [scrollYProgress, count, reduced],
    );

    return (
        <div
            ref={ref}
            className={cn(className)}
        >
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

    // Magnitudes lifted from the reference's CharacterV3, minus its rotation
    // (see the note at the top): outer tiles travel furthest and start
    // smallest, so the row closes in from both ends and settles upright.
    const x = useTransform(progress, [0, 1], [still ? 0 : offset * X_STEP_PX, 0]);
    const y = useTransform(progress, [0, 1], [still ? 0 : -Math.abs(offset) * 20, 0]);
    const scale = useTransform(progress, [0, 1], [still ? 1 : 0.75, 1]);

    return (
        <motion.div
            className={cn('will-change-transform', className)}
            style={{ x, y, scale, transformOrigin: 'center' }}
        >
            {children}
        </motion.div>
    );
};

export default ScrollAssemble;
