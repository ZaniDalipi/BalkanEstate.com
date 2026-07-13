import React from 'react';
import { useTranslation } from 'react-i18next';
import { Filters } from '@/types';
import { BALKAN_LOCATIONS } from '@/utils/balkanLocations';
import { getCurrencySymbol } from '@/utils/currency';
import { Button } from '@/components/ui/liquid-glass-button';

interface VillaFiltersProps {
    filters: Filters;
    onFilterChange: (key: keyof Filters, value: any) => void;
    onSearch: () => void;
    onReset: () => void;
    onSaveSearch?: () => void;
    isSaving?: boolean;
    compact?: boolean;
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

    /* Chip class helpers — matching the spec */
    const chipBase     = 'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all cursor-pointer whitespace-nowrap select-none';
    const chipActive   = 'bg-[#FFA500]/15 text-[#0252CD] border-[#FFA500] font-semibold';
    const chipInactive = 'bg-white text-gray-500 border-gray-200 hover:border-[#FFA500]/60 hover:text-[#0252CD]';

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
                                        ? 'bg-[#FFA500]/15 text-[#0252CD] border-[#FFA500]'
                                        : 'bg-white text-gray-500 border-gray-200 hover:border-[#FFA500]/60 hover:text-[#0252CD]'
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
                                        ? 'bg-[#FFA500]/15 text-[#0252CD] border-[#FFA500]'
                                        : 'bg-white text-gray-500 border-gray-200 hover:border-[#FFA500]/60 hover:text-[#0252CD]'
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
                    placeholder={`${currencySymbol} min`}
                    value={filters.minPrice ?? ''}
                    onChange={(e) => onFilterChange('minPrice', e.target.value ? Number(e.target.value) : null)}
                    className="flex-shrink-0 glass-input text-[11px] h-7 px-2 py-0 w-[72px] rounded-lg ml-1.5"
                    aria-label={t('villas:filters.minRentPerNight', 'Min price per night')}
                />

