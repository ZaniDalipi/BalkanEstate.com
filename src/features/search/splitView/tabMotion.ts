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

/**
 * The search dock on the map (see MapSearchDock): it drops in from the top as
 * the list docks, and leaves at once when the list comes back, before the
 * list slides over where it was. Under reduced motion it just appears.
 */
export function searchDockMotion(reduceMotion: boolean) {
    if (reduceMotion) {
        return {
            initial: { opacity: 1, y: 0, scale: 1 },
            animate: { opacity: 1, y: 0, scale: 1, transition: INSTANT },
            exit: { opacity: 0, transition: INSTANT },
        };
    }
    return {
        initial: { opacity: 0, y: -16, scale: 0.97 },
        animate: { opacity: 1, y: 0, scale: 1, transition: { ...SPRING, delay: DOCK_DELAY_S } },
        exit: { opacity: 0, y: -10, transition: { duration: 0.14, ease: 'easeIn' as const } },
    };
}
