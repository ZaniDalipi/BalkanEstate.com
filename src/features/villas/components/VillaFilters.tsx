import React from 'react';
import { useTranslation } from 'react-i18next';
import { Filters } from '@/types';
import { BALKAN_LOCATIONS } from '@/utils/balkanLocations';
import { getCurrencySymbol } from '@/utils/currency';
import { Button } from '@/components/ui/liquid-glass-button';
import VillaAllFilters from './VillaAllFilters';
import type { VillaListingMode } from '../hooks/useVillaSearch';

interface VillaFiltersProps {
    filters: Filters;
    onFilterChange: (key: keyof Filters, value: any) => void;
    onSearch: () => void;
    onReset: () => void;
    onSaveSearch?: () => void;
    isSaving?: boolean;
    compact?: boolean;
    /** Zillow's "Listing Status", surfaced inside the full filter sheet. */
    listingMode?: VillaListingMode;
    onListingModeChange?: (mode: VillaListingMode) => void;
}

const VIEW_TYPE_CHIPS = [
    { value: 'mountain', labelKey: 'filters.mountain',  defaultLabel: 'Mountain',      emoji: '⛰️' },
    { value: 'sea',      labelKey: 'filters.sea',       defaultLabel: 'Sea View',      emoji: '🌊' },
    { value: 'park',     labelKey: 'filters.lakeForest',defaultLabel: 'Lake / Forest', emoji: '🌲' },
    { value: 'city',     labelKey: 'filters.cityView',  defaultLabel: 'City View',     emoji: '🏙️' },
] as const;

const AMENITY_CHIPS = [
    { tag: 'sauna',       labelKey: 'filters.sauna',      defaultLabel: 'Sauna',       emoji: '🧖' },
    { tag: 'wine cellar', labelKey: 'filters.wineCellar', defaultLabel: 'Wine Cellar', emoji: '🍷' },
    { tag: 'panoramic',   labelKey: 'filters.panoramic',  defaultLabel: 'Panoramic',   emoji: '🏔️' },
] as const;

