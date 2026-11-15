import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { safeLocalStorage } from '@/src/app/store/safeLocalStorage';
import type { AnnouncementMemory } from './announcementRules';

interface AnnouncementState extends AnnouncementMemory {
  /** Start this seller's week (once). */
  markSeen: (now: number) => void;
  dismiss: () => void;
}

/**
 * Remembered per browser: when the seller first saw the news and whether they
 * closed it. If storage is unavailable it is simply forgotten — the worst case
 * is seeing the card again, never an error.
 */
export const useEventsAnnouncementStore = create<AnnouncementState>()(
  persist(
    (set) => ({
      firstSeenAt: null,
      dismissed: false,
      markSeen: (now) => set((s) => (s.firstSeenAt == null ? { firstSeenAt: now } : s)),
      dismiss: () => set({ dismissed: true }),
    }),
    {
      name: 'balkan-events-announcement',
      version: 1,
      storage: createJSONStorage(() => safeLocalStorage),
      partialize: (s) => ({ firstSeenAt: s.firstSeenAt, dismissed: s.dismissed }),
    },
  ),
);
