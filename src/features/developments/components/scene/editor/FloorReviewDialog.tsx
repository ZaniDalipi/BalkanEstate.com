import React, { useEffect, useId, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ScanSearch } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { useEscapeLayer } from '../../public/explorer/useEscapeLayer';
import type { FloorReview } from './useFloorReview';

/**
 * Shown right after floors are placed automatically: the positions are a first
 * guess on an angled photo, so the owner is asked to check and adjust every
 * region before publishing. Esc or "Later" closes it; the checklist stays.
 */
export const FloorReviewDialog: React.FC<{ review: FloorReview }> = ({ review }) => {
  const { t } = useTranslation('developments');
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  const startRef = useRef<HTMLButtonElement>(null);
  const reduce = useReducedMotion();
  const open = review.dialogOpen;
  useEscapeLayer(ref, review.closeDialog, open);
  useEffect(() => { if (open) startRef.current?.focus(); }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[4100] flex items-center justify-center bg-slate-900/40 p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduce ? 0 : 0.15 }}
        >
          <motion.div
            ref={ref}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={`${id}-title`}
            aria-describedby={`${id}-body`}
            className="dialog-fit w-full max-w-md space-y-3 overflow-y-auto rounded-2xl bg-white p-5 shadow-xl"
            initial={reduce ? false : { y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={reduce ? undefined : { y: 12, opacity: 0 }}
          >
            <div className="flex items-center gap-2">
              <ScanSearch className="h-5 w-5 text-amber-600" aria-hidden="true" />
              <h2 id={`${id}-title`} className="text-base font-semibold text-slate-900">
                {t('editor.review.title', 'Check every new floor')}
              </h2>
            </div>
            <div id={`${id}-body`} className="space-y-2 text-sm text-slate-700">
              <p>{t('editor.review.intro', { count: review.total, defaultValue: '{{count}} regions were placed automatically from your drawing. The photo is taken at an angle, so their positions are a first guess and can be off, most of all on the top floors and at the corners of the building.' })}</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>{t('editor.review.move', 'Drag each region onto its balcony or windows and pull its corners until it fits the building.')}</li>
                <li>{t('editor.review.link', 'Check that each one links to the right apartment. Copies without a match are marked Missing link.')}</li>
                <li>{t('editor.review.mark', 'A region counts as checked once you move or reshape it, or press Looks right.')}</li>
              </ul>
              <p className="text-xs text-slate-500">{t('editor.review.publishNote', 'Until every region is checked, publishing asks you to confirm.')}</p>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" className="min-h-[44px]" onClick={review.closeDialog}>{t('editor.review.later', 'Later')}</Button>
              <Button ref={startRef} className="min-h-[44px]" onClick={review.next}>{t('editor.review.start', 'Start checking')}</Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
