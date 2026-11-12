import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { revealTransition } from './tabMotion';

interface TabRevealProps {
    shown: boolean;
    /** Grow only once the list has nearly docked (the "Show list" pill). */
    waitForDock?: boolean;
    children: React.ReactNode;
}

/**
 * A part of the tab that grows out of nothing and folds back: its width
 * springs between 0 and its content's own width, so the tab around it widens
 * smoothly instead of jumping. The button carries the accessible name, so
 * this is hidden from assistive tech.
 */
const TabReveal: React.FC<TabRevealProps> = ({ shown, waitForDock = false, children }) => {
    const reduceMotion = useReducedMotion() ?? false;
    return (
        <motion.span
            aria-hidden="true"
            data-shown={shown}
            className="flex overflow-hidden"
            initial={false}
            animate={{ width: shown ? 'auto' : 0, opacity: shown ? 1 : 0 }}
            transition={revealTransition(shown, waitForDock, reduceMotion)}
        >
            {children}
        </motion.span>
    );
};

export default TabReveal;