                {/* Max price */}
                <input
                    type="number"
                    placeholder={`${currencySymbol} max`}
                    value={filters.maxPrice ?? ''}
                    onChange={(e) => onFilterChange('maxPrice', e.target.value ? Number(e.target.value) : null)}
                    className="flex-shrink-0 glass-input text-[11px] h-7 px-2 py-0 w-[72px] rounded-lg ml-1.5"
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
                        className="flex-shrink-0 text-[11px] text-[#0252CD] hover:text-[#0252CD]/70 whitespace-nowrap transition-colors px-1.5 py-1 border border-[#0252CD]/30 rounded-lg hover:bg-[#0252CD]/5 disabled:opacity-50"
                    >
                        {isSaving ? t('search:saving', 'Saving…') : t('search:saveSearch', 'Save Search')}
                    </button>
                )}
            </div>
        );
    }

    /* ── FULL (mobile modal) — vertical, clean & spacious ── */
    const fullLabelClasses = 'block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide';
    const fullSelectClasses = 'glass-select block w-full text-sm px-3 py-2.5 rounded-xl';
    const fullInputClasses  = 'glass-input block w-full text-sm px-3 py-2.5 rounded-xl';

    return (
        <div className="space-y-5 p-4 pb-6">

            {/* View type section */}
            <div>
                <label className={fullLabelClasses}>{t('villas:filters.viewType', 'Setting')}</label>
                <div className="flex flex-wrap gap-2">
                    {VIEW_TYPE_CHIPS.map(chip => (
                        <button
                            key={chip.value}
                            type="button"
                            onClick={() => onFilterChange('viewType', activeViewType === chip.value ? 'any' : chip.value)}
                            className={`${chipBase} text-xs px-3 py-1.5 ${activeViewType === chip.value ? chipActive : chipInactive}`}
                        >
                            <span>{chip.emoji}</span>
                            <span>{t(`villas:${chip.labelKey}`, chip.defaultLabel)}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Country + Beds — 2-col grid */}
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className={fullLabelClasses}>{t('villas:filters.country', 'Country')}</label>
                    <select
                        value={filters.country}
                        onChange={(e) => onFilterChange('country', e.target.value)}
                        className={fullSelectClasses}
                    >
                        <option value="any">{t('villas:filters.allCountries', 'All Countries')}</option>
                        {BALKAN_LOCATIONS.map(country => (
                            <option key={country.code} value={country.name}>{country.name}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className={fullLabelClasses}>{t('villas:filters.minBeds', 'Bedrooms')}</label>
                    <div className="flex gap-2">
                        {([null, 3, 4, 5] as (number | null)[]).map(n => {
                            const isActive = (filters.beds ?? null) === n;
                            return (
                                <button
                                    key={n ?? 'any'}
                                    type="button"
                                    onClick={() => onFilterChange('beds', n)}
                                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                                        isActive
                                            ? 'bg-[#FFA500]/15 text-[#0252CD] border-[#FFA500]'
                                            : 'bg-white text-gray-500 border-gray-200 hover:border-[#FFA500]/60 hover:text-[#0252CD]'
                                    }`}
                                >
                                    {n === null ? t('common:any', 'Any') : `${n}+ 🛏️`}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Bathrooms */}
            <div>
                <label className={fullLabelClasses}>{t('villas:filters.bathrooms', 'Bathrooms')}</label>
                <div className="flex gap-2">
                    {([null, 1, 2, 3] as (number | null)[]).map(n => {
                        const isActive = (filters.baths ?? null) === n;
                        return (
                            <button
                                key={n ?? 'any'}
                                type="button"
                                onClick={() => onFilterChange('baths', n)}
                                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                                    isActive
                                        ? 'bg-[#FFA500]/15 text-[#0252CD] border-[#FFA500]'
                                        : 'bg-white text-gray-500 border-gray-200 hover:border-[#FFA500]/60 hover:text-[#0252CD]'
                                }`}
                            >
                                {n === null ? t('common:any', 'Any') : `${n}+ 🛁`}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Price per night */}
            <div>
                <label className={fullLabelClasses}>{t('villas:filters.pricePerNight', 'Price / Night')}</label>
                <div className="grid grid-cols-2 gap-3">
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">{currencySymbol}</span>
                        <input
                            type="number"
                            placeholder="500"
                            value={filters.minPrice ?? ''}
                            onChange={(e) => onFilterChange('minPrice', e.target.value ? Number(e.target.value) : null)}
                            className={`${fullInputClasses} pl-6`}
                            aria-label={t('villas:filters.minRentPerNight', 'Min price per night')}
                        />
                    </div>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">{currencySymbol}</span>
                        <input
                            type="number"
                            placeholder={t('villas:filters.noLimit', 'No limit')}
                            value={filters.maxPrice ?? ''}
                            onChange={(e) => onFilterChange('maxPrice', e.target.value ? Number(e.target.value) : null)}
                            className={`${fullInputClasses} pl-6`}
                            aria-label={t('villas:filters.maxRentPerNight', 'Max price per night')}
                        />
                    </div>
                </div>
            </div>

            {/* Premium amenities */}
            <div>
                <label className={fullLabelClasses}>{t('villas:filters.amenities', 'Premium Amenities')}</label>
                <div className="flex flex-wrap gap-2">
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
                                className={`${chipBase} text-xs px-3 py-1.5 ${isActive ? chipActive : chipInactive}`}
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
                                className={`${chipBase} text-xs px-3 py-1.5 ${isActive ? chipActive : chipInactive}`}
                            >
                                <span>{emoji}</span>
                                <span>{t(`villas:${labelKey}`, defaultLabel)}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Furnishing dropdown */}
            <div>
                <label className={fullLabelClasses}>{t('villas:filters.furnishing', 'Furnishing')}</label>
                <select
                    value={filters.furnishing}
                    onChange={(e) => onFilterChange('furnishing', e.target.value)}
                    className={fullSelectClasses}
                >
                    <option value="any">{t('common:any', 'Any')}</option>
                    <option value="furnished">{t('rental:furnishing.furnished', 'Furnished')}</option>
                    <option value="semi-furnished">{t('rental:furnishing.semi-furnished', 'Semi-furnished')}</option>
                    <option value="unfurnished">{t('rental:furnishing.unfurnished', 'Unfurnished')}</option>
                </select>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-2.5 pt-1">
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
                        className="w-full py-2.5 px-4 border border-[#0252CD] text-[#0252CD] rounded-xl text-sm font-semibold bg-white hover:bg-[#0252CD]/5 transition-colors disabled:opacity-50"
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
