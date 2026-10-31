import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useIsPresent, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import type { PublicUnit } from '../../../../types';
import { useFocusTrap } from './useFocusTrap';
import { useEscapeLayer } from '../useEscapeLayer';
import { revealAboveSheet } from '../../../../utils/revealAboveSheet';
import { SHEET_SHARE } from '../../../../utils/sheetSnap';
import { useSheetMotion } from '../../../../hooks/useSheetMotion';
import { DrawerUnitContent } from './DrawerUnitContent';
import { SheetHandle } from './SheetHandle';

interface ApartmentDetailsDrawerProps {
  slug: string;
  /** The open unit (from `?unit=`); null renders nothing. */
  unitId: string | null;
  onClose: () => void;
  /** Already-loaded list row, shown while the full unit loads. */
  preview?: PublicUnit;
  /** On phones, the open apartment inside it (or it) is scrolled into view above the half-height sheet. */
  revealRef?: React.RefObject<HTMLElement>;
}

/** Wait for the sheet to slide in (and the explorer to settle) before scrolling behind it. */
const REVEAL_DELAY_MS = 300;

const useIsDesktop = () => {
  const query = '(min-width: 768px)';
  const [desktop, setDesktop] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(query).matches);
  useEffect(() => {
    const mq = window.matchMedia?.(query);
    if (!mq?.addEventListener) return undefined;
    const on = () => setDesktop(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return desktop;
};

const Panel: React.FC<ApartmentDetailsDrawerProps & { desktop: boolean }> = ({ slug, unitId, onClose, preview, revealRef, desktop }) => {
  const { t } = useTranslation('developments');
  const ref = useRef<HTMLDivElement>(null);
  const [childModalOpen, setChildModalOpen] = useState(false);
  const trapKeys = useFocusTrap(ref, childModalOpen);
  // Esc closes the drawer (history back) only when no platform modal is above
  // it — and not again while the exit animation runs.
  const present = useIsPresent();
  useEscapeLayer(ref, onClose, present && !childModalOpen);
  const reduce = !!useReducedMotion();
  const contentRef = useRef<HTMLDivElement>(null);
  // Phones: the sheet follows the finger, settles on half / full / closed, and the building behind dims and clears with it.
  const sheet = useSheetMotion({ enabled: !desktop, panelRef: ref, contentRef, onClose, reduceMotion: reduce });
  const { size } = sheet;

  // Phones: bring the apartment (in the building view) into the space above the sheet.
  useEffect(() => {
    if (desktop || !unitId) return undefined;
    const timer = window.setTimeout(() => {
      if (revealRef?.current) revealAboveSheet(revealRef.current, unitId, SHEET_SHARE.half, !reduce);
    }, REVEAL_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [desktop, unitId, revealRef, reduce]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const hidden = desktop ? { x: '100%' } : { y: '100%' };
  return (
    // Inline z-index (not a class) so isTopmostLayer reads the same stacking everywhere.
    <div className="fixed inset-0" style={{ zIndex: 4500 }}>
      {desktop ? (
        <motion.div className="absolute inset-0 bg-slate-950/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} aria-hidden="true" />
      ) : (
        <motion.div className="absolute inset-0 bg-slate-950/50" style={{ opacity: sheet.backdrop }} onClick={onClose} aria-hidden="true" />
      )}
      <motion.div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={t('explorer.drawer.title', 'Apartment details')}
        tabIndex={-1}
        {...(desktop
          ? {
              initial: reduce ? { opacity: 0 } : hidden,
              animate: reduce ? { opacity: 1 } : { x: 0, y: 0 },
              exit: reduce ? { opacity: 0 } : hidden,
              transition: { type: 'tween', duration: 0.25, ease: 'easeOut' },
            }
          : {})}
        onKeyDown={trapKeys}
        className={
          desktop
            ? 'absolute inset-y-0 right-0 flex w-full max-w-[460px] flex-col bg-white shadow-2xl outline-none'
            : 'absolute inset-x-0 bottom-0 flex flex-col rounded-t-3xl bg-white shadow-2xl outline-none will-change-transform'
        }
        style={desktop ? undefined : { y: sheet.y, height: sheet.geometry.sheetHeight }}
      >
        {!desktop && <SheetHandle size={size} onToggle={sheet.toggle} />}
        <button
          type="button"
          onClick={onClose}
          data-autofocus
          className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-slate-700 shadow hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label={t('explorer.drawer.close', 'Close')}
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
        {/* At half height the content does not scroll: a swipe up grows the sheet instead (then it scrolls). */}
        <div
          ref={contentRef}
          className={`min-h-0 flex-1 overscroll-contain ${desktop || size === 'full' ? 'overflow-y-auto' : 'overflow-hidden'}`}
          style={desktop ? undefined : { touchAction: size === 'full' ? 'auto' : 'pan-x' }}
        >
          {unitId && <DrawerUnitContent slug={slug} unitId={unitId} preview={preview} onChildModalChange={setChildModalOpen} />}
        </div>
      </motion.div>
    </div>
  );
};

/**
 * Apartment details: a right-hand drawer on desktop, a bottom sheet on
 * phones that opens at half height (the building stays in view above it) and
 * grows to full height from its handle. Portalled to <body> at z 4500 — above the explorer (4000), below the
 * platform modals (≥ 5000) it opens (inquiry, viewing, gallery). Focus is
 * trapped while open and Esc closes it unless a modal is stacked above
 * (useEscapeLayer / isTopmostLayer), so Esc in a modal closes only the modal.
 */
export const ApartmentDetailsDrawer: React.FC<ApartmentDetailsDrawerProps> = (props) => {
  const desktop = useIsDesktop();
  if (typeof document === 'undefined') return null;
  return createPortal(
    <AnimatePresence>{props.unitId && <Panel key="drawer" {...props} desktop={desktop} />}</AnimatePresence>,
    document.body
  );
};
