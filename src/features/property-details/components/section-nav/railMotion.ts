// Motion for the thumb rail, tuned to feel like iOS: springs that settle
// fast with no visible bounce, and the system "ease out" curve for plain
// fades. Everything here animates transform and opacity only, so it runs on
// the compositor. Under reduced motion, callers use REDUCED (a short fade).

import type { Transition } from 'framer-motion';

/** iOS's standard curve (sheets, popovers): quick start, long soft landing. */
export const IOS_EASE: [number, number, number, number] = [0.32, 0.72, 0, 1];
export const IOS_EASE_CSS = 'cubic-bezier(0.32, 0.72, 0, 1)';

/** The panel growing out of the rail, like a context menu. */
export const PANEL_SPRING: Transition = { type: 'spring', stiffness: 420, damping: 34, mass: 0.9 };

/** The panel folding back into the rail: quicker than it opened. */
export const PANEL_EXIT: Transition = { duration: 0.2, ease: IOS_EASE };

/** The highlight gliding to the row under the thumb. */
export const HIGHLIGHT_SPRING: Transition = { type: 'spring', stiffness: 650, damping: 44, mass: 0.7 };

/** List ⇄ settings, like a navigation push. */
export const PAGE_SPRING: Transition = { type: 'spring', stiffness: 380, damping: 38 };

/** The dimmed page behind the panel. */
export const DIM_FADE: Transition = { duration: 0.25, ease: IOS_EASE };

export const REDUCED: Transition = { duration: 0.12, ease: 'linear' };
