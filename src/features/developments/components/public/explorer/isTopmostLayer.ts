/**
 * Layer stacking for Esc handling. The explorer stage (pseudo full screen,
 * z 4000) and the unit drawer (z 4500) each close on Esc — but only when no
 * other dialog sits above them: a platform modal opened from the drawer
 * (inquiry, viewing, gallery, floor plan; portalled, role="dialog" /
 * aria-modal, z ≥ 5000) owns that Esc.
 */
const LAYER_SELECTOR = '[aria-modal="true"],[role="dialog"],[role="alertdialog"]';

const zOf = (n: Element): number => {
  const z = Number.parseInt(window.getComputedStyle(n).zIndex, 10);
  return Number.isFinite(z) ? z : 0;
};

/** Highest z-index on the element's ancestor chain (the stacking order it paints in). */
const stackZ = (el: Element): number => {
  let max = 0;
  for (let n: Element | null = el; n && n !== document.body; n = n.parentElement) max = Math.max(max, zOf(n));
  return max;
};

const isShown = (el: HTMLElement): boolean => {
  if (el.closest('[hidden],[inert],[aria-hidden="true"]')) return false;
  const cs = window.getComputedStyle(el);
  return cs.display !== 'none' && cs.visibility !== 'hidden';
};

/**
 * True when no other visible dialog is layered above `el`: one that is not
 * inside it (nor contains it) and either has a higher stacking z-index or the
 * same z-index and comes later in DOM order. A missing element counts as top.
 */
export function isTopmostLayer(el: HTMLElement | null): boolean {
  if (!el || typeof document === 'undefined') return true;
  const myZ = stackZ(el);
  for (const other of Array.from(document.querySelectorAll<HTMLElement>(LAYER_SELECTOR))) {
    if (other === el || el.contains(other) || other.contains(el) || !isShown(other)) continue;
    const z = stackZ(other);
    if (z > myZ) return false;
    if (z === myZ && el.compareDocumentPosition(other) & Node.DOCUMENT_POSITION_FOLLOWING) return false;
  }
  return true;
}
