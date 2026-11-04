import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

interface LeaveFormDialogProps {
  open: boolean;
  /** Stay on the form */
  onStay: () => void;
  /** Leave; what was typed stays saved as a draft */
  onKeepDraft: () => void;
  /** Leave and throw away what was typed */
  onDiscard: () => void;
}

const BUTTON = 'w-full min-h-[44px] px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2';

/**
 * Asked when someone leaves a form with unsent data (back button, a link, the
 * form's own back arrow): keep editing, leave with the draft saved, or discard.
 * Esc and the backdrop keep editing, the safe choice.
 */
const LeaveFormDialog: React.FC<LeaveFormDialogProps> = ({ open, onStay, onKeepDraft, onDiscard }) => {
  const { t } = useTranslation('common');
  const reduceMotion = useReducedMotion();
  const titleId = useId();
  const messageId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const stayRef = useRef<HTMLButtonElement>(null);
  const onStayRef = useRef(onStay);
  onStayRef.current = onStay;

  useEffect(() => {
    if (!open) return undefined;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    stayRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // This dialog is the top layer: nothing underneath should also close
        e.preventDefault();
        e.stopPropagation();
        onStayRef.current();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const buttons = Array.from(panelRef.current.querySelectorAll<HTMLButtonElement>('button'));
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center bg-black/50 p-4"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
          onClick={onStay}
        >
          <motion.div
            ref={panelRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={messageId}
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dialog-fit"
            style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
            initial={reduceMotion ? false : { y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduceMotion ? { opacity: 1 } : { y: 24, opacity: 0 }}
            onClick={e => e.stopPropagation()}
          >
            <h2 id={titleId} className="text-lg font-bold text-neutral-900">
              {t('formDraft.leaveTitle', { defaultValue: 'Leave this form?' })}
            </h2>
            <p id={messageId} className="mt-2 text-sm text-neutral-600">
              {t('formDraft.leaveMessage', {
                defaultValue: 'You have not sent it yet. Save it as a draft on this device to finish later, or discard it.',
              })}
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <button ref={stayRef} type="button" onClick={onStay} className={`${BUTTON} bg-primary text-white hover:bg-primary/90 focus-visible:ring-primary`}>
                {t('formDraft.stay', { defaultValue: 'Keep editing' })}
              </button>
              <button type="button" onClick={onKeepDraft} className={`${BUTTON} border border-neutral-300 text-neutral-800 hover:bg-neutral-50 focus-visible:ring-neutral-400`}>
                {t('formDraft.keepDraft', { defaultValue: 'Save draft and leave' })}
              </button>
              <button type="button" onClick={onDiscard} className={`${BUTTON} text-red-600 hover:bg-red-50 focus-visible:ring-red-500`}>
                {t('formDraft.discard', { defaultValue: 'Discard and leave' })}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export default LeaveFormDialog;
