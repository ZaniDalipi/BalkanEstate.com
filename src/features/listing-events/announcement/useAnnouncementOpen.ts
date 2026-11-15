import { useEffect, useRef, useState } from 'react';
import { otherLayerOpen } from '@/src/features/hints/utils/otherLayerOpen';
import { shouldShowAnnouncement, type ListingOwner } from './announcementRules';
import { useEventsAnnouncementStore } from './announcementStore';

/** Let the app settle (splash, first paint) before asking for attention. */
const OPEN_DELAY_MS = 1500;
/** While another dialog is up, look again this often. */
const RETRY_MS = 2000;

/**
 * Whether the announcement dialog is open now. It opens once per visit, a
 * moment after the app loads, and never on top of another dialog (sign-in,
 * cookie banner): it waits until that one is gone.
 */
export function useAnnouncementOpen(user: ListingOwner | null | undefined): boolean {
  const { firstSeenAt, dismissed, hiddenThisVisit, markSeen } = useEventsAnnouncementStore();
  const eligible = !hiddenThisVisit && shouldShowAnnouncement(user, { firstSeenAt, dismissed }, Date.now());
  const [open, setOpen] = useState(false);
  const markSeenRef = useRef(markSeen);
  markSeenRef.current = markSeen;

  useEffect(() => {
    if (!eligible) {
      setOpen(false);
      return undefined;
    }
    let timer: number | undefined;
    const tryOpen = () => {
      if (otherLayerOpen()) {
        timer = window.setTimeout(tryOpen, RETRY_MS);
        return;
      }
      markSeenRef.current(Date.now()); // the seller's week starts when they first see it
      setOpen(true);
    };
    timer = window.setTimeout(tryOpen, OPEN_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [eligible]);

  return open && eligible;
}
