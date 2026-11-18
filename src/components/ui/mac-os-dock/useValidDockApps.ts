import { useMemo } from 'react';
import { validateDockApp } from '@/shared/utils/validation';
import type { DockApp } from './types';

/** The items that pass validation, first of each id kept; the rest are dropped with a dev warning. */
export function useValidDockApps(apps: DockApp[]): DockApp[] {
  return useMemo(() => {
    const seen = new Set<string>();
    return apps.filter((app) => {
      const result = validateDockApp(app);
      const duplicate = result.isValid && seen.has(app.id);
      if (!result.isValid || duplicate) {
        if (import.meta.env?.DEV) console.warn('[MacOSDock] item skipped:', result.error ?? `duplicate id "${app.id}"`);
        return false;
      }
      seen.add(app.id);
      return true;
    });
  }, [apps]);
}
