import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { PlusIcon } from '@/constants';

interface ListBusinessFabProps {
  /** Shown only while the page's own "List Your Business" button is off screen. */
  visible: boolean;
  onClick: () => void;
}

/**
 * Phones only: a floating "List Your Business" pill at the bottom centre, so
 * listing a business is one tap from anywhere on the directory. Centred to stay
 * clear of the contact bubble on the right; lifted above the home indicator.
 */
const ListBusinessFab: React.FC<ListBusinessFabProps> = ({ visible, onClick }) => {
  const { t } = useTranslation('businessDirectory');
  const reduceMotion = useReducedMotion();
  const offset = reduceMotion ? 0 : 24;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="pointer-events-none fixed inset-x-0 bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] z-30 flex justify-center sm:hidden"
          initial={{ opacity: 0, y: offset }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: offset }}
          transition={reduceMotion ? { duration: 0.15 } : { type: 'spring', stiffness: 380, damping: 30 }}
        >
          <motion.button
            type="button"
            onClick={onClick}
            className="liquid-tint pointer-events-auto flex min-h-[48px] items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold"
            whileTap={reduceMotion ? undefined : { scale: 0.96 }}
          >
            <PlusIcon className="h-5 w-5" />
            {t('cta.listBusiness', 'List Your Business')}
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ListBusinessFab;
