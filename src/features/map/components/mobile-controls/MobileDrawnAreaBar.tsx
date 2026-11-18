import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { SearchPlusIcon, XCircleIcon } from '@/constants';

interface MobileDrawnAreaBarProps {
  isAuthenticated: boolean;
  isSaving: boolean;
  onSaveSearch: () => void;
  onClear: () => void;
}

/** Save / Clear for a drawn area: a glass capsule that springs in under the buttons. */
const MobileDrawnAreaBar: React.FC<MobileDrawnAreaBarProps> = ({ isAuthenticated, isSaving, onSaveSearch, onClear }) => {
  const { t } = useTranslation('search');
  const reduce = !!useReducedMotion();
  const tap = reduce ? undefined : { scale: 0.92 };
  return (
    <motion.div
      className="thumb-glass relative flex flex-col gap-1 rounded-[24px] p-1"
      initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6, y: -8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6, y: -8 }}
      transition={reduce ? { duration: 0.15 } : { type: 'spring', stiffness: 520, damping: 32 }}
      style={{ transformOrigin: 'top right' }}
    >
      {isAuthenticated && (
        <motion.button
          type="button"
          whileTap={tap}
          onClick={onSaveSearch}
          disabled={isSaving}
          aria-busy={isSaving}
          className="flex min-h-11 min-w-11 flex-col items-center justify-center gap-0.5 rounded-[20px] bg-primary px-2 text-white disabled:opacity-50"
        >
          <SearchPlusIcon className="h-5 w-5" />
          <span className="text-[10px] font-semibold leading-none">{isSaving ? t('map.saving') : t('map.save', 'Save')}</span>
        </motion.button>
      )}
      <motion.button
        type="button"
        whileTap={tap}
        onClick={onClear}
        aria-label={t('map.clearArea', 'Clear Area')}
        className="flex min-h-11 min-w-11 flex-col items-center justify-center gap-0.5 rounded-[20px] px-2 text-red-600"
      >
        <XCircleIcon className="h-5 w-5" />
        <span className="text-[10px] font-semibold leading-none">{t('map.clear', 'Clear')}</span>
      </motion.button>
    </motion.div>
  );
};

export default MobileDrawnAreaBar;
