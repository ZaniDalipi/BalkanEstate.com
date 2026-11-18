import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { formatBadgeCount } from '@/shared/utils/badgeCount';

interface MapOptionsFabProps {
  onOpen: () => void;
  isSheetOpen: boolean;
  /** Layers / overlays on: shown as a count bubble. */
  activeLayerCount: number;
  /** Never opened on this device yet: a soft pulse draws the eye. */
  isNew: boolean;
}

const SPRING = { type: 'spring', stiffness: 480, damping: 30 } as const;

/**
 * The phone map's one way into every map setting: an extended floating action
 * button, bottom left above the List/Map switch, that says what it holds
 * ("Map Options · Style, climate & layers"). It springs in, squashes under the
 * finger, and pulses until it has been opened once. Mount inside
 * <AnimatePresence> so it slides away while drawing or while the sheet is up.
 */
const MapOptionsFab: React.FC<MapOptionsFabProps> = ({ onOpen, isSheetOpen, activeLayerCount, isNew }) => {
  const { t } = useTranslation('search');
  const reduce = !!useReducedMotion();
  const badge = formatBadgeCount(activeLayerCount);
  const title = t('map.options.title', 'Map Options');
  const subtitle = t('map.options.subtitle', 'Style, climate & layers');

  return (
    <motion.button
      type="button"
      onClick={onOpen}
      aria-haspopup="dialog"
      aria-expanded={isSheetOpen}
      aria-label={badge ? `${title}: ${subtitle} (${badge})` : `${title}: ${subtitle}`}
      className="relative flex min-h-[52px] items-center gap-2.5 rounded-full bg-gradient-to-b from-[#2f8bff] to-[#0a5ce0] py-2 pl-2 pr-4 text-left text-white shadow-[0_10px_24px_-8px_rgba(10,92,224,0.65),inset_0_1px_0_rgba(255,255,255,0.35)] [-webkit-tap-highlight-color:transparent] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30"
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.9 }}
      transition={reduce ? { duration: 0.15 } : SPRING}
      whileTap={reduce ? undefined : { scale: 0.94 }}
    >
      {isNew && !reduce && (
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-[#2f8bff]"
          animate={{ scale: [1, 1.18], opacity: [0.7, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
        />
      )}
      <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3.5 21 8l-9 4.5L3 8z" />
          <path d="m3 12.2 9 4.5 9-4.5M3 16.2l9 4.5 9-4.5" />
        </svg>
      </span>
      <span aria-hidden="true" className="flex flex-col">
        <span className="text-[15px] font-semibold leading-tight">{title}</span>
        <span className="text-[11px] font-medium leading-tight text-white/80">{subtitle}</span>
      </span>
      {badge && (
        <span aria-hidden="true" className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[11px] font-bold leading-none text-primary shadow">
          {badge}
        </span>
      )}
    </motion.button>
  );
};

export default MapOptionsFab;
