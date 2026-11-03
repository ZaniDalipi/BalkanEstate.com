import React from 'react';
import { motion, useReducedMotion } from 'motion/react';

/**
 * Fades a panel's content in when it mounts, so the real list replaces its
 * skeleton without a hard cut. Opacity only: it runs on the compositor and
 * never moves the layout. Instant under reduced motion.
 */
const PanelFadeIn: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className="flex min-h-0 flex-1 flex-col"
      initial={{ opacity: reduceMotion ? 1 : 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduceMotion ? 0 : 0.25, ease: [0.32, 0.72, 0, 1] }}
    >
      {children}
    </motion.div>
  );
};

export default PanelFadeIn;
