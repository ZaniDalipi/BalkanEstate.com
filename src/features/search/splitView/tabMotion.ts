import type { Transition } from 'motion/react';
import { LIST_CLOSE_MS, LIST_OPEN_MS } from './listCollapse';

/**
 * How the hide/show tab moves (see ListCollapseTab).
 *
 * Closing: the slim tab rides the seam to the page edge, and only once it has
 * nearly arrived (the close spring is ~85% there) does it grow into the
 * "Show list" pill, flip its chevron and pop the count in, then pulse once.
 * Opening: the pill folds back into the tab at once, before the list arrives.
 * Under reduced motion everything is instant.
 */

/** The pill grows when the seam has nearly reached the page edge. */
export const DOCK_DELAY_S = 0.22;
/** The count pops in just after the label. */
export const BADGE_DELAY_S = DOCK_DELAY_S + 0.08;
/** One pulse marks the docked pill, once it has grown. */
export const DOCK_PULSE_DELAY_S = 0.38;

const SPRING = { type: 'spring', stiffness: 420, damping: 34, mass: 0.9 } as const;
const INSTANT: Transition = { duration: 0 };

/**
 * A label in the tab growing or shrinking. Growing as the list docks waits
 * for the seam; shrinking (and a hover reveal) answers at once.
 */
export function revealTransition(showing: boolean, waitForDock: boolean, reduceMotion: boolean, delayS = DOCK_DELAY_S): Transition {
    if (reduceMotion) return INSTANT;
    return showing && waitForDock ? { ...SPRING, delay: delayS } : SPRING;
}

/**
 * The shade the list casts onto the map while it moves: it rises with the
 * slide and is gone when the list has landed, so the map never keeps it.
 */
export function seamShadeTransition(collapsed: boolean): Transition {
    return {
        duration: (collapsed ? LIST_CLOSE_MS : LIST_OPEN_MS) / 1000,
        times: [0, 0.25, 1],
        ease: 'easeOut',
    };
}
