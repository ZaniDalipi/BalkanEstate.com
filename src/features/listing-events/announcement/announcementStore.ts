import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { safeLocalStorage } from '@/src/app/store/safeLocalStorage';
import type { AnnouncementMemory } from './announcementRules';

interface AnnouncementState extends AnnouncementMemory {
  /** "Not now" for this visit only (not remembered). */
  hiddenThisVisit: boolean;
  /** Start this seller's week (once). */
  markSeen: (now: number) => void;
  /** Never show again. */
  dismiss: () => void;
  /** Close until the app is opened again. */
  hideForVisit: () => void;
}

/**
 * Remembered per browser: when the seller first saw the news and whether they
 * turned it off. If storage is unavailable it is simply forgotten — the worst
 * case is seeing the dialog again, never an error.
 */
export const useEventsAnnouncementStore = create<AnnouncementState>()(
  persist(
    (set) => ({
      firstSeenAt: null,
      dismissed: false,
      hiddenThisVisit: false,
      markSeen: (now) => set((s) => (s.firstSeenAt == null ? { firstSeenAt: now } : s)),
      dismiss: () => set({ dismissed: true, hiddenThisVisit: true }),
      hideForVisit: () => set({ hiddenThisVisit: true }),
    }),
    {
      name: 'balkan-events-announcement',
      version: 1,
      storage: createJSONStorage(() => safeLocalStorage),
      partialize: (s) => ({ firstSeenAt: s.firstSeenAt, dismissed: s.dismissed }),
    },
  ),
);
