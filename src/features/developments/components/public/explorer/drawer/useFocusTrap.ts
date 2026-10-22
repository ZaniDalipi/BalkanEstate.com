import { useEffect, useRef } from 'react';
import type React from 'react';

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Keep keyboard focus inside `ref` while mounted: focus moves in on open,
 * Tab / Shift+Tab wrap, and focus returns to the opener on close. `suspended`
 * hands focus over to a dialog stacked above (an inquiry modal, the gallery).
 */
export function useFocusTrap(ref: React.RefObject<HTMLElement>, suspended = false) {
  const opener = useRef<Element | null>(null);

  useEffect(() => {
    opener.current = document.activeElement;
    const el = ref.current;
    const first = el?.querySelector<HTMLElement>('[data-autofocus]') ?? el;
    first?.focus({ preventScroll: true });
    return () => {
      const o = opener.current as HTMLElement | null;
      if (o && document.contains(o) && typeof o.focus === 'function') o.focus({ preventScroll: true });
    };
  }, [ref]);

  /** Attach to the trapped element's onKeyDown. */
  return (e: React.KeyboardEvent) => {
    if (suspended || e.key !== 'Tab' || !ref.current) return;
    const items = Array.from(ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (n) => !n.hasAttribute('disabled') && n.getAttribute('aria-hidden') !== 'true'
    );
    if (items.length === 0) {
      e.preventDefault();
      return;
    }
    const firstItem = items[0];
    const lastItem = items[items.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === firstItem || active === ref.current)) {
      e.preventDefault();
      lastItem.focus();
    } else if (!e.shiftKey && active === lastItem) {
      e.preventDefault();
      firstItem.focus();
    }
  };
}
