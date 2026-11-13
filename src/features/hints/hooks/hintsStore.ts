import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { safeLocalStorage } from '@/src/app/store/safeLocalStorage';

interface HintsState {
  /** Tips may show up on their own (the panel always works). */
  enabled: boolean;
  /** Ids of tips already shown on their own. */
  seen: string[];
  /** When the last tip showed up on its own (ms). */
  lastShownAt: number | null;

  // Not remembered
  /** Tips shown on their own during this visit. */
  shownThisVisit: number;
  /** The tip on screen now. */
  currentId: string | null;
  panelOpen: boolean;

  show: (id: string, now: number) => void;
  hide: () => void;
  setEnabled: (enabled: boolean) => void;
  openPanel: () => void;
  closePanel: () => void;
}

export const useHintsStore = create<HintsState>()(
  persist(
    (set) => ({
      enabled: true,
      seen: [],
      lastShownAt: null,
      shownThisVisit: 0,
      currentId: null,
      panelOpen: false,

      show: (id, now) =>
        set((s) => ({
          currentId: id,
          seen: s.seen.includes(id) ? s.seen : [...s.seen, id],
          lastShownAt: now,
          shownThisVisit: s.shownThisVisit + 1,
        })),
      hide: () => set({ currentId: null }),
      setEnabled: (enabled) => set(enabled ? { enabled } : { enabled, currentId: null }),
      openPanel: () => set({ panelOpen: true, currentId: null }),
      closePanel: () => set({ panelOpen: false }),
    }),
    {
      name: 'balkan-hints',
      version: 1,
      storage: createJSONStorage(() => safeLocalStorage),
      partialize: (s) => ({ enabled: s.enabled, seen: s.seen, lastShownAt: s.lastShownAt }),
    },
  ),
);
