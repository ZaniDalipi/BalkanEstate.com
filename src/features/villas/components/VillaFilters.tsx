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
    { value: 'mountain', labelKey: 'filters.mountain', defaultLabel: 'Mountain', emoji: '⛰️' },
    { value: 'sea',      labelKey: 'filters.sea',      defaultLabel: 'Sea View',  emoji: '🌊' },
    { value: 'park',     labelKey: 'filters.lakeForest', defaultLabel: 'Lake / Forest', emoji: '🌲' },
    { value: 'city',     labelKey: 'filters.cityView', defaultLabel: 'City View', emoji: '🏙️' },
] as const;

const AMENITY_CHIPS = [
    { tag: 'sauna',       labelKey: 'filters.sauna',      defaultLabel: 'Sauna',        boolKey: null },
    { tag: 'wine cellar', labelKey: 'filters.wineCellar', defaultLabel: 'Wine Cellar',  boolKey: null },
    { tag: 'panoramic',   labelKey: 'filters.panoramic',  defaultLabel: 'Panoramic',    boolKey: null },
] as const;

const VillaFilters: React.FC<VillaFiltersProps> = ({ filters, onFilterChange, onSearch, onReset, onSaveSearch, isSaving, compact }) => {
    const { t } = useTranslation(['villas', 'common', 'search', 'rental']);
    const currencySymbol = getCurrencySymbol(filters.country !== 'any' ? filters.country : '');

    const selectClasses = 'glass-select block w-full text-xs px-2 py-1.5';
    const inputClasses = 'glass-input block w-full text-xs px-2 py-1.5';
    const labelClasses = 'block text-[11px] font-medium text-gray-400 mb-0.5 uppercase tracking-wide';

    const toggleAmenity = (tag: string) => {
        const current: string[] = (filters.amenities as string[]) || [];
        const updated = current.includes(tag)
            ? current.filter((a: string) => a !== tag)
            : [...current, tag];
        onFilterChange('amenities', updated);
    };

    const activeViewType = filters.viewType || 'any';
    const activeAmenities: string[] = (filters.amenities as string[]) || [];

    const viewChipBase = 'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all cursor-pointer whitespace-nowrap';
    const viewChipActive = 'bg-secondary/10 text-primary-dark border-secondary font-semibold';
    const viewChipInactive = 'bg-white/60 text-gray-500 border-gray-200 hover:border-secondary/50 hover:text-primary';

    const listingTypeChipBase = 'flex-1 text-center px-3 py-1 rounded-full text-[11px] font-semibold border transition-all cursor-pointer';

    if (compact) {
        return (
            <div className="px-3 py-2 space-y-2">
                {/* Listing type: Any / For Sale / For Rent */}
                <div>
                    <label className={labelClasses}>{t('villas:filters.listingType', 'Type')}</label>
                    <div className="flex gap-1.5">
                        {(['any', 'sale', 'rent'] as const).map(lt => {
                            const labels = { any: t('common:any'), sale: t('villas:filters.forSale', 'For Sale'), rent: t('villas:filters.forRent', 'For Rent') };
                            const isActive = (filters.listingType || 'any') === lt;
                            return (
                                <button key={lt} type="button" onClick={() => onFilterChange('listingType', lt)}
                                    className={`${listingTypeChipBase} ${isActive ? viewChipActive : viewChipInactive}`}>
                                    {labels[lt]}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* View type chips */}
                <div>
                    <label className={labelClasses}>{t('villas:filters.viewType', 'Setting')}</label>
                    <div className="flex flex-wrap gap-1.5">
                        {VIEW_TYPE_CHIPS.map(chip => (
                            <button
                                key={chip.value}
                                type="button"
                                onClick={() => onFilterChange('viewType', activeViewType === chip.value ? 'any' : chip.value)}
                                className={`${viewChipBase} ${activeViewType === chip.value ? viewChipActive : viewChipInactive}`}
                            >
                                <span>{chip.emoji}</span>
                                <span>{t(`villas:${chip.labelKey}`, chip.defaultLabel)}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Row 1: Country + Beds */}
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className={labelClasses}>{t('villas:filters.country', 'Country')}</label>
                        <select value={filters.country} onChange={(e) => onFilterChange('country', e.target.value)} className={selectClasses}>
                            <option value="any">{t('villas:filters.allCountries', 'All Countries')}</option>
                            {BALKAN_LOCATIONS.map(c => <option key={c.code} value={c.name}>{c.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className={labelClasses}>{t('villas:filters.minBeds', 'Bedrooms')}</label>
                        <select value={filters.beds ?? ''} onChange={(e) => onFilterChange('beds', e.target.value ? Number(e.target.value) : null)} className={selectClasses}>
                            <option value="">{t('common:any')}</option>
                            {[3, 4, 5].map(n => <option key={n} value={n}>{n}+</option>)}
                        </select>
                    </div>
                </div>

                {/* Row 2: Price range */}
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className={labelClasses}>{t('villas:filters.minRent', 'Min Rent')}</label>
                        <div className="relative">
                            <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[11px] text-gray-400">{currencySymbol}</span>
                            <input type="number" placeholder="500" value={filters.minPrice ?? ''} onChange={(e) => onFilterChange('minPrice', e.target.value ? Number(e.target.value) : null)} className={`${inputClasses} pl-5`} />
                        </div>
                    </div>
                    <div>
                        <label className={labelClasses}>{t('villas:filters.maxRent', 'Max Rent')}</label>
                        <div className="relative">
                            <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[11px] text-gray-400">{currencySymbol}</span>
                            <input type="number" placeholder={t('villas:filters.noLimit', 'No limit')} value={filters.maxPrice ?? ''} onChange={(e) => onFilterChange('maxPrice', e.target.value ? Number(e.target.value) : null)} className={`${inputClasses} pl-5`} />
                        </div>
                    </div>
                </div>

                {/* Row 3: Premium amenities + boolean chips */}
                <div>
                    <label className={labelClasses}>{t('villas:filters.amenities', 'Premium Amenities')}</label>
                    <div className="flex flex-wrap gap-1.5">
                        {/* Boolean filter chips */}
                        {[
                            { key: 'hasPool' as keyof Filters, label: t('villas:filters.pool', 'Pool'), emoji: '🏊' },
                            { key: 'hasGarden' as keyof Filters, label: t('villas:filters.garden', 'Garden'), emoji: '🌿' },
                        ].map(({ key, label, emoji }) => {
                            const isActive = (filters as any)[key] === true;
                            return (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => onFilterChange(key, isActive ? null : true)}
                                    className={`${viewChipBase} ${isActive ? viewChipActive : viewChipInactive}`}
                                >
                                    <span>{emoji}</span>
                                    <span>{label}</span>
                                </button>
                            );
                        })}
                        {/* Amenity string chips */}
                        {AMENITY_CHIPS.map(({ tag, labelKey, defaultLabel }) => {
                            const isActive = activeAmenities.includes(tag);
                            return (
                                <button
                                    key={tag}
                                    type="button"
                                    onClick={() => toggleAmenity(tag)}
                                    className={`${viewChipBase} ${isActive ? viewChipActive : viewChipInactive}`}
                                >
                                    <span>{tag === 'sauna' ? '🧖' : tag === 'wine cellar' ? '🍷' : '🏔️'}</span>
                                    <span>{t(`villas:${labelKey}`, defaultLabel)}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Row 4: Furnishing + Sort + Actions */}
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="flex-1 min-w-0">
                            <select value={filters.furnishing} onChange={(e) => onFilterChange('furnishing', e.target.value)} className={selectClasses}>
                                <option value="any">{t('common:any')}</option>
                                <option value="furnished">{t('rental:furnishing.furnished', 'Furnished')}</option>
                                <option value="semi-furnished">{t('rental:furnishing.semi-furnished', 'Semi-furnished')}</option>
                                <option value="unfurnished">{t('rental:furnishing.unfurnished', 'Unfurnished')}</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={onReset} className="text-[11px] text-gray-400 hover:text-gray-600 py-1.5 transition-colors whitespace-nowrap">
                            {t('villas:filters.reset', 'Reset')}
                        </button>
                        {onSaveSearch && (
                            <button
                                onClick={onSaveSearch}
                                disabled={isSaving}
                                className="text-[11px] text-primary hover:text-primary-dark py-1.5 px-2 border border-primary/30 rounded-lg transition-colors whitespace-nowrap disabled:opacity-50"
                            >
                                {isSaving ? t('search:saving', 'Saving...') : t('search:saveSearch', 'Save Search')}
                            </button>
                        )}
                        <Button variant="cool" size="sm" onClick={onSearch} className="text-xs font-semibold whitespace-nowrap rounded-xl">
                            {t('villas:filters.search', 'Search Villas')}
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // Full layout for mobile modal
    return (
        <div className="space-y-3 p-4">
            {/* Listing type */}
            <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">{t('villas:filters.listingType', 'Type')}</label>
                <div className="flex gap-2">
                    {(['any', 'sale', 'rent'] as const).map(lt => {
                        const labels = { any: t('common:any'), sale: t('villas:filters.forSale', 'For Sale'), rent: t('villas:filters.forRent', 'For Rent') };
                        const isActive = (filters.listingType || 'any') === lt;
                        return (
                            <button key={lt} type="button" onClick={() => onFilterChange('listingType', lt)}
                                className={`flex-1 text-center px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${isActive ? viewChipActive : viewChipInactive}`}>
                                {labels[lt]}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* View type chips */}
            <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">{t('villas:filters.viewType', 'Setting')}</label>
                <div className="flex flex-wrap gap-2">
                    {VIEW_TYPE_CHIPS.map(chip => (
                        <button
                            key={chip.value}
                            type="button"
                            onClick={() => onFilterChange('viewType', activeViewType === chip.value ? 'any' : chip.value)}
                            className={`${viewChipBase} ${activeViewType === chip.value ? viewChipActive : viewChipInactive}`}
                        >
                            <span>{chip.emoji}</span>
                            <span>{t(`villas:${chip.labelKey}`, chip.defaultLabel)}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Country */}
            <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">{t('villas:filters.country', 'Country')}</label>
                <select value={filters.country} onChange={(e) => onFilterChange('country', e.target.value)} className={selectClasses}>
                    <option value="any">{t('villas:filters.allCountries', 'All Countries')}</option>
                    {BALKAN_LOCATIONS.map(country => <option key={country.code} value={country.name}>{country.name}</option>)}
                </select>
            </div>

            {/* Price Range */}
            <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">{t('villas:filters.minRent', 'Min Rent')}</label>
                    <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">{currencySymbol}</span>
                        <input type="number" placeholder="500" value={filters.minPrice ?? ''} onChange={(e) => onFilterChange('minPrice', e.target.value ? Number(e.target.value) : null)} className={`${inputClasses} pl-6`} />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">{t('villas:filters.maxRent', 'Max Rent')}</label>
                    <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">{currencySymbol}</span>
                        <input type="number" placeholder={t('villas:filters.noLimit', 'No limit')} value={filters.maxPrice ?? ''} onChange={(e) => onFilterChange('maxPrice', e.target.value ? Number(e.target.value) : null)} className={`${inputClasses} pl-6`} />
                    </div>
                </div>
            </div>

            {/* Beds */}
            <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">{t('villas:filters.minBeds', 'Bedrooms')}</label>
                <select value={filters.beds ?? ''} onChange={(e) => onFilterChange('beds', e.target.value ? Number(e.target.value) : null)} className={selectClasses}>
                    <option value="">{t('common:any')}</option>
                    {[3, 4, 5].map(n => <option key={n} value={n}>{n}+</option>)}
                </select>
            </div>

            {/* Premium Amenities */}
            <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">{t('villas:filters.amenities', 'Premium Amenities')}</label>
                <div className="flex flex-wrap gap-2">
                    {[
                        { key: 'hasPool' as keyof Filters, label: t('villas:filters.pool', 'Pool'), emoji: '🏊' },
                        { key: 'hasGarden' as keyof Filters, label: t('villas:filters.garden', 'Garden'), emoji: '🌿' },
                    ].map(({ key, label, emoji }) => {
                        const isActive = (filters as any)[key] === true;
                        return (
                            <button key={key} type="button" onClick={() => onFilterChange(key, isActive ? null : true)} className={`${viewChipBase} ${isActive ? viewChipActive : viewChipInactive}`}>
                                <span>{emoji}</span><span>{label}</span>
                            </button>
                        );
                    })}
                    {AMENITY_CHIPS.map(({ tag, labelKey, defaultLabel }) => {
                        const isActive = activeAmenities.includes(tag);
                        return (
                            <button key={tag} type="button" onClick={() => toggleAmenity(tag)} className={`${viewChipBase} ${isActive ? viewChipActive : viewChipInactive}`}>
                                <span>{tag === 'sauna' ? '🧖' : tag === 'wine cellar' ? '🍷' : '🏔️'}</span>
                                <span>{t(`villas:${labelKey}`, defaultLabel)}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Furnishing */}
            <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">{t('villas:filters.furnishing', 'Furnishing')}</label>
                <select value={filters.furnishing} onChange={(e) => onFilterChange('furnishing', e.target.value)} className={selectClasses}>
                    <option value="any">{t('common:any')}</option>
                    <option value="furnished">{t('rental:furnishing.furnished', 'Furnished')}</option>
                    <option value="semi-furnished">{t('rental:furnishing.semi-furnished', 'Semi-furnished')}</option>
                    <option value="unfurnished">{t('rental:furnishing.unfurnished', 'Unfurnished')}</option>
                </select>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
                <Button variant="cool" onClick={onSearch} className="flex-1 text-sm font-semibold rounded-xl">
                    {t('villas:filters.search', 'Search Villas')}
                </Button>
                {onSaveSearch && (
                    <button
                        onClick={onSaveSearch}
                        disabled={isSaving}
                        className="flex-1 py-2.5 px-4 border border-primary text-primary rounded-xl text-sm font-semibold bg-white hover:bg-primary/5 transition-colors disabled:opacity-50"
                    >
                        {isSaving ? t('search:saving', 'Saving...') : t('search:saveSearch', 'Save Search')}
                    </button>
                )}
                <button onClick={onReset} className="text-sm text-gray-400 hover:text-gray-600 py-2 px-3 transition-colors">
                    {t('villas:filters.reset', 'Reset')}
                </button>
            </div>
        </div>
    );
};

export default VillaFilters;
