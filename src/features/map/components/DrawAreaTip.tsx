import React, { useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { SoftIcon } from '@/src/shared/illustrations';
import { useEscapeLayer } from '@/src/features/developments/components/public/explorer/useEscapeLayer';
import { isTouchPrimary } from '../utils/drawTip';

interface DrawAreaTipProps {
  /** Drawing mode is on. */
  isDrawing: boolean;
  /** Leave drawing mode (Esc). */
  onCancel: () => void;
}

/**
 * Says how to draw a search area while drawing mode is on. The area is a
 * rectangle made by one drag — pressing, moving and releasing — not by tapping
 * two corners, which is what people try first. The tip never takes input, so
 * the drag still reaches the map underneath.
 */
const DrawAreaTip: React.FC<DrawAreaTipProps> = ({ isDrawing, onCancel }) => {
  const { t } = useTranslation(['search']);
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  useEscapeLayer(ref, onCancel, isDrawing);

  const touch = isTouchPrimary();
  const how = touch
    ? t('search:map.drawTip.touch', 'Touch the map and drag your finger across the area you want, then lift it.')
    : t('search:map.drawTip.mouse', 'Press and hold the mouse button on the map, drag across the area you want, then let go.');

  return (
    <AnimatePresence>
      {isDrawing && (
        <motion.div
          ref={ref}
          role="status"
          aria-live="polite"
          data-testid="draw-area-tip"
          initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.2 }}
          className="pointer-events-none absolute left-1/2 top-[30%] z-[1002] w-[min(92%,22rem)] -translate-x-1/2 rounded-2xl bg-neutral-900/90 px-4 py-3 text-white shadow-xl backdrop-blur-sm landscape:top-[22%]"
        >
          <p className="flex items-center gap-2 text-sm font-semibold">
            <SoftIcon name="pencil" className="h-5 w-5 shrink-0" />
            {t('search:map.drawTip.title', 'Draw your search area')}
          </p>
          <p className="mt-1 text-xs leading-snug text-neutral-200">{how}</p>
          <p className="mt-1 text-xs leading-snug text-neutral-300">
            {t('search:map.drawTip.oneDrag', 'It is one drag, not two taps: the area is the rectangle between where you start and where you stop.')}
          </p>
          <p className="mt-1 text-[11px] text-neutral-400">
            {t('search:map.drawTip.cancel', 'Press Esc or Cancel to stop drawing.')}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DrawAreaTip;
