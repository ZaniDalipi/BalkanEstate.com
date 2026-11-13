import React, { useEffect, useMemo, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { SoftIcon } from '@/src/shared/illustrations';
import { useEscapeLayer } from '@/src/features/developments/components/public/explorer/useEscapeLayer';
import { useRouteView } from '@/src/app/router/useRouteView';
import { useHintsStore } from '../hooks/hintsStore';
import { hintPageFor } from '../utils/hintPage';
import { groupHints } from '../utils/hintGroups';
import { readDeviceTraits } from '../utils/hintDevice';
import HintsAutoSwitch from './HintsAutoSwitch';
import HintGroupList from './HintGroupList';

/** All tips, the page on screen first, and the switch for tips that show up on their own. */
const HintsPanel: React.FC = () => {
  const { t } = useTranslation('common');
  const reduceMotion = useReducedMotion();
  const open = useHintsStore((s) => s.panelOpen);
  const close = useHintsStore((s) => s.closePanel);
  const { view, detail } = useRouteView();
  const groups = useMemo(() => groupHints(hintPageFor(view, detail), readDeviceTraits()), [view, detail]);
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEscapeLayer(ref, close, open);

  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/30 sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.2 }}
          onClick={close}
        >
          <motion.div
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-labelledby="hints-panel-title"
            data-testid="hints-panel"
            initial={{ y: reduceMotion ? 0 : 24 }}
            animate={{ y: 0 }}
            exit={{ y: reduceMotion ? 0 : 24 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="dialog-fit flex max-h-[85dvh] w-full flex-col rounded-t-3xl bg-white shadow-2xl sm:max-w-lg sm:rounded-3xl"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
          >
            <div className="flex items-start gap-2 border-b border-neutral-100 px-5 pb-3 pt-4">
              <SoftIcon name="lightbulb" className="mt-0.5 h-6 w-6 shrink-0" />
              <div className="min-w-0 flex-1">
                <h2 id="hints-panel-title" className="text-lg font-bold text-neutral-900">{t('hints.ui.title', 'Tips')}</h2>
                <p className="text-sm text-neutral-500">{t('hints.ui.intro', 'Small things you can do that are easy to miss.')}</p>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={close}
                aria-label={t('hints.ui.close', 'Close tips')}
                className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-3">
              {groups.map((g) => <HintGroupList key={g.page} group={g} />)}
            </div>
            <div className="border-t border-neutral-100 px-5 py-2">
              <HintsAutoSwitch />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default HintsPanel;
