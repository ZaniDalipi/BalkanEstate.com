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
import { DesktopBackdrop } from './DesktopBackdrop';
import { useIsDesktop } from '../../../../hooks/useIsDesktop';
import { useShowcase } from './showcase/useShowcase';
import { FRAME_DRIVEN } from '../../motion/frameDriven';

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
  // Desktop: the plan or photos rise beside the details, which then float as a card.
  const showcase = useShowcase(slug, unitId, preview, desktop);
  const floating = !!showcase.media;

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

  const dialog = { ref, role: 'dialog', 'aria-modal': true, 'aria-label': t('explorer.drawer.title', 'Apartment details'), tabIndex: -1, onKeyDown: trapKeys } as const;
  const body = (
    <>
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
        {unitId && <DrawerUnitContent slug={slug} unitId={unitId} preview={preview} onChildModalChange={setChildModalOpen} besideShowcase={floating} />}
      </div>
    </>
  );

  // Inline z-index (not a class) so isTopmostLayer reads the same stacking everywhere.
  if (desktop) {
    const hidden = floating ? { x: 72, opacity: 0 } : { x: '100%' };
    return (
      <div className="fixed inset-0" style={{ zIndex: 4500 }}>
        {/* The dialog spans the screen: the apartment showcase (or the dimmed page) left, the details right. */}
        <div {...dialog} className="absolute inset-0 flex outline-none">
          <DesktopBackdrop unit={showcase.unit} media={showcase.media} onClose={onClose} />
          <motion.div
            {...FRAME_DRIVEN}
            initial={reduce ? { opacity: 0 } : hidden}
            animate={reduce ? { opacity: 1 } : { x: 0, opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { ...hidden, transition: { duration: 0.3, ease: 'easeIn' } }}
            transition={floating && !reduce ? { duration: 0.7, delay: 0.4, ease: [0.22, 1, 0.36, 1] } : { type: 'tween', duration: 0.25, ease: 'easeOut' }}
            className={
              floating
                ? 'absolute right-6 top-1/2 flex max-h-[calc(100dvh-3rem)] w-[min(420px,calc(100%-3rem))] -translate-y-1/2 flex-col overflow-hidden rounded-[28px] bg-white shadow-[0_40px_90px_-30px_rgba(60,40,20,0.45)] ring-1 ring-black/5'
                : 'relative flex h-full w-full max-w-[460px] shrink-0 flex-col bg-white shadow-2xl'
            }
          >
            {body}
          </motion.div>
        </div>
      </div>
    );
  }
  return (
    <div className="fixed inset-0" style={{ zIndex: 4500 }}>
      <motion.div className="absolute inset-0 bg-slate-950/50" style={{ opacity: sheet.backdrop }} onClick={onClose} aria-hidden="true" />
      <motion.div
        {...dialog}
        className="absolute inset-x-0 bottom-0 flex flex-col rounded-t-3xl bg-white shadow-2xl outline-none will-change-transform"
        style={{ y: sheet.y, height: sheet.geometry.sheetHeight }}
      >
        {body}
      </motion.div>
    </div>
  );
};

/**
 * Apartment details: on desktop a right-hand column beside the apartment
 * showcase (the floor plan rising as a 3D model; the dimmed page when there is
 * no plan), on phones a bottom sheet that opens at half height (the building
 * stays in view above it) and grows to full height from its handle. Portalled to <body> at z 4500 — above the explorer (4000), below the
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
