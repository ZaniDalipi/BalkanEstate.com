// The reader's preferences for the mobile thumb rail: which edge it sits on
// and when it shows. Remembered on this device.

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { safeLocalStorage } from '@/src/app/store/safeLocalStorage';

export type RailSide = 'left' | 'right';
/** always: a thin rail stays on the edge · scroll: it steps aside while scrolling · hidden: only a small tab. */
export type RailVisibility = 'always' | 'scroll' | 'hidden';

interface SectionNavPrefs {
  side: RailSide;
  visibility: RailVisibility;
  setSide: (side: RailSide) => void;
  setVisibility: (visibility: RailVisibility) => void;
}

export const useSectionNavPrefs = create<SectionNavPrefs>()(
  persist(
    (set) => ({
      side: 'right',
      visibility: 'always',
      setSide: (side) => set({ side }),
      setVisibility: (visibility) => set({ visibility }),
    }),
    {
      name: 'section-nav-prefs',
      storage: createJSONStorage(() => safeLocalStorage),
      partialize: (s) => ({ side: s.side, visibility: s.visibility }),
    }
  )
);
