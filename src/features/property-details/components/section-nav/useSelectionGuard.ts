// Keeps iOS from selecting the page while the thumb rail is in use.
//
// A long press is how the rail is used, and a long press is also how iOS
// starts text selection: the blue highlight spreads over the page and the
// copy/look-up callout appears. So:
//   • the rail itself cancels the native touch (a non-passive touchstart):
//     no selection, callout or magnifier can start from it, and pointer
//     events, which the gesture runs on, still arrive;
//   • while the rail is pressed or its panel is open, the whole page is
//     unselectable (`html.thumb-rail-no-select`), `selectstart` is refused,
//     and any selection that slipped through is cleared.

import { useEffect } from 'react';
import type React from 'react';

const NO_SELECT_CLASS = 'thumb-rail-no-select';

const clearSelection = () => {
  try {
    window.getSelection()?.removeAllRanges();
  } catch {
    // Nothing selected, or selection not supported: nothing to clear.
  }
};

export function useSelectionGuard(handleRef: React.RefObject<HTMLElement>, active: boolean) {
  // Native touch on the rail: always cancelled (React's touch listeners are passive).
  useEffect(() => {
    const el = handleRef.current;
    if (!el) return undefined;
    const stop = (e: Event) => {
      if (e.cancelable) e.preventDefault();
    };
    el.addEventListener('touchstart', stop, { passive: false });
    el.addEventListener('contextmenu', stop);
    return () => {
      el.removeEventListener('touchstart', stop);
      el.removeEventListener('contextmenu', stop);
    };
  }, [handleRef]);

  // The whole page, while the rail is in use.
  useEffect(() => {
    if (!active) return undefined;
    const root = document.documentElement;
    root.classList.add(NO_SELECT_CLASS);
    clearSelection();
    const refuse = (e: Event) => e.preventDefault();
    document.addEventListener('selectstart', refuse, true);
    document.addEventListener('selectionchange', clearSelection);
    return () => {
      root.classList.remove(NO_SELECT_CLASS);
      document.removeEventListener('selectstart', refuse, true);
      document.removeEventListener('selectionchange', clearSelection);
    };
  }, [active]);
}
