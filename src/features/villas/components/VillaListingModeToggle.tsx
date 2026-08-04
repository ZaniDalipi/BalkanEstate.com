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
 * rentals-only and for-sale-only. Gold active state to match the villa brand.
 */
const VillaListingModeToggle: React.FC<VillaListingModeToggleProps> = memo(({ mode, onChange, className = '' }) => {
  const { t } = useTranslation(['villas']);
  return (
    <div
      role="tablist"
      aria-label={t('villas:filters.listingType', 'Listing type')}
      className={`inline-flex items-center rounded-full bg-black/5 p-0.5 ${className}`}
    >
      {OPTIONS.map(opt => {
        const active = mode === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all whitespace-nowrap ${
              active
                ? 'bg-gradient-to-r from-[#E8B820] to-[#B8860B] text-[#2C1A00] shadow-sm'
                : 'text-gray-500 hover:text-[#0252CD]'
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
