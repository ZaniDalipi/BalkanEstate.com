import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { navigate } from '@/src/app/router/navigation';
import { paths } from '@/src/app/router/paths';
import { useEscapeLayer } from '@/src/features/developments/components/public/explorer/useEscapeLayer';
import EventIcon from '../components/EventIcon';
import { daysLeft, type ListingOwner } from './announcementRules';
import { useEventsAnnouncementStore } from './announcementStore';
import { useAnnouncementOpen } from './useAnnouncementOpen';

const BTN = 'min-h-[44px] rounded-xl px-4 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2';

/**
 * When a seller opens the app, during their first week: open houses and
 * auctions are new. "Not now", × and Esc close it until the next visit;
 * "Add one to a listing" and "Don't show this again" turn it off.
 */
const EventsAnnouncementDialog: React.FC<{ user: ListingOwner | null | undefined }> = ({ user }) => {
  const { t } = useTranslation('property');
  const reduceMotion = useReducedMotion();
  const open = useAnnouncementOpen(user);
  const { firstSeenAt, dismiss, hideForVisit } = useEventsAnnouncementStore();
  const titleId = useId();
  const bodyId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);

  useEscapeLayer(panelRef, hideForVisit, open);

  // Focus the main action on open; give focus back to where it was on close.
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement as HTMLElement | null;
    primaryRef.current?.focus();
    return () => previous?.focus?.();
  }, [open]);

  const goToListings = () => {
    dismiss();
    navigate(paths.account('listings'), { direction: 'forward' });
  };

  if (typeof document === 'undefined') return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[9000] flex items-end justify-center bg-black/50 p-4 sm:items-center"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={hideForVisit}
        >
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={bodyId}
            className="dialog-fit relative w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
            style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
            initial={reduceMotion ? false : { y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { y: 24, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={hideForVisit}
              aria-label={t('listingEvents.announce.close', { defaultValue: 'Close this message' })}
              className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
            <div className="mb-3 flex gap-2" aria-hidden="true">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><EventIcon kind="openHouse" className="h-6 w-6" /></span>
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-50 text-amber-600"><EventIcon kind="auction" className="h-6 w-6" /></span>
            </div>
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
              {t('listingEvents.announce.badge', { defaultValue: 'New for your listings' })}
            </p>
            <h2 id={titleId} className="mt-1 pr-8 text-lg font-bold text-neutral-900">
              {t('listingEvents.announce.title', { defaultValue: 'You can now host open houses and announce auctions' })}
            </h2>
            <p id={bodyId} className="mt-2 text-sm text-neutral-700">
              {t('listingEvents.announce.body', { defaultValue: 'Pick a date when buyers can drop by, or the date your home goes to auction. It shows on your listing, in search and on the map, and people who saved your home are told. Both are optional.' })}
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <button ref={primaryRef} type="button" onClick={goToListings} className={`${BTN} bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-500`}>
                {t('listingEvents.announce.cta', { defaultValue: 'Add one to a listing' })}
              </button>
              <button type="button" onClick={hideForVisit} className={`${BTN} border border-neutral-300 text-neutral-800 hover:bg-neutral-50 focus-visible:ring-neutral-400`}>
                {t('listingEvents.announce.later', { defaultValue: 'Not now' })}
              </button>
              <button type="button" onClick={dismiss} className={`${BTN} text-neutral-500 hover:bg-neutral-50 focus-visible:ring-neutral-400`}>
                {t('listingEvents.announce.never', { defaultValue: "Don't show this again" })}
              </button>
            </div>
            <p className="mt-3 text-center text-xs text-neutral-500">
              {t('listingEvents.announce.daysLeft', { count: daysLeft(firstSeenAt, Date.now()), defaultValue: 'Days left: {{count}}' })}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export default EventsAnnouncementDialog;
