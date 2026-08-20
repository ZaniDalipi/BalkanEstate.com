import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { VillaListingMode } from '../hooks/useVillaSearch';

interface VillaListingModeToggleProps {
  mode: VillaListingMode;
  onChange: (mode: VillaListingMode) => void;
  className?: string;
}

const OPTIONS: { value: VillaListingMode; labelKey: string; fallback: string }[] = [
  { value: 'any', labelKey: 'villas:filters.allListings', fallback: 'All' },
  { value: 'rent', labelKey: 'villas:filters.forRent', fallback: 'For Rent' },
  { value: 'sale', labelKey: 'villas:filters.forSale', fallback: 'For Sale' },
];

/**
 * Segmented control that switches the luxury-villa market between both,
 * rentals-only and for-sale-only.
 *
 * radiogroup, not tablist: there are no tabpanels here — the control filters
 * a list that stays in place, which is exactly what a radio group describes.
 */
const VillaListingModeToggle: React.FC<VillaListingModeToggleProps> = memo(({ mode, onChange, className = '' }) => {
  const { t } = useTranslation(['villas']);
  return (
    <div
      role="radiogroup"
      aria-label={t('villas:filters.listingType', 'Listing type')}
      className={`inline-flex items-center rounded-lg bg-neutral-100 p-0.5 ${className}`}
      data-villa-mode-toggle
    >
      {OPTIONS.map(opt => {
        const active = mode === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            // Sized for a fingertip: the segments were 12px text in 4px of
            // vertical padding, about 26px tall, well under the 44px minimum
            // and the single most-used control on the page. Desktop keeps the
            // compact size, where a cursor makes it a non-issue. The breakpoint
            // is lg, not sm: this page treats anything under 1024px as touch
            // (isMobile/isTablet), so a tablet must keep the finger-sized target.
            className={`min-h-[44px] lg:min-h-0 flex-1 lg:flex-none px-4 lg:px-3 py-2.5 lg:py-1 rounded-md text-[13px] lg:text-[12px] font-medium transition-all whitespace-nowrap touch-manipulation focus-visible:ring-2 focus-visible:ring-[var(--color-villa-gold-calm)]/60 focus-visible:outline-none ${
              active
                ? 'bg-white text-neutral-900 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-800'
            }`}
          >
            {t(opt.labelKey, opt.fallback)}
          </button>
        );
      })}
    </div>
  );
});

VillaListingModeToggle.displayName = 'VillaListingModeToggle';
export default VillaListingModeToggle;
