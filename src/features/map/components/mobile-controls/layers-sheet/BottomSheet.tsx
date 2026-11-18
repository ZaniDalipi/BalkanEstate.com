import React, { useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, useDragControls, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ErrorBoundary } from '@/src/app/components/ErrorBoundary';
import { useEscapeLayer } from '@/src/features/developments/components/public/explorer/useEscapeLayer';
import { useSheetFocus } from '@/src/features/developments/components/shared/useSheetFocus';
import { shouldDismissSheet } from '@/src/features/developments/utils/sheetDismiss';
import SheetErrorFallback from './SheetErrorFallback';

interface BottomSheetProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

/** iOS sheet presentation: a stiff, barely-bouncy spring. */
const SPRING = { type: 'spring', stiffness: 420, damping: 40, mass: 0.9 } as const;

/**
 * An iOS-style sheet for the map on phones: it springs up over a dimmed map on
 * liquid glass, with a grabber and a title bar. Pull it down (or flick), tap
 * the dimmed map, press ×, or Esc to close. Tab stays inside, focus returns to
 * the opener, and reduced motion swaps the slide for a fade. Mount it inside
 * <AnimatePresence> so it slides back down on close.
 */
const BottomSheet: React.FC<BottomSheetProps> = ({ title, onClose, children }) => {
  const { t } = useTranslation('common');
  const reduce = !!useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const drag = useDragControls();
  useEscapeLayer(panelRef, onClose);
  useSheetFocus(panelRef);

  return createPortal(
    <div className="fixed inset-0 z-[5000]">
      <motion.div
        aria-hidden="true"
        className="absolute inset-0 bg-black/25"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduce ? 0.12 : 0.28 }}
        onClick={onClose}
      />
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="thumb-glass thumb-glass--panel fixed inset-x-2 bottom-2 z-[5001] flex max-h-[calc(100dvh-max(env(safe-area-inset-top),12px)-16px)] flex-col rounded-[32px] pb-[env(safe-area-inset-bottom)]"
        initial={reduce ? { opacity: 0 } : { y: '110%' }}
        animate={reduce ? { opacity: 1 } : { y: 0 }}
        exit={reduce ? { opacity: 0 } : { y: '110%' }}
        transition={reduce ? { duration: 0.15 } : SPRING}
        drag={reduce ? false : 'y'}
        dragListener={false}
        dragControls={drag}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.05, bottom: 0.8 }}
        dragSnapToOrigin
        onDragEnd={(_, info) => shouldDismissSheet(info.offset.y, info.velocity.y) && onClose()}
      >
        <div className="shrink-0 touch-none select-none" onPointerDown={(e) => drag.start(e)}>
          <div className="mx-auto mt-2 h-[5px] w-9 rounded-full bg-neutral-900/20" aria-hidden="true" />
          <div className="flex items-center justify-between pl-5 pr-2">
            <h2 id={titleId} className="text-[20px] font-bold tracking-tight text-neutral-900">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('close', 'Close')}
              className="flex h-11 w-11 items-center justify-center rounded-full active:opacity-60"
            >
              <span aria-hidden="true" className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-neutral-900/[0.08] text-neutral-500">
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </span>
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 pt-1">
          <ErrorBoundary level="feature" fallback={<SheetErrorFallback onClose={onClose} />}>
            {children}
          </ErrorBoundary>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
};

export default BottomSheet;
