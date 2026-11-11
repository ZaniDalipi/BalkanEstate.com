import type { MotionProps } from 'framer-motion';

type CardMotion = Required<Pick<MotionProps, 'initial' | 'animate' | 'exit' | 'transition'>>;

/**
 * How the apartment details come in on tablet and up: as a card that glides
 * in once the showcase has risen — from the right beside it (`side`), from
 * below on a tablet held upright, where the card sits under it — or, with no
 * showcase, as a column from the screen's edge. Only a fade under reduced motion.
 */
export function detailsCardMotion(floating: boolean, side: boolean, reduce: boolean): CardMotion {
  if (reduce) return { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { type: 'tween', duration: 0.2 } };
  const hidden = !floating ? { x: '100%' } : side ? { x: 72, opacity: 0 } : { y: 64, opacity: 0 };
  return {
    initial: hidden,
    animate: { x: 0, y: 0, opacity: 1 },
    exit: { ...hidden, transition: { duration: 0.3, ease: 'easeIn' } },
    transition: floating ? { duration: 0.7, delay: 0.4, ease: [0.22, 1, 0.36, 1] } : { type: 'tween', duration: 0.25, ease: 'easeOut' },
  };
}
