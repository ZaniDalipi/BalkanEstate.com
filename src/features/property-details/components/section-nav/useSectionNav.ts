// Which sections the property page has, which one is being read, and how to
// jump to one. Every presentation of the "On this page" menu renders from this.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { naturalTop, orderByPosition, pickActiveSection, pinnedContainer } from '../sectionPositions';
import { SECTION_DEFS, findTarget, getScrollContainer, prefersReducedMotion, type NavSection, type SectionDef } from './sectionDefs';

/** Page changes are measured at most this often (maps change the page on every pan). */
const MUTATION_BATCH_MS = 250;

/** A section becomes current once its top passes this far below the viewport top (under the header). */
const ACTIVE_LINE_PX = 140;

export interface SectionNavState {
  /** Sections present on the page (never a dead link), top to bottom; 'top' first. */
  sections: NavSection[];
  activeKey: string;
  /** The 3D map fills the middle of the screen: floating menus step aside. */
  overMap: boolean;
  scrollToSection: (key: string) => void;
}

export function useSectionNav(): SectionNavState {
  const { t } = useTranslation(['property']);
  const [activeKey, setActiveKey] = useState<string>('top');
  const [overMap, setOverMap] = useState(false);
  const [order, setOrder] = useState<string[]>(() => SECTION_DEFS.map((s) => s.key));
  // Sections inside a sticky container (the desktop sidebar): always on
  // screen, so they never count as the one being read.
  const pinnedRef = useRef<Map<string, boolean>>(new Map());

  const sections = useMemo(
    () =>
      order
        .map((key) => SECTION_DEFS.find((s) => s.key === key))
        .filter((s): s is SectionDef => !!s)
        .map((s) => ({ ...s, label: t(s.labelKey, s.fallback) })),
    [order, t]
  );

  // Detect which sections exist. Re-checked shortly after mount and whenever
  // the page's content changes, because some sections (rental terms, lazy
  // widgets, cards waiting for data) render later.
  useEffect(() => {
    const recompute = () => {
      const measured: Array<{ key: string; naturalTop: number }> = [];
      const pinned = new Map<string, boolean>();
      for (const s of SECTION_DEFS) {
        if (s.key === 'top') continue;
        const el = findTarget(s.key);
        if (!el) continue;
        const container = pinnedContainer(el);
        pinned.set(s.key, container !== null);
        measured.push({ key: s.key, naturalTop: naturalTop(el, container) });
      }
      pinnedRef.current = pinned;
      const next = ['top', ...orderByPosition(measured)];
      setOrder((prev) => (prev.length === next.length && prev.every((k, i) => k === next[i]) ? prev : next));
    };
    recompute();
    const timer = setTimeout(recompute, 800);
    // Maps change the page on every pan, so checks are batched: at most one
    // per MUTATION_BATCH_MS.
    let batch: ReturnType<typeof setTimeout> | undefined;
    const observer = typeof MutationObserver === 'function'
      ? new MutationObserver(() => {
          if (batch) return;
          batch = setTimeout(() => {
            batch = undefined;
            recompute();
          }, MUTATION_BATCH_MS);
        })
      : null;
    observer?.observe(document.body, { childList: true, subtree: true });
    // Crossing a breakpoint changes the layout (the sidebar is sticky on
    // desktop only), so measure again.
    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(recompute, 150);
    };
    window.addEventListener('resize', onResize, { passive: true });
    return () => {
      clearTimeout(timer);
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', onResize);
      observer?.disconnect();
      clearTimeout(batch);
    };
  }, []);

  const scrollToSection = useCallback((key: string) => {
    setActiveKey(key);
    const behavior: ScrollBehavior = prefersReducedMotion() ? 'auto' : 'smooth';
    if (key === 'top') {
      getScrollContainer().scrollTo({ top: 0, behavior });
      return;
    }
    findTarget(key)?.scrollIntoView({ behavior, block: 'start' });
  }, []);

  // Track the section nearest the top of the viewport. Capture-phase
  // listening catches the inner scroll container, since scroll events do not
  // bubble to `window`.
  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const positions = [];
        for (const s of SECTION_DEFS) {
          if (s.key === 'top') continue;
          const el = findTarget(s.key);
          if (el) positions.push({ key: s.key, top: el.getBoundingClientRect().top, pinned: pinnedRef.current.get(s.key) ?? false });
        }
        const container = getScrollContainer();
        const atBottom = container instanceof Window
          ? window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2
          : container.scrollTop + container.clientHeight >= container.scrollHeight - 2;
        setActiveKey(pickActiveSection(positions, ACTIVE_LINE_PX, 'top', atBottom ? { viewportHeight: window.innerHeight } : undefined));
        const mapEl = findTarget('map');
        if (mapEl) {
          const rect = mapEl.getBoundingClientRect();
          const mid = window.innerHeight / 2;
          setOverMap(rect.top < mid && rect.bottom > mid);
        } else {
          setOverMap(false);
        }
      });
    };
    onScroll();
    document.addEventListener('scroll', onScroll, { passive: true, capture: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      document.removeEventListener('scroll', onScroll, { capture: true } as EventListenerOptions);
      window.removeEventListener('resize', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return { sections, activeKey, overMap, scrollToSection };
}
