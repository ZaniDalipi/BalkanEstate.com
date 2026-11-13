const LAYERS = '[role="dialog"], [role="alertdialog"], [aria-modal="true"]';

/**
 * Something else is asking for attention (a cookie banner, a modal, a sheet).
 * A tip then waits: on top of another dialog it is noise, and under one it is
 * never read.
 */
export function otherLayerOpen(root: ParentNode = document): boolean {
  return Array.from(root.querySelectorAll<HTMLElement>(LAYERS)).some(
    (el) => !el.closest('[data-hints-ui]') && el.getClientRects().length > 0,
  );
}
