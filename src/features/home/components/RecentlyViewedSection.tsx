import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Property } from '@/types';
import { useRecentlyViewed } from '@/src/hooks/useRecentlyViewed';
import PropertyCard from '@/src/features/property-details/components/PropertyCard';

interface Props {
  onPropertyClick: (property: Property) => void;
}

const RecentlyViewedSection: React.FC<Props> = ({ onPropertyClick }) => {
  const { t } = useTranslation(['home']);
  const { recentlyViewed } = useRecentlyViewed();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollButtons = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollButtons();
    el.addEventListener('scroll', updateScrollButtons, { passive: true });
    window.addEventListener('resize', updateScrollButtons);
    return () => {
      el.removeEventListener('scroll', updateScrollButtons);
      window.removeEventListener('resize', updateScrollButtons);
    };
  }, [updateScrollButtons, recentlyViewed.length]);

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.querySelector('.rv-card')?.clientWidth || 320;
    el.scrollBy({ left: dir === 'left' ? -cardWidth - 16 : cardWidth + 16, behavior: 'smooth' });
  };

  // Don't render if nothing has been viewed yet
  if (recentlyViewed.length === 0) return null;

  return (
    <section className="py-10 sm:py-14 bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header — the rail below carries its own top padding for the hover
            lift, so the header sits closer than the usual mb-6. */}
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                {t('home:recentlyViewed.title', 'Recently Viewed')}
              </h2>
            </div>
            <p className="text-sm text-gray-500 ml-10">
              {t('home:recentlyViewed.subtitle', 'Pick up where you left off')}
            </p>
          </div>

          {/* Scroll arrows — desktop only */}
          <div className="hidden sm:flex items-center gap-2">
            <button
              onClick={() => scroll('left')}
              disabled={!canScrollLeft}
              className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center transition-all hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Scroll left"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <button
              onClick={() => scroll('right')}
              disabled={!canScrollRight}
              className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center transition-all hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Scroll right"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>
        </div>

        {/* Horizontal carousel.
            No edge fade overlays: a white gradient sitting on top of the first
            and last card washed them out — the card looked faded rather than
            the rail looking scrollable. The arrows already signal that there is
            more to scroll to. */}
        <div className="relative">
          {/* `overflow-x-auto` also clips vertically, so the rail has to pay for
              what the cards do on hover: 6px of lift plus the ~26px the raised
              shadow reaches below them. Without this padding the top of a
              hovered card was sliced off and its drop shadow ended in a hard
              horizontal band. The negative margins keep the first card flush
              with the section's own gutter. */}
          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth pt-5 pb-9 -mx-4 px-4 no-backdrop-blur"
            style={{ scrollSnapType: 'x mandatory' }}
          >
            {recentlyViewed.map((property) => (
              /* No background or radius here: the card paints its own, and a
                 second rounded white box behind it stayed put during the hover
                 lift, showing as a grey seam under the card. */
              <div
                key={property.id}
                className="rv-card flex-shrink-0 w-[280px] sm:w-[310px]"
                style={{ scrollSnapAlign: 'start', willChange: 'transform', backfaceVisibility: 'hidden' }}
              >
                <PropertyCard property={property} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default RecentlyViewedSection;
