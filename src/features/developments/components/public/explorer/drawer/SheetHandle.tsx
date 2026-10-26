import React from 'react';
import { motion, type PanInfo } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import type { SheetSize } from '../../../../utils/sheetSize';

interface SheetHandleProps {
  size: SheetSize;
  onToggle: () => void;
  /** Vertical drag distance when the finger lifts (negative is up). */
  onDragEnd: (offsetY: number) => void;
}

/**
 * The grab bar at the top of the phone sheet: tap to switch between half and
 * full height, or drag it (up: full, down: smaller, then closed). A real
 * button, 44px tall, so it works with a keyboard and screen readers too.
 */
export const SheetHandle: React.FC<SheetHandleProps> = ({ size, onToggle, onDragEnd }) => {
  const { t } = useTranslation('developments');
  return (
    <motion.button
      type="button"
      onClick={onToggle}
      onPanEnd={(_e: PointerEvent, info: PanInfo) => onDragEnd(info.offset.y)}
      aria-expanded={size === 'full'}
      aria-label={size === 'full' ? t('explorer.drawer.collapse', 'Show the building') : t('explorer.drawer.expand', 'Show all details')}
      className="flex h-11 w-full shrink-0 touch-none items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
    >
      <span className="h-1.5 w-10 rounded-full bg-slate-300" aria-hidden="true" />
    </motion.button>
  );
};
