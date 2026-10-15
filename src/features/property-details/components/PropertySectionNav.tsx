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
import { SoftIcon, type SoftIconName } from '@/src/shared/illustrations';

const ICON_CLASS = 'w-5 h-5 flex-shrink-0';

interface SectionDef {
  /** Matches the data-section attribute on the target element ('top' = page top) */
  key: string;
  labelKey: string;
  fallback: string;
  icon: SoftIconName;
}

// Static definitions live outside the component so the scroll/active-tracking
// effects keep a stable reference (avoids re-subscribing on every render).
// Order follows the page's vertical flow so active-section tracking is sensible.
const SECTION_DEFS: readonly SectionDef[] = [
  {
    key: 'top',
    labelKey: 'property:sectionNav.overview',
    fallback: 'Overview',
    icon: 'info',
  },
  {
    key: 'details',
    labelKey: 'property:sectionNav.details',
    fallback: 'Details',
    icon: 'clipboard',
  },
  {
    key: 'neighborhood',
    labelKey: 'property:sectionNav.neighborhood',
    fallback: 'Neighborhood',
    icon: 'houses',
  },
  {
    key: 'availability',
    labelKey: 'property:sectionNav.availability',
    fallback: 'Availability',
    icon: 'calendar',
  },
  {
    key: 'map',
    labelKey: 'property:sectionNav.map',
    fallback: '3D Map',
    icon: 'mapGrid',
  },
  {
    key: 'calculators',
    labelKey: 'property:sectionNav.calculators',
    fallback: 'Calculators',
    icon: 'calculator',
  },
  {
    key: 'price-history',
    labelKey: 'property:sectionNav.priceHistory',
    fallback: 'Price History',
    icon: 'chart',
  },
  {
    key: 'area-prices',
    labelKey: 'property:sectionNav.areaPrices',
    fallback: 'Area Prices',
    icon: 'pin',
  },
  {
    key: 'similar',
    labelKey: 'property:sectionNav.similar',
    fallback: 'Similar Homes',
    icon: 'home',
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
  // The rail floats over the page; get out of the way while the 3D map fills
  // the viewport so it never covers the map's own controls or its shadows.
  const [overMap, setOverMap] = useState(false);
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

  // Nothing worth jumping to if only "Overview" is present.
  if (sections.length <= 1) return null;

  const ariaLabel = t('property:sectionNav.ariaLabel', 'Property sections');

  // ── Mobile / Tablet / standard laptops: horizontal chip bar (in the header) ──
  // Shown below 1500px, where the left app sidebar + right contact sidebar leave
  // no free gutter for a vertical rail (it would overlap the calculators).
  if (variant === 'bar') {
    return (
      <nav aria-label={ariaLabel} className="min-[1500px]:hidden border-t border-neutral-100">
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
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-bold whitespace-nowrap border-2 min-h-[40px] transition-all duration-200 active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100 ${
                      isActive
                        ? 'bg-primary text-white border-primary shadow-md shadow-primary/30'
                        : 'bg-white text-neutral-700 border-neutral-200 shadow-sm hover:bg-primary-light hover:text-primary-dark hover:border-primary/40'
                    }`}
                  >
                    <SoftIcon name={s.icon} className={ICON_CLASS} />
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

  // ── Wide desktop (≥1500px): Notion-style vertical dash rail in the right
  // gutter. Only shown when the viewport is wide enough that the content +
  // sidebars leave a free right margin, so it never covers the calculators. ──
  return (
    <nav
      aria-label={ariaLabel}
      aria-hidden={overMap || undefined}
      className={`hidden min-[1500px]:block fixed z-40 group print:hidden transition-[opacity,visibility] duration-300 motion-reduce:transition-none ${
        overMap ? 'opacity-0 invisible pointer-events-none' : 'opacity-100 visible'
      }`}
      // Sit in the far-right gutter, close to the viewport edge (the left side
      // is occupied by the global app sidebar). Hugs further right as the
      // viewport widens, clamped to a small margin on narrower screens.
      style={{ right: 'max(0.5rem, calc(50vw - 50rem))', top: '50%', transform: 'translateY(-50%)' }}
    >
      <div className="glass-rail rounded-2xl p-1.5 transition-all duration-300 ease-out motion-reduce:transition-none">
        {/* "On this page" heading — revealed with the panel */}
        <div className="overflow-hidden max-h-0 opacity-0 group-hover:max-h-10 group-hover:opacity-100 group-focus-within:max-h-10 group-focus-within:opacity-100 transition-all duration-300 motion-reduce:transition-none">
          <p className="px-2.5 pt-1.5 pb-1 text-[11px] font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap text-right">
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
                  className={`group/item flex flex-row-reverse items-center gap-2.5 w-full rounded-lg px-1.5 py-1.5 group-hover:px-2.5 transition-colors motion-reduce:transition-none ${
                    isActive ? 'bg-primary-light/70' : 'hover:bg-primary-light/50'
                  }`}
                >
                  {/* Dash indicator (collapsed view) */}
                  <span
                    aria-hidden="true"
                    className={`rounded-full transition-all duration-300 flex-shrink-0 motion-reduce:transition-none ${
                      isActive
                        ? 'h-[4px] w-7 bg-primary shadow-sm shadow-primary/40'
                        : 'h-[3px] w-4 bg-neutral-400 group-hover:bg-neutral-500 group-hover/item:bg-primary'
                    }`}
                  />
                  {/* Label (revealed on hover / keyboard focus) */}
                  <span
                    className={`flex items-center gap-2 overflow-hidden whitespace-nowrap text-sm font-bold max-w-0 opacity-0 group-hover:max-w-[200px] group-hover:opacity-100 group-focus-within:max-w-[200px] group-focus-within:opacity-100 transition-all duration-300 motion-reduce:transition-none ${
                      isActive ? 'text-primary-dark' : 'text-neutral-800 group-hover/item:text-primary'
                    }`}
                  >
                    <SoftIcon name={s.icon} className={ICON_CLASS} />
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
