import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useSmoothFlag } from '@/src/shared/hooks/useSmoothFlag';
import { MAP_BACKDROP } from './googleMapConstants';

interface MapLoadingVeilProps {
  /** Hide the map underneath until it is ready to be seen in one piece. */
  covered: boolean;
  /** Show the "Loading properties" pill. */
  busy: boolean;
}

/**
 * The one loading layer over a map.
 *
 * Without it a map arrives in pieces: a grey box, a different grey placeholder,
 * tiles popping in, then the pins. The veil covers all of that in the map's own
 * backdrop colour and fades away once the map reports it is ready (tiles and
 * first pins drawn), so the map appears once, smoothly. The pill is debounced
 * (`useSmoothFlag`) so short loads never flash it. Neither layer takes input:
 * the toggle, search bar and menu stay usable the whole time.
 */
const MapLoadingVeil: React.FC<MapLoadingVeilProps> = ({ covered, busy }) => {
  const { t } = useTranslation(['search']);
  const reduceMotion = useReducedMotion();
  const showPill = useSmoothFlag(busy);
  const fade = { duration: reduceMotion ? 0 : 0.35, ease: [0.32, 0.72, 0, 1] as const };

  return (
    <>
      <AnimatePresence initial={false}>
        {covered && (
          <motion.div
            key="veil"
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-[1002]"
            style={{ backgroundColor: MAP_BACKDROP }}
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={fade}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showPill && (
          <motion.div
            key="pill"
            role="status"
            aria-live="polite"
            className="pointer-events-none absolute inset-x-0 top-1/2 z-[1003] flex justify-center px-4"
            initial={{ opacity: 0, y: reduceMotion ? 0 : 6, scale: reduceMotion ? 1 : 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : -4, scale: reduceMotion ? 1 : 0.98 }}
            transition={fade}
          >
            <div className="-translate-y-1/2 flex items-center gap-2.5 rounded-full bg-white/95 px-4 py-2.5 shadow-lg ring-1 ring-black/5">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent motion-reduce:animate-none" aria-hidden="true" />
              <span className="text-sm font-medium text-neutral-700">
                {t('search:ui.searchPage.loadingProperties', 'Loading properties')}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default MapLoadingVeil;
