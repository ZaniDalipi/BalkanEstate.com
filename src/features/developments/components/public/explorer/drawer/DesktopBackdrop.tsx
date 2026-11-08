import React from 'react';
import { motion } from 'framer-motion';
import { usePublicUnit } from '../../../../hooks/useDevelopment';
import type { PublicUnit } from '../../../../types';
import { ApartmentShowcase } from './showcase/ApartmentShowcase';

interface DesktopBackdropProps {
  slug: string;
  unitId: string;
  /** Already-loaded list row; it carries the floor plan, so the showcase can open with the drawer. */
  preview?: PublicUnit;
  onClose: () => void;
}

/**
 * What sits beside the details column on desktop: the apartment showcase (its
 * floor plan as a 3D model) when the apartment has a plan, else the dimmed
 * page, which closes the details when clicked.
 */
export const DesktopBackdrop: React.FC<DesktopBackdropProps> = ({ slug, unitId, preview, onClose }) => {
  const { unit: full } = usePublicUnit(slug, unitId);
  const unit = full ?? preview;
  const plan = unit?.floorplan?.url ? unit.floorplan : undefined;
  if (unit && plan) return <ApartmentShowcase key={unit.id} unit={unit} plan={plan} onClose={onClose} />;
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
