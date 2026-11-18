import React, { useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useEscapeLayer } from '@/src/features/developments/components/public/explorer/useEscapeLayer';
import { useSheetFocus } from '@/src/features/developments/components/shared/useSheetFocus';

interface DrawLoginPromptProps {
  onLogIn: () => void;
  onDrawWithoutSaving: () => void;
  onCancel: () => void;
}

const BUTTON = 'flex min-h-11 w-full items-center justify-center px-4 text-[17px] text-primary active:bg-neutral-900/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40';

/**
 * "Log in to save your area", shown as an iOS alert before a logged-out user
 * draws: it pops in (scale + fade) over a dimmed page on liquid glass, with
 * stacked actions. Never a dead end: they can log in, draw without saving,
 * or cancel. Esc and the dimmed page cancel; Tab stays inside.
 * Mount it inside <AnimatePresence> so it fades out on close.
 */
const DrawLoginPrompt: React.FC<DrawLoginPromptProps> = ({ onLogIn, onDrawWithoutSaving, onCancel }) => {
  const { t } = useTranslation(['search', 'common']);
  const reduce = !!useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const messageId = useId();
  useEscapeLayer(ref, onCancel);
  useSheetFocus(ref);

  return createPortal(
    <div className="fixed inset-0 z-[5000] flex items-center justify-center p-6">
      <motion.div
        aria-hidden="true"
        className="absolute inset-0 bg-black/30"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onCancel}
      />
      <motion.div
        ref={ref}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
        className="thumb-glass thumb-glass--panel relative z-[5001] w-[280px] max-w-full overflow-hidden rounded-[22px]"
        initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.12 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.94 }}
        transition={reduce ? { duration: 0.15 } : { type: 'spring', stiffness: 520, damping: 34 }}
      >
        <div className="px-4 pb-4 pt-5 text-center">
          <h2 id={titleId} className="text-[17px] font-semibold leading-snug text-neutral-900">
            {t('search:map.drawLogin.title', 'Log in to save your area')}
          </h2>
          <p id={messageId} className="mt-1 text-[13px] leading-snug text-neutral-700">
            {t('search:map.drawLogin.message', 'Log in before you draw, so you can save this area and get alerts for new listings in it.')}
          </p>
        </div>
        <div className="divide-y divide-neutral-900/10 border-t border-neutral-900/10">
          <button type="button" onClick={onLogIn} className={`${BUTTON} font-semibold`}>
            {t('search:map.drawLogin.login', 'Log In')}
          </button>
          <button type="button" onClick={onDrawWithoutSaving} className={BUTTON}>
            {t('search:map.drawLogin.drawAnyway', 'Draw Without Saving')}
          </button>
          <button type="button" onClick={onCancel} className={BUTTON}>
            {t('common:actions.cancel', 'Cancel')}
          </button>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
};

export default DrawLoginPrompt;
