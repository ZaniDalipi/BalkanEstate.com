// PropertySectionNav - Bookmark-style quick navigation for the property page
// Renders a sticky row of chips ("bookmarks") that scroll to key sections
// (Overview, 3D Map, Availability, Calculators) when clicked.

import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface SectionBookmark {
  /** Matches the data-section attribute on the target element (or 'top' for the page top) */
  key: string;
  label: string;
  icon: React.ReactNode;
}

const ICON_CLASS = 'w-4 h-4 flex-shrink-0';

/**
 * Sticky "bookmark" bar with one chip per key section of the property page.
 * Clicking a chip smooth-scrolls to the first visible element carrying the
 * matching `data-section` attribute.
 */
const PropertySectionNav: React.FC = () => {
  const { t } = useTranslation(['property']);
  const [activeKey, setActiveKey] = useState<string>('top');

  const bookmarks: SectionBookmark[] = [
    {
      key: 'top',
      label: t('property:sectionNav.overview', 'Overview'),
      icon: (
        <svg className={ICON_CLASS} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
        </svg>
      ),
    },
    {
      key: 'map',
      label: t('property:sectionNav.map', '3D Map'),
      icon: (
        <svg className={ICON_CLASS} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      ),
    },
    {
      key: 'availability',
      label: t('property:sectionNav.availability', 'Availability'),
      icon: (
        <svg className={ICON_CLASS} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      key: 'calculators',
      label: t('property:sectionNav.calculators', 'Calculators'),
      icon: (
        <svg className={ICON_CLASS} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m-6 4h.01M15 11h.01M9 15h.01M15 15h.01M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" />
        </svg>
      ),
    },
  ];

  // Returns the first on-screen-rendered element matching the section key.
  // PropertyContact is rendered twice (mobile + desktop); only one is visible,
  // so we pick the element that is actually laid out (offsetParent !== null).
  const findTarget = useCallback((key: string): HTMLElement | null => {
    if (key === 'top') return null;
    const els = Array.from(
      document.querySelectorAll<HTMLElement>(`[data-section="${key}"]`)
    );
    return els.find((el) => el.offsetParent !== null) || els[0] || null;
  }, []);

  const handleClick = useCallback(
    (key: string) => {
      setActiveKey(key);
      if (key === 'top') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      const target = findTarget(key);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    },
    [findTarget]
  );

  // Highlight the chip whose section is currently nearest the top of the viewport.
  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        if (window.scrollY < 200) {
          setActiveKey('top');
          return;
        }
        let current = 'top';
        for (const bm of bookmarks) {
          if (bm.key === 'top') continue;
          const el = findTarget(bm.key);
          if (el && el.getBoundingClientRect().top <= 140) {
            current = bm.key;
          }
        }
        setActiveKey(current);
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [findTarget]);

  return (
    <nav
      aria-label={t('property:sectionNav.ariaLabel', 'Property sections')}
      className="border-t border-neutral-100"
    >
      <div className="max-w-screen-xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8">
        <ul className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-2">
          {bookmarks.map((bm) => {
            const isActive = activeKey === bm.key;
            return (
              <li key={bm.key} className="flex-shrink-0">
                <button
                  type="button"
                  onClick={() => handleClick(bm.key)}
                  aria-current={isActive ? 'true' : undefined}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-200 border ${
                    isActive
                      ? 'bg-primary text-white border-primary shadow-sm'
                      : 'bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-primary-light hover:text-primary hover:border-primary/30'
                  }`}
                >
                  {bm.icon}
                  <span>{bm.label}</span>
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
