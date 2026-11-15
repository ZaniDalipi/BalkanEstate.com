import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { navigate } from '@/src/app/router/navigation';
import { paths } from '@/src/app/router/paths';
import EventIcon from '../components/EventIcon';
import { daysLeft, shouldShowAnnouncement, type ListingOwner } from './announcementRules';
import { useEventsAnnouncementStore } from './announcementStore';

interface EventsAnnouncementCardProps {
  user: ListingOwner | null | undefined;
}

/**
 * Home screen, for sellers, for one week: open houses and auctions are new,
 * and here is where to add them. Closable; renders nothing for everyone else.
 */
const EventsAnnouncementCard: React.FC<EventsAnnouncementCardProps> = ({ user }) => {
  const { t } = useTranslation('property');
  const reduceMotion = useReducedMotion();
  const { firstSeenAt, dismissed, markSeen, dismiss } = useEventsAnnouncementStore();
  const now = Date.now();
  const show = shouldShowAnnouncement(user, { firstSeenAt, dismissed }, now);

  // The week starts the first time it is actually on screen.
  useEffect(() => {
    if (show) markSeen(Date.now());
  }, [show, markSeen]);

  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.section
          aria-labelledby="events-announcement-title"
          className="mx-auto mt-6 w-full max-w-7xl px-4"
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
        >
          <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-amber-50 p-5 pr-14 shadow-sm sm:p-6 sm:pr-16">
            <button
              type="button"
              onClick={dismiss}
              aria-label={t('listingEvents.announce.close', { defaultValue: 'Close this message' })}
              className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full text-neutral-500 hover:bg-white hover:text-neutral-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
              {t('listingEvents.announce.badge', { defaultValue: 'New for your listings' })}
            </p>
            <h2 id="events-announcement-title" className="mt-1 flex flex-wrap items-center gap-2 text-lg font-bold text-neutral-900 sm:text-xl">
              <EventIcon kind="openHouse" className="h-5 w-5 text-emerald-600" />
              <EventIcon kind="auction" className="h-5 w-5 text-amber-600" />
              {t('listingEvents.announce.title', { defaultValue: 'You can now host open houses and announce auctions' })}
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-neutral-700">
              {t('listingEvents.announce.body', { defaultValue: 'Pick a date when buyers can drop by, or the date your home goes to auction. It shows on your listing, in search and on the map, and people who saved your home are told. Both are optional.' })}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => navigate(paths.account('listings'), { direction: 'forward' })}
                className="min-h-[44px] rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
              >
                {t('listingEvents.announce.cta', { defaultValue: 'Add one to a listing' })}
              </button>
              <button
                type="button"
                onClick={dismiss}
                className="min-h-[44px] rounded-xl px-4 text-sm font-semibold text-neutral-700 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
              >
                {t('listingEvents.announce.later', { defaultValue: 'Not now' })}
              </button>
              <span className="text-xs text-neutral-500">
                {t('listingEvents.announce.daysLeft', { count: daysLeft(firstSeenAt, now), defaultValue: 'Days left: {{count}}' })}
              </span>
            </div>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
};

export default EventsAnnouncementCard;
