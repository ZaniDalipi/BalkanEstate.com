// The reader's preferences for the mobile thumb rail: which edge it sits on
// and when it shows. Remembered on this device; a stored copy is validated
// field by field when it is read back (see navPrefs.ts).

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { safeLocalStorage } from '@/src/app/store/safeLocalStorage';
import { DEFAULT_NAV_PREFS, isRailSide, isRailVisibility, readNavPrefs, type NavPrefs, type RailSide, type RailVisibility } from './navPrefs';

export type { RailSide, RailVisibility } from './navPrefs';

interface SectionNavPrefs extends NavPrefs {
  setSide: (side: RailSide) => void;
  setVisibility: (visibility: RailVisibility) => void;
}

export const useSectionNavPrefs = create<SectionNavPrefs>()(
  persist(
    (set) => ({
      ...DEFAULT_NAV_PREFS,
      // Guarded as well: a value from outside the union is ignored, not stored.
      setSide: (side) => {
        if (isRailSide(side)) set({ side });
      },
      setVisibility: (visibility) => {
        if (isRailVisibility(visibility)) set({ visibility });
      },
    }),
    {
      name: 'section-nav-prefs',
      storage: createJSONStorage(() => safeLocalStorage),
      partialize: (s): NavPrefs => ({ side: s.side, visibility: s.visibility }),
      merge: (stored, current) => ({ ...current, ...readNavPrefs(stored) }),
    }
  )
);
