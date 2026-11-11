import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/src/lib/utils';
import { useMediaQuery } from '@/src/hooks/useMediaQuery';
import { FRAME_DRIVEN } from '../../motion/frameDriven';
import { DesktopBackdrop } from './DesktopBackdrop';
import { detailsCardMotion } from './detailsCardMotion';
import { CARD_POSITION, SIDE_BY_SIDE_QUERY } from './showcase/showcaseLayout';
import type { Showcase } from './showcase/useShowcase';

interface DesktopDetailsProps {
  /** The dialog's ref, role, label and focus-trap keys. */
  dialog: React.ComponentPropsWithRef<'div'>;
  showcase: Showcase;
  onClose: () => void;
  children: React.ReactNode;
}

const CARD_LOOK = 'flex flex-col overflow-hidden rounded-[28px] bg-white shadow-[0_40px_90px_-30px_rgba(60,40,20,0.45)] ring-1 ring-black/5 landscape:rounded-2xl';
const COLUMN = 'relative flex h-full w-full max-w-[460px] shrink-0 flex-col bg-white shadow-2xl';

/**
 * Tablet and up: the dialog spans the screen — the apartment showcase (or the
 * dimmed page) behind, the details as a card beside it (under it on a tablet
 * held upright), or as a right-hand column when there is nothing to show.
 * Inline z-index (not a class) so isTopmostLayer reads the same stacking everywhere.
 */
export const DesktopDetails: React.FC<DesktopDetailsProps> = ({ dialog, showcase, onClose, children }) => {
  const reduce = !!useReducedMotion();
  const side = useMediaQuery(SIDE_BY_SIDE_QUERY);
  const floating = showcase.open;
  return (
    <div className="fixed inset-0" style={{ zIndex: 4500 }}>
      <div {...dialog} className="absolute inset-0 flex outline-none">
        <DesktopBackdrop showcase={showcase} onClose={onClose} />
        <motion.div {...FRAME_DRIVEN} {...detailsCardMotion(floating, side, reduce)} className={floating ? cn(CARD_POSITION, CARD_LOOK) : COLUMN}>
          {children}
        </motion.div>
      </div>
    </div>
  );
};