const VillaFilters: React.FC<VillaFiltersProps> = ({
    filters,
    onFilterChange,
    onSearch,
    onReset,
    onSaveSearch,
    isSaving,
    compact,
    listingMode,
    onListingModeChange,
}) => {
    const { t } = useTranslation(['villas', 'common', 'search', 'rental']);
    const currencySymbol = getCurrencySymbol(filters.country !== 'any' ? filters.country : '');

    const toggleAmenity = (tag: string) => {
        const current: string[] = (filters.amenities as string[]) || [];
        const updated = current.includes(tag)
            ? current.filter((a: string) => a !== tag)
            : [...current, tag];
        onFilterChange('amenities', updated);
    };

    const activeViewType   = filters.viewType || 'any';
    const activeAmenities: string[] = (filters.amenities as string[]) || [];

    // Price validation: reject non-numeric / negative input at the boundary,
    // and flag an impossible min > max range so the user gets clear feedback.
    const parsePrice = (raw: string): number | null => {
        if (raw.trim() === '') return null;
        const n = Number(raw);
        if (!Number.isFinite(n) || n < 0) return null;
        return Math.floor(n);
    };
    const handlePriceChange = (key: 'minPrice' | 'maxPrice', raw: string) => {
        onFilterChange(key, parsePrice(raw));
    };
    const priceInvalid = filters.minPrice != null && filters.maxPrice != null && filters.minPrice > filters.maxPrice;
    const priceRing = priceInvalid ? ' ring-2 ring-red-400/60 !border-red-300' : '';

    /* Chip class helpers — gilded gold accent to match the villa brand */
    const chipBase     = 'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all cursor-pointer whitespace-nowrap select-none';
    const chipActive   = 'bg-[var(--color-villa-gold)]/15 text-[var(--color-villa-gold-ink)] border-[var(--color-villa-gold)] font-semibold';
    const chipInactive = 'bg-white text-gray-500 border-gray-200 hover:border-[var(--color-villa-gold)]/60 hover:text-[var(--color-villa-gold-ink)]';

    const hasActiveFilters =
        (filters.query && filters.query.trim()) ||
        (filters.country && filters.country !== 'any') ||
        filters.minPrice != null ||
        filters.maxPrice != null ||
        filters.beds != null ||
        filters.baths != null ||
        (filters.viewType && filters.viewType !== 'any') ||
        (filters as any).hasPool === true ||
        (filters as any).hasGarden === true ||
        (activeAmenities.length > 0);

    /* ── COMPACT (desktop sidebar) — single horizontal scrollable chip row ── */
    if (compact) {
        return (
            <div
                className="flex items-center gap-0 h-[52px] px-3 overflow-x-auto"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
            >
                {/* View type chips */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                    {VIEW_TYPE_CHIPS.map(chip => (
                        <button
                            key={chip.value}
                            type="button"
                            onClick={() => onFilterChange('viewType', activeViewType === chip.value ? 'any' : chip.value)}
                            className={`${chipBase} ${activeViewType === chip.value ? chipActive : chipInactive}`}
                        >
                            <span>{chip.emoji}</span>
                            <span>{t(`villas:${chip.labelKey}`, chip.defaultLabel)}</span>
                        </button>
                    ))}
                </div>

                {/* Thin divider */}
                <div className="flex-shrink-0 w-px h-5 bg-gray-200 mx-2.5" />

                {/* Amenity chips: Pool + Garden + string amenities */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                    {([
                        { key: 'hasPool'   as keyof Filters, label: t('villas:filters.pool',   'Pool'),   emoji: '🏊' },
                        { key: 'hasGarden' as keyof Filters, label: t('villas:filters.garden', 'Garden'), emoji: '🌿' },
                    ] as const).map(({ key, label, emoji }) => {
                        const isActive = (filters as any)[key] === true;
                        return (
                            <button
                                key={String(key)}
                                type="button"
                                onClick={() => onFilterChange(key, isActive ? null : true)}
                                className={`${chipBase} ${isActive ? chipActive : chipInactive}`}
                            >
                                <span>{emoji}</span>
                                <span>{label}</span>
                            </button>
                        );
                    })}
                    {AMENITY_CHIPS.map(({ tag, labelKey, defaultLabel, emoji }) => {
                        const isActive = activeAmenities.includes(tag);
                        return (
                            <button
                                key={tag}
                                type="button"
                                onClick={() => toggleAmenity(tag)}
                                className={`${chipBase} ${isActive ? chipActive : chipInactive}`}
                            >
                                <span>{emoji}</span>
                                <span>{t(`villas:${labelKey}`, defaultLabel)}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Thin divider */}
                <div className="flex-shrink-0 w-px h-5 bg-gray-200 mx-2.5" />

                {/* Beds quick chips — Any / 3+ / 4+ / 5+ */}
                <div className="flex items-center gap-1 flex-shrink-0">
                    {([null, 3, 4, 5] as (number | null)[]).map(n => {
                        const isActive = (filters.beds ?? null) === n;
                        return (
                            <button
                                key={n ?? 'any'}
                                type="button"
                                onClick={() => onFilterChange('beds', n)}
                                className={`flex-shrink-0 h-7 px-2.5 rounded-lg text-[11px] font-semibold border transition-all ${
                                    isActive
                                        ? 'bg-[var(--color-villa-gold-bright)]/15 text-[var(--color-primary)] border-[var(--color-villa-gold-bright)]'
                                        : 'bg-white text-gray-500 border-gray-200 hover:border-[var(--color-villa-gold-bright)]/60 hover:text-[var(--color-primary)]'
                                }`}
                            >
                                {n === null ? t('common:any', 'Any') : `${n}+`} 🛏️
                            </button>
                        );
                    })}
                </div>

                {/* Thin divider */}
                <div className="flex-shrink-0 w-px h-5 bg-gray-200 mx-2.5" />

                {/* Baths quick chips — Any / 1+ / 2+ / 3+ */}
                <div className="flex items-center gap-1 flex-shrink-0">
                    {([null, 1, 2, 3] as (number | null)[]).map(n => {
                        const isActive = (filters.baths ?? null) === n;
                        return (
                            <button
                                key={n ?? 'any'}
                                type="button"
                                onClick={() => onFilterChange('baths', n)}
                                className={`flex-shrink-0 h-7 px-2.5 rounded-lg text-[11px] font-semibold border transition-all ${
                                    isActive
                                        ? 'bg-[var(--color-villa-gold-bright)]/15 text-[var(--color-primary)] border-[var(--color-villa-gold-bright)]'
                                        : 'bg-white text-gray-500 border-gray-200 hover:border-[var(--color-villa-gold-bright)]/60 hover:text-[var(--color-primary)]'
                                }`}
                            >
                                {n === null ? t('common:any', 'Any') : `${n}+`} 🛁
                            </button>
                        );
                    })}
                </div>

                {/* Thin divider */}
                <div className="flex-shrink-0 w-px h-5 bg-gray-200 mx-2.5" />

                {/* Country select */}
                <select
                    value={filters.country}
                    onChange={(e) => onFilterChange('country', e.target.value)}
                    className="flex-shrink-0 glass-select text-[11px] h-7 px-2 py-0 w-[88px] rounded-lg"
                    aria-label={t('villas:filters.country', 'Country')}
                >
                    <option value="any">{t('villas:filters.allCountries', 'All')}</option>
                    {BALKAN_LOCATIONS.map(c => (
                        <option key={c.code} value={c.name}>{c.name}</option>
                    ))}
                </select>

                {/* Min price */}
                <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    placeholder={`${currencySymbol} min`}
                    value={filters.minPrice ?? ''}
                    onChange={(e) => handlePriceChange('minPrice', e.target.value)}
                    aria-invalid={priceInvalid}
                    className={`flex-shrink-0 glass-input text-[11px] h-7 px-2 py-0 w-[72px] rounded-lg ml-1.5${priceRing}`}
                    aria-label={t('villas:filters.minRentPerNight', 'Min price per night')}
                />

                {/* Max price */}
                <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    placeholder={`${currencySymbol} max`}
                    value={filters.maxPrice ?? ''}
                    onChange={(e) => handlePriceChange('maxPrice', e.target.value)}
                    aria-invalid={priceInvalid}
                    className={`flex-shrink-0 glass-input text-[11px] h-7 px-2 py-0 w-[72px] rounded-lg ml-1.5${priceRing}`}
                    aria-label={t('villas:filters.maxRentPerNight', 'Max price per night')}
                />

                {/* Thin divider */}
                <div className="flex-shrink-0 w-px h-5 bg-gray-200 mx-2.5" />

                {/* Reset — only if active filters */}
                {hasActiveFilters && (
                    <button
                        onClick={onReset}
                        className="flex-shrink-0 text-[11px] text-red-400 hover:text-red-600 whitespace-nowrap transition-colors px-1.5 py-1 rounded-lg hover:bg-red-50 mr-1.5 border border-red-200 font-medium"
                    >
                        ✕ {t('villas:filters.reset', 'Reset')}
                    </button>
                )}

                {/* Save search */}
                {onSaveSearch && (
                    <button
                        onClick={onSaveSearch}
                        disabled={isSaving}
                        className="flex-shrink-0 text-[11px] text-[var(--color-primary)] hover:text-[var(--color-primary)]/70 whitespace-nowrap transition-colors px-1.5 py-1 border border-[var(--color-primary)]/30 rounded-lg hover:bg-[var(--color-primary)]/5 disabled:opacity-50"
                    >
                        {isSaving ? t('search:saving', 'Saving…') : t('search:saveSearch', 'Save Search')}
                    </button>
                )}
            </div>
        );
    }

    /* ── FULL (mobile modal) ──
       The whole Zillow filter set, in the touch-sized layout. This used to
       carry its own hand-rolled subset (view type, country, beds, baths,
       price, a few amenities, furnishing) which was a strict subset of what
       the buy page offered and drifted from it; VillaAllFilters is now the one
       definition of the filter set for both the phone sheet and the desktop
       panel, so they cannot disagree. */
    return (
        <div className="pb-2">
            <VillaAllFilters
                filters={filters}
                onFilterChange={onFilterChange}
                listingMode={listingMode}
                onListingModeChange={onListingModeChange}
            />

            {/* Action buttons */}
            <div className="flex flex-col gap-2.5 px-4 pb-6 pt-1">
                <Button
                    variant="cool"
                    onClick={onSearch}
                    className="w-full text-sm font-semibold rounded-xl py-3"
                >
                    {t('villas:filters.search', 'Search Villas')}
                </Button>
                {onSaveSearch && (
                    <button
                        onClick={onSaveSearch}
                        disabled={isSaving}
                        className="w-full py-2.5 px-4 border border-[var(--color-primary)] text-[var(--color-primary)] rounded-xl text-sm font-semibold bg-white hover:bg-[var(--color-primary)]/5 transition-colors disabled:opacity-50"
                    >
                        {isSaving ? t('search:saving', 'Saving…') : t('search:saveSearch', 'Save Search')}
                    </button>
                )}
                <button
                    onClick={onReset}
                    className="text-sm text-gray-400 hover:text-gray-600 py-2 transition-colors text-center"
                >
                    {t('villas:filters.reset', 'Reset all filters')}
                </button>
            </div>
        </div>
    );
};

export default VillaFilters;
