import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import XmarkIcon from '@/src/components/ui/XmarkIcon';

interface LayersHintProps {
  onOpen: () => void;
  onDismiss: () => void;
}

/**
 * A small dark tip bubble beside the Layers button ("Map style, climate risks
 * and layers are here"), like an iOS TipKit popover. Tapping it opens the
 * sheet; × hides it. Mount inside <AnimatePresence>.
 */
const LayersHint: React.FC<LayersHintProps> = ({ onOpen, onDismiss }) => {
  const { t } = useTranslation(['search', 'common']);
  const reduce = !!useReducedMotion();
  return (
    <motion.div
      aria-live="polite"
      className="absolute right-full top-2 mr-3 flex w-[200px] items-start rounded-2xl bg-neutral-900/90 text-white shadow-xl shadow-black/20 backdrop-blur-md"
      style={{ transformOrigin: 'right center' }}
      initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.8, x: 8 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.85, x: 6 }}
      transition={reduce ? { duration: 0.15 } : { type: 'spring', stiffness: 460, damping: 30 }}
    >
      {/* Arrow pointing at the Layers button. */}
      <span aria-hidden="true" className="absolute -right-1.5 top-5 h-3 w-3 rotate-45 bg-neutral-900/90" />
      <button
        type="button"
        onClick={onOpen}
        className="relative min-h-11 flex-1 rounded-2xl py-2.5 pl-3.5 text-left text-[13px] font-medium leading-snug focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
      >
        {t('search:map.layersHint', 'Map style, climate risks and layers are here')}
      </button>
      <button
        type="button"
        onClick={onDismiss}
        aria-label={t('common:close', 'Close')}
        className="relative flex h-11 w-9 shrink-0 items-center justify-center text-white/70 active:text-white"
      >
        <XmarkIcon className="h-3.5 w-3.5" strokeWidth={2.75} />
      </button>
    </motion.div>
  );
};

export default LayersHint;
