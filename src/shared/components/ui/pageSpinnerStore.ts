import { useEffect, useSyncExternalStore } from 'react';

/**
 * How many full-page loaders are on screen.
 *
 * A page that has nothing to show yet (a listing opened from a shared link)
 * fills its area with the big circle. The small navigation circle at the top
 * then has nothing to add, and two spinners at once look broken, so it steps
 * aside while this count is above zero.
 */
let count = 0;
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Count a full-page loader as visible while `active` is true. */
export function usePageSpinner(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    count += 1;
    emit();
    return () => {
      count -= 1;
      emit();
    };
  }, [active]);
}

/** Whether any full-page loader is on screen. */
export function usePageSpinnerVisible(): boolean {
  return useSyncExternalStore(subscribe, () => count > 0, () => false);
}
