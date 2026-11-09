import React from 'react';
import { motion } from 'framer-motion';
import { ApartmentShowcase } from './showcase/ApartmentShowcase';
import type { Showcase } from './showcase/useShowcase';
import { FRAME_DRIVEN } from '../../motion/frameDriven';

interface DesktopBackdropProps {
  showcase: Showcase;
  onClose: () => void;
}

/**
 * What sits behind the apartment details on tablet and up: the apartment
 * showcase (its plan, its floor's picture, its photos) when there is
 * something to show or its floor picture is on its way, else the dimmed
 * page, which closes the details when clicked.
 */
export const DesktopBackdrop: React.FC<DesktopBackdropProps> = ({ showcase, onClose }) => {
  const { unit, media, floor, open } = showcase;
  if (unit && open) return <ApartmentShowcase key={unit.id} unit={unit} media={media} floor={floor} onClose={onClose} />;
  return (
    <motion.div
      {...FRAME_DRIVEN}
      className="h-full min-w-0 flex-1 bg-slate-950/50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      aria-hidden="true"
    />
  );
};
