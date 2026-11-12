import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { seamShadeTransition } from './tabMotion';

/**
 * The shadow the list casts onto the map while it slides, as if the list were
 * a sheet lifted over it. It lives on the map's left edge, so it travels with
 * the seam, rises as the slide starts and is gone when the list lands.
 *
 * It plays only on a toggle: on the first render `initial={false}` puts it at
 * its last keyframe (invisible), so a page that opens folded shows no shadow.
 * Opacity only; not drawn at all under reduced motion.
 */
const SeamShade: React.FC<{ collapsed: boolean }> = ({ collapsed }) => {
    const reduceMotion = useReducedMotion();
    if (reduceMotion) return null;

    return (
        <AnimatePresence initial={false}>
            <motion.span
                key={collapsed ? 'closing' : 'opening'}
                aria-hidden="true"
                data-testid="seam-shade"
                className="pointer-events-none absolute inset-y-0 left-0 z-[1000] w-16 bg-gradient-to-r from-slate-900/25 via-slate-900/10 to-transparent"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0] }}
                exit={{ opacity: 0, transition: { duration: 0.12 } }}
                transition={seamShadeTransition(collapsed)}
            />
        </AnimatePresence>
    );
};

export default SeamShade;
