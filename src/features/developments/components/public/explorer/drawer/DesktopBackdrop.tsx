import React from 'react';
import { motion } from 'framer-motion';
import type { PublicUnit } from '../../../../types';
import { ApartmentShowcase } from './showcase/ApartmentShowcase';
import type { ShowcaseMedia } from './showcase/showcaseMedia';

interface DesktopBackdropProps {
  unit?: PublicUnit;
  /** What the developer posted for the apartment (see `showcaseMedia`); null: nothing to show. */
  media: ShowcaseMedia | null;
  onClose: () => void;
}

/**
 * What sits behind the apartment details on desktop: the apartment showcase
 * (its floor plan as a 3D model, else its photos) when there is something to
 * show, else the dimmed page, which closes the details when clicked.
 */
export const DesktopBackdrop: React.FC<DesktopBackdropProps> = ({ unit, media, onClose }) => {
  // The details float as a card on the right: the plan centres in the room left of it.
  if (unit && media) return <ApartmentShowcase key={unit.id} unit={unit} media={media} onClose={onClose} className="pr-[min(468px,45%)]" />;
  return (
    <motion.div
      className="h-full min-w-0 flex-1 bg-slate-950/50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      aria-hidden="true"
    />
  );
};
