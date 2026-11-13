// PropertySectionNav - Bookmark-style quick navigation for the property page
//
// Three responsive presentations of the same section bookmarks:
//   • variant="rail"  → Wide desktop (≥1500px): a Notion-style vertical "dash
//                       rail" fixed in the right gutter. Collapsed it shows
//                       dashes; on hover/focus it expands into a labelled
//                       "On this page" panel.
//   • variant="bar"   → Laptops (lg – 1500px): a horizontal chip bar. Mount
//                       inside the sticky page header.
//   • variant="thumb" → Phones and tablets (< lg): a liquid-glass rail on the
//                       left or right edge; hold it and slide the thumb to a
//                       section (see section-nav/ThumbSectionRail).
// Mount "rail" and "thumb" at the PAGE ROOT — never inside the
// backdrop-blurred header, whose filter would become the containing block
// for a fixed element.
//
// Clicking an item smooth-scrolls to the first *visible* element carrying the
// matching `data-section` attribute. Bookmarks whose target is absent are
// hidden so we never render a dead link.

import React from 'react';
import { useTranslation } from 'react-i18next';
import { SoftIcon } from '@/src/shared/illustrations';
import { useSectionNav } from './section-nav/useSectionNav';
import ThumbSectionRail from './section-nav/ThumbSectionRail';

const ICON_CLASS = 'w-5 h-5 flex-shrink-0';

const PropertySectionNav: React.FC<{ variant: 'bar' | 'rail' | 'thumb' }> = ({ variant }) => {
  const { t } = useTranslation(['property']);
  const { sections, activeKey, overMap, scrollToSection } = useSectionNav();

  // Nothing worth jumping to if only "Overview" is present.
  if (sections.length <= 1) return null;

  const ariaLabel = t('property:sectionNav.ariaLabel', 'Property sections');

  if (variant === 'thumb') {
    return <ThumbSectionRail sections={sections} activeKey={activeKey} overMap={overMap} onSelect={scrollToSection} />;
  }

  // ── Laptops / standard desktops: horizontal chip bar (in the header) ──
  // Shown from lg up to 1500px, where the left app sidebar + right contact
  // sidebar leave no free gutter for a vertical rail. Phones and tablets use
  // the thumb rail instead.
  if (variant === 'bar') {
    return (
      <nav aria-label={ariaLabel} className="hidden lg:block min-[1500px]:hidden border-t border-neutral-100">
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
