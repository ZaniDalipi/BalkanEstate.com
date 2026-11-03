/**
 * The nearest ancestor of `el` that scrolls vertically, or null when the
 * window does. This app scrolls `<main>` (overflow-y: auto), not the window,
 * so scroll-driven animations must listen to that element.
 */
export const findScrollParent = (el: HTMLElement | null): HTMLElement | null => {
  for (let node = el?.parentElement ?? null; node; node = node.parentElement) {
    const overflowY = getComputedStyle(node).overflowY;
    if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight) return node;
  }
  return null;
};
