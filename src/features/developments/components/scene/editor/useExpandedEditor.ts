import { useEffect, useState } from 'react';

/**
 * Full-screen editor mode: the editor covers the window (picture as large as
 * the screen allows). Body scroll is locked while open. Esc leaves it — but
 * only when nothing else uses that Esc (no polygon being drawn, no region
 * selected; the editor's own shortcuts handle those first).
 */
export function useExpandedEditor(busy: () => boolean) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!expanded) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented || busy()) return;
      // A dialog (e.g. a confirmation) above the editor owns its own Esc.
      if (document.querySelector('[aria-modal="true"]')) return;
      setExpanded(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [expanded, busy]);

  return { expanded, toggle: () => setExpanded((v) => !v) };
}
