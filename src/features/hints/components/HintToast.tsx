import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { SoftIcon } from '@/src/shared/illustrations';
import { HINTS } from '../utils/hintCatalog';
import { useHintsStore } from '../hooks/hintsStore';

/**
 * The small tip that shows up on its own: one line of text near the bottom of
 * the screen. It never blocks the page — tap it for all tips, or hide it.
 */
const HintToast: React.FC = () => {
  const { t } = useTranslation('common');
  const reduceMotion = useReducedMotion();
  const currentId = useHintsStore((s) => s.currentId);
  const hide = useHintsStore((s) => s.hide);
  const openPanel = useHintsStore((s) => s.openPanel);
  const hint = HINTS.find((h) => h.id === currentId);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-40 flex justify-center px-4 bottom-[calc(env(safe-area-inset-bottom,0px)+5.5rem)] md:bottom-6 md:pl-[calc(var(--sidebar-rail-w,0px)+1rem)]"
    >
      <AnimatePresence>
        {hint && (
          <motion.div
            key={hint.id}
            role="status"
            aria-live="polite"
            data-testid="hint-toast"
            initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
            transition={{ duration: reduceMotion ? 0 : 0.25 }}
            className="pointer-events-auto flex w-full max-w-md items-center gap-1 rounded-2xl border border-neutral-200 bg-white py-1 pl-3 pr-1 shadow-lg"
          >
            <SoftIcon name="lightbulb" className="h-5 w-5 shrink-0" />
            <button
              type="button"
              onClick={openPanel}
              className="min-h-[44px] flex-1 px-1 text-left text-[13px] leading-snug text-neutral-700"
            >
              <span className="font-semibold text-neutral-900">{t('hints.ui.tipLabel', 'Tip')}: </span>
              {t(hint.key, hint.text)}{' '}
              <span className="whitespace-nowrap font-semibold text-primary">{t('hints.ui.allTips', 'All tips')}</span>
            </button>
            <button
              type="button"
              onClick={hide}
              aria-label={t('hints.ui.hide', 'Hide tip')}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HintToast;
