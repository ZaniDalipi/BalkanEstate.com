import React, { useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, useDragControls, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useMediaQuery } from '@/src/hooks/useMediaQuery';
import { Button } from '@/src/components/ui/button';
import { useEscapeLayer } from '../public/explorer/useEscapeLayer';
import { shouldDismissSheet } from '../../utils/sheetDismiss';
import { useSheetFocus } from './useSheetFocus';

interface FormSheetProps {
  title: string;
  /** A short title for the phone navigation bar (iOS keeps it to a few words); defaults to `title`. */
  barTitle?: string;
  /** The <form id> inside `children`; the sheet's Save button submits it. */
  formId: string;
  submitLabel: string;
  submitting?: boolean;
  submittingLabel?: string;
  onClose: () => void;
  children: React.ReactNode;
}

const SPRING = { type: 'spring', stiffness: 380, damping: 38 } as const;

/**
 * A form in its own layer, presented the way each platform does it.
 * - Phones: an iOS form sheet. It rises from the bottom over a dimmed page,
 *   with a grabber and a navigation bar (Cancel · title · Save). Pulling it
 *   down closes it, and it clears the home indicator. Fields sit in
 *   grouped-inset cards (see FormSheetGroup).
 * - Wider screens: a centred dialog with the buttons at the bottom right.
 * Esc closes it, Tab stays inside, focus returns to the opener, and the page
 * behind doesn't scroll. Motion respects reduced-motion settings.
 */
export const FormSheet: React.FC<FormSheetProps> = ({ title, barTitle, formId, submitLabel, submitting, submittingLabel, onClose, children }) => {
  const { t } = useTranslation('developments');
  const phone = useMediaQuery('(max-width: 767px)');
  const reduce = !!useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const drag = useDragControls();
  useEscapeLayer(panelRef, onClose);
  useSheetFocus(panelRef);
  const saveText = submitting ? submittingLabel ?? submitLabel : submitLabel;
  // The navigation bar has room for one short word, as on iOS.
  const barSave = submitting ? submittingLabel ?? submitLabel : t('sheet.save', 'Save');
  const cancelText = t('wizard.cancel', 'Cancel');

  const sheet = phone ? (
    <motion.div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-x-0 bottom-0 z-[5001] flex max-h-[calc(100dvh-max(env(safe-area-inset-top),12px)-8px)] flex-col rounded-t-[14px] bg-slate-100 shadow-[0_-8px_30px_rgba(0,0,0,0.18)]"
      initial={reduce ? { opacity: 0 } : { y: '100%' }}
      animate={reduce ? { opacity: 1 } : { y: 0 }}
      transition={reduce ? { duration: 0.15 } : SPRING}
      drag={reduce ? false : 'y'}
      dragListener={false}
      dragControls={drag}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0, bottom: 0.7 }}
      dragSnapToOrigin
      onDragEnd={(_, info) => shouldDismissSheet(info.offset.y, info.velocity.y) && onClose()}
    >
      {/* Grabber + navigation bar: the handle for pulling the sheet down. */}
      <div className="shrink-0 touch-none select-none" onPointerDown={(e) => drag.start(e)}>
        <div className="mx-auto mt-2 h-[5px] w-9 rounded-full bg-slate-300" aria-hidden="true" />
        <div className="grid h-12 grid-cols-[1fr_auto_1fr] items-center px-2">
          <button type="button" onClick={onClose} className="min-h-[44px] justify-self-start rounded-lg px-2 text-[17px] text-primary active:opacity-50">
            {cancelText}
          </button>
          <h2 id={titleId} className="max-w-[55vw] truncate text-center text-[17px] font-semibold text-slate-900">
            {barTitle ?? title}
            {barTitle && barTitle !== title && <span className="sr-only"> · {title}</span>}
          </h2>
          <button type="submit" form={formId} disabled={submitting} className="min-h-[44px] justify-self-end rounded-lg px-2 text-[17px] font-semibold text-primary active:opacity-50 disabled:text-slate-400">
            {barSave}
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(env(safe-area-inset-bottom)+20px)] pt-2">{children}</div>
    </motion.div>
  ) : (
    <motion.div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="relative z-[5001] flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl"
      initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
    >
      <h2 id={titleId} className="shrink-0 px-6 pb-2 pt-6 text-lg font-semibold text-slate-900">{title}</h2>
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-3">{children}</div>
      <div className="flex shrink-0 justify-end gap-3 border-t border-slate-200 px-6 py-4">
        <Button type="button" variant="ghost" className="min-h-[44px]" onClick={onClose}>{cancelText}</Button>
        <Button type="submit" form={formId} className="min-h-[44px] px-5" disabled={submitting}>{saveText}</Button>
      </div>
    </motion.div>
  );

  return createPortal(
    <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4">
      <motion.div
        className="absolute inset-0 bg-black/40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reduce ? 0 : 0.2 }}
        onClick={onClose}
        aria-hidden="true"
      />
      {sheet}
    </div>,
    document.body
  );
};

/**
 * A grouped-inset section, like iOS Settings: a white rounded card on the
 * sheet's grey background on phones; plain spacing on wider screens.
 */
export const FormSheetGroup: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={`space-y-4 rounded-xl bg-white p-4 md:rounded-none md:bg-transparent md:p-0 ${className ?? ''}`}>{children}</div>
);
