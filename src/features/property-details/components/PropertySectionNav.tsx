// PropertySectionNav - Bookmark-style quick navigation for the property page
//
// Two responsive presentations of the same section bookmarks:
//   • variant="rail" → Desktop (lg+): a Notion-style vertical "dash rail" fixed
//                      in the left gutter (right of the global app sidebar).
//                      Collapsed it shows dashes; on hover/focus it expands into
//                      a labelled "On this page" panel. Mount at the PAGE ROOT —
//                      never inside the backdrop-blurred header, whose filter
//                      would become the containing block for the fixed rail.
//   • variant="bar"  → Mobile/Tablet (< lg): a horizontal, touch-scrollable chip
//                      bar. Mount inside the sticky page header.
//
// Clicking an item smooth-scrolls to the first *visible* element carrying the
// matching `data-section` attribute. Bookmarks whose target is absent are
// hidden so we never render a dead link.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

const ICON_CLASS = 'w-4 h-4 flex-shrink-0';

interface SectionDef {
  /** Matches the data-section attribute on the target element ('top' = page top) */
  key: string;
  labelKey: string;
  fallback: string;
  icon: React.ReactNode;
}

// Static definitions live outside the component so the scroll/active-tracking
// effects keep a stable reference (avoids re-subscribing on every render).
// Order follows the page's vertical flow so active-section tracking is sensible.
const SECTION_DEFS: readonly SectionDef[] = [
  {
    key: 'top',
    labelKey: 'property:sectionNav.overview',
    fallback: 'Overview',
    icon: (
      <svg className={ICON_CLASS} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
      </svg>
    ),
  },
  {
    key: 'details',
    labelKey: 'property:sectionNav.details',
    fallback: 'Details',
    icon: (
      <svg className={ICON_CLASS} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    key: 'availability',
    labelKey: 'property:sectionNav.availability',
    fallback: 'Availability',
    icon: (
      <svg className={ICON_CLASS} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    key: 'map',
    labelKey: 'property:sectionNav.map',
    fallback: '3D Map',
    icon: (
      <svg className={ICON_CLASS} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
    ),
  },
  {
    key: 'neighborhood',
    labelKey: 'property:sectionNav.neighborhood',
    fallback: 'Neighborhood',
    icon: (
      <svg className={ICON_CLASS} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    key: 'calculators',
    labelKey: 'property:sectionNav.calculators',
    fallback: 'Calculators',
    icon: (
      <svg className={ICON_CLASS} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m-6 4h.01M15 11h.01M9 15h.01M15 15h.01M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" />
      </svg>
    ),
  },
  {
    key: 'similar',
    labelKey: 'property:sectionNav.similar',
    fallback: 'Similar Homes',
    icon: (
      <svg className={ICON_CLASS} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
    ),
  },
] as const;

const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Returns the first on-screen-rendered element matching the section key.
 * `PropertyContact` / `PropertyInfo` are rendered twice (mobile + desktop) —
 * only one is laid out, so we pick the element whose `offsetParent` is non-null.
 */
const findTarget = (key: string): HTMLElement | null => {
  if (key === 'top') return null;
  if (typeof document === 'undefined') return null;
  try {
    const sel = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(key) : key;
    const els = Array.from(document.querySelectorAll<HTMLElement>(`[data-section="${sel}"]`));
    return els.find((el) => el.offsetParent !== null) || els[0] || null;
  } catch {
    return null;
  }
};

/**
 * The property page scrolls inside an `overflow-y-auto` container (not the
 * window), so "scroll to top" must target that element. Walk up from a known
 * section to find the nearest scrollable ancestor; fall back to the window.
 */
const getScrollContainer = (): HTMLElement | Window => {
  if (typeof document === 'undefined') return window;
  let el: HTMLElement | null =
    findTarget('details') || document.querySelector<HTMLElement>('[data-section]');
  while (el) {
    const oy = getComputedStyle(el).overflowY;
    if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight) return el;
    el = el.parentElement;
  }
  return window;
};

const PropertySectionNav: React.FC<{ variant: 'bar' | 'rail' }> = ({ variant }) => {
  const { t } = useTranslation(['property']);
  const [activeKey, setActiveKey] = useState<string>('top');
  // Keys whose target section is actually present in the DOM (never a dead link).
  const [availableKeys, setAvailableKeys] = useState<Set<string>>(
    () => new Set(SECTION_DEFS.map((s) => s.key))
  );

  const sections = useMemo(
    () =>
      SECTION_DEFS.filter((s) => availableKeys.has(s.key)).map((s) => ({
        ...s,
        label: t(s.labelKey, s.fallback),
      })),
    [availableKeys, t]
  );

  // Detect which sections exist. Re-checked shortly after mount because some
  // sections (rental terms, lazy widgets) can render a beat later.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const recompute = () => {
      const present = new Set<string>(['top']);
      for (const s of SECTION_DEFS) {
        if (s.key !== 'top' && findTarget(s.key)) present.add(s.key);
      }
      setAvailableKeys((prev) => {
        if (prev.size === present.size && [...present].every((k) => prev.has(k))) return prev;
        return present;
      });
    };
    recompute();
    timer = setTimeout(recompute, 800);
    return () => clearTimeout(timer);
  }, []);

  const scrollToSection = useCallback((key: string) => {
    setActiveKey(key);
    const behavior: ScrollBehavior = prefersReducedMotion() ? 'auto' : 'smooth';
    if (key === 'top') {
      const container = getScrollContainer();
      container.scrollTo({ top: 0, behavior });
      return;
    }
    const target = findTarget(key);
    if (target) target.scrollIntoView({ behavior, block: 'start' });
  }, []);

  // Highlight the chip for whichever section is nearest the top of the viewport.
  // Active is derived from viewport rects (works regardless of which element
  // actually scrolls). Capture-phase listening catches the inner scroll
  // container, since scroll events do not bubble to `window`.
  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        let current = 'top';
        for (const s of SECTION_DEFS) {
          if (s.key === 'top') continue;
          const el = findTarget(s.key);
          if (el && el.getBoundingClientRect().top <= 140) current = s.key;
        }
        setActiveKey(current);
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

  // Nothing worth jumping to if only "Overview" is present.
  if (sections.length <= 1) return null;

  const ariaLabel = t('property:sectionNav.ariaLabel', 'Property sections');

  // ── Mobile + Tablet: horizontal chip bar (lives in the sticky header) ──
  if (variant === 'bar') {
    return (
      <nav aria-label={ariaLabel} className="lg:hidden border-t border-neutral-100">
        <div className="max-w-screen-xl mx-auto px-2 sm:px-4 md:px-6">
          <ul className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-2">
            {sections.map((s) => {
              const isActive = activeKey === s.key;
              return (
                <li key={s.key} className="flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => scrollToSection(s.key)}
                    aria-current={isActive ? 'true' : undefined}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap border min-h-[38px] backdrop-blur-sm transition-all duration-200 active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100 ${
                      isActive
                        ? 'bg-primary text-white border-primary/60 shadow-md shadow-primary/25'
                        : 'bg-white/55 text-neutral-600 border-white/60 shadow-sm hover:bg-primary-light/70 hover:text-primary hover:border-primary/30'
                    }`}
                  >
                    {s.icon}
                    <span>{s.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>
    );
  }

  // ── Desktop: Notion-style vertical dash rail (fixed in the right gutter) ──
  return (
    <nav
      aria-label={ariaLabel}
      className="hidden lg:block fixed z-40 group print:hidden"
      // Hug the content's right edge on wide screens; keep a small margin from
      // the viewport edge on narrower screens. (Content is centred inside the
      // 80px-offset region, so its right edge sits ~`50vw - 42.5rem` from the
      // viewport's right edge.)
      style={{ right: 'max(0.75rem, calc(50vw - 42.5rem))', top: '50%', transform: 'translateY(-50%)' }}
    >
      <div className="glass-rail rounded-2xl p-1.5 transition-all duration-300 ease-out motion-reduce:transition-none">
        {/* "On this page" heading — revealed with the panel */}
        <div className="overflow-hidden max-h-0 opacity-0 group-hover:max-h-10 group-hover:opacity-100 group-focus-within:max-h-10 group-focus-within:opacity-100 transition-all duration-300 motion-reduce:transition-none">
          <p className="px-2.5 pt-1.5 pb-1 text-[11px] font-bold uppercase tracking-wider text-neutral-400 whitespace-nowrap text-right">
            {t('property:sectionNav.onThisPage', 'On this page')}
          </p>
        </div>

        <ul className="flex flex-col gap-0.5">
          {sections.map((s) => {
            const isActive = activeKey === s.key;
            return (
              <li key={s.key}>
                <button
                  type="button"
                  onClick={() => scrollToSection(s.key)}
                  aria-current={isActive ? 'true' : undefined}
                  aria-label={s.label}
                  title={s.label}
                  // flex-row-reverse keeps the dash flush to the right (gutter
                  // side) while the label expands leftward into the page.
                  className="group/item flex flex-row-reverse items-center gap-2.5 w-full rounded-lg px-1.5 py-1.5 group-hover:px-2.5 hover:bg-primary-light/60 transition-colors motion-reduce:transition-none"
                >
                  {/* Dash indicator (collapsed view) */}
                  <span
                    aria-hidden="true"
                    className={`h-[3px] rounded-full transition-all duration-300 flex-shrink-0 motion-reduce:transition-none ${
                      isActive
                        ? 'w-6 bg-primary'
                        : 'w-4 bg-neutral-300 group-hover:bg-neutral-400 group-hover/item:bg-primary/60'
                    }`}
                  />
                  {/* Label (revealed on hover / keyboard focus) */}
                  <span
                    className={`flex items-center gap-2 overflow-hidden whitespace-nowrap text-sm font-semibold max-w-0 opacity-0 group-hover:max-w-[200px] group-hover:opacity-100 group-focus-within:max-w-[200px] group-focus-within:opacity-100 transition-all duration-300 motion-reduce:transition-none ${
                      isActive ? 'text-primary' : 'text-neutral-600 group-hover/item:text-primary'
                    }`}
                  >
                    <span className={isActive ? 'text-primary' : 'text-neutral-400'}>{s.icon}</span>
                    {s.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
};

export default PropertySectionNav;
