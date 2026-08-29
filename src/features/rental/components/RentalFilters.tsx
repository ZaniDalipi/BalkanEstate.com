import React from 'react';
import { normalizePropertyTypes } from '@/constants/propertyTypes';
import { useTranslation } from 'react-i18next';
import { Filters } from '@/types';
import { BALKAN_LOCATIONS } from '@/utils/balkanLocations';
import { getCurrencySymbol } from '@/utils/currency';
import { Button } from '@/components/ui/liquid-glass-button';

interface RentalFiltersProps {
    filters: Filters;
    onFilterChange: (key: keyof Filters, value: any) => void;
    onSearch: () => void;
    onReset: () => void;
    onSaveSearch?: () => void;
    isSaving?: boolean;
    compact?: boolean;
}

const RentalFilters: React.FC<RentalFiltersProps> = ({ filters, onFilterChange, onSearch, onReset, onSaveSearch, isSaving, compact }) => {
    const { t } = useTranslation(['rental', 'seller', 'common']);
    const currencySymbol = getCurrencySymbol(filters.country !== 'any' ? filters.country : '');

    const selectClasses = 'glass-select block w-full text-xs px-2 py-1.5';
    const inputClasses = 'glass-input block w-full text-xs px-2 py-1.5';
    const labelClasses = 'block text-[11px] font-medium text-gray-400 mb-0.5 uppercase tracking-wide';

    if (compact) {
        // Compact horizontal layout for desktop sidebar
        return (
            <div className="px-3 py-2 space-y-2">
                {/* Row 1: Country + Property Type */}
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className={labelClasses}>{t('rental:filters.country')}</label>
                        <select value={filters.country} onChange={(e) => onFilterChange('country', e.target.value)} className={selectClasses}>
                            <option value="any">{t('rental:filters.allCountries')}</option>
                            {BALKAN_LOCATIONS.map(c => <option key={c.code} value={c.name}>{c.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className={labelClasses}>{t('rental:filters.propertyType')}</label>
                        <select value={normalizePropertyTypes(filters.propertyType)[0] ?? 'any'} onChange={(e) => onFilterChange('propertyType', normalizePropertyTypes(e.target.value))} className={selectClasses}>
                            <option value="any">{t('rental:filters.allTypes')}</option>
                            <option value="apartment">{t('seller:propertyTypes.apartment')}</option>
                            <option value="house">{t('seller:propertyTypes.house')}</option>
                            <option value="villa">{t('seller:propertyTypes.villa')}</option>
                            <option value="other">{t('seller:propertyTypes.other')}</option>
                        </select>
                    </div>
                </div>

                {/* Row 2: Price + Beds + Baths */}
                <div className="grid grid-cols-4 gap-1.5">
                    <div>
                        <label className={labelClasses}>{t('rental:filters.minRent')}</label>
                        <div className="relative">
                            <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[11px] text-gray-400">{currencySymbol}</span>
                            <input type="number" placeholder="0" value={filters.minPrice ?? ''} onChange={(e) => onFilterChange('minPrice', e.target.value ? Number(e.target.value) : null)} className={`${inputClasses} pl-5`} />
                        </div>
                    </div>
                    <div>
                        <label className={labelClasses}>{t('rental:filters.maxRent')}</label>
                        <div className="relative">
                            <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[11px] text-gray-400">{currencySymbol}</span>
                            <input type="number" placeholder={t('rental:filters.noLimit')} value={filters.maxPrice ?? ''} onChange={(e) => onFilterChange('maxPrice', e.target.value ? Number(e.target.value) : null)} className={`${inputClasses} pl-5`} />
                        </div>
                    </div>
                    <div>
                        <label className={labelClasses}>{t('rental:filters.minBeds')}</label>
                        <select value={filters.beds ?? ''} onChange={(e) => onFilterChange('beds', e.target.value ? Number(e.target.value) : null)} className={selectClasses}>
                            <option value="">{t('common:any')}</option>
                            {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}+</option>)}
                        </select>
                    </div>
                    <div>
                        <label className={labelClasses}>{t('rental:filters.minBaths')}</label>
                        <select value={filters.baths ?? ''} onChange={(e) => onFilterChange('baths', e.target.value ? Number(e.target.value) : null)} className={selectClasses}>
                            <option value="">{t('common:any')}</option>
                            {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}+</option>)}
                        </select>
                    </div>
                </div>

                {/* Row 3: Furnishing + Sort */}
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className={labelClasses}>{t('rental:filters.furnishing')}</label>
                        <select value={filters.furnishing} onChange={(e) => onFilterChange('furnishing', e.target.value)} className={selectClasses}>
                            <option value="any">{t('common:any')}</option>
                            <option value="furnished">{t('rental:furnishing.furnished')}</option>
                            <option value="semi-furnished">{t('rental:furnishing.semi-furnished')}</option>
                            <option value="unfurnished">{t('rental:furnishing.unfurnished')}</option>
                        </select>
                    </div>
                    <div>
                        <label className={labelClasses}>{t('rental:filters.sortBy')}</label>
                        <select value={filters.sortBy} onChange={(e) => onFilterChange('sortBy', e.target.value)} className={selectClasses}>
                            <option value="newest">{t('rental:filters.newest')}</option>
                            <option value="price-low">{t('rental:filters.priceLow')}</option>
                            <option value="price-high">{t('rental:filters.priceHigh')}</option>
                            <option value="sqft-high">{t('rental:filters.sqftHigh')}</option>
                        </select>
                    </div>
                </div>

                {/* Row 4: Checkboxes + Actions */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {[
                            { key: 'petsAllowed' as keyof Filters, label: t('rental:filters.petsAllowed') },
                            { key: 'hasBalcony' as keyof Filters, label: t('rental:filters.hasBalcony') },
                            { key: 'hasAirConditioning' as keyof Filters, label: t('rental:filters.acShort') },
                            { key: 'hasElevator' as keyof Filters, label: t('rental:filters.hasElevator') },
                        ].map(({ key, label }) => (
                            <label key={key} className="flex items-center gap-1 text-[11px] text-gray-400 cursor-pointer whitespace-nowrap">
                                <input
                                    type="checkbox"
                                    checked={(filters as any)[key] === true}
                                    onChange={(e) => onFilterChange(key, e.target.checked ? true : null)}
                                    className="rounded text-blue-500 focus:ring-blue-500/30 w-3 h-3 bg-gray-100/60 border-gray-300"
                                />
                                {label}
                            </label>
                        ))}
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={onReset} className="text-[11px] text-gray-400 hover:text-gray-600 py-1.5 transition-colors whitespace-nowrap">
                            {t('rental:filters.reset')}
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
                            {t('rental:filters.search')}
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // Full layout for mobile modal
    return (
        <div className="space-y-3 p-4">
            {/* Country */}
            <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">{t('rental:filters.country')}</label>
                <select value={filters.country} onChange={(e) => onFilterChange('country', e.target.value)} className={selectClasses}>
                    <option value="any">{t('rental:filters.allCountries')}</option>
                    {BALKAN_LOCATIONS.map(country => <option key={country.code} value={country.name}>{country.name}</option>)}
                </select>
            </div>

            {/* Price Range */}
            <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">{t('rental:filters.minRent')}</label>
                    <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">{currencySymbol}</span>
                        <input type="number" placeholder="0" value={filters.minPrice ?? ''} onChange={(e) => onFilterChange('minPrice', e.target.value ? Number(e.target.value) : null)} className={`${inputClasses} pl-6`} />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">{t('rental:filters.maxRent')}</label>
                    <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">{currencySymbol}</span>
                        <input type="number" placeholder={t('rental:filters.noLimit')} value={filters.maxPrice ?? ''} onChange={(e) => onFilterChange('maxPrice', e.target.value ? Number(e.target.value) : null)} className={`${inputClasses} pl-6`} />
                    </div>
                </div>
            </div>

            {/* Property Type */}
            <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">{t('rental:filters.propertyType')}</label>
                <select value={normalizePropertyTypes(filters.propertyType)[0] ?? 'any'} onChange={(e) => onFilterChange('propertyType', normalizePropertyTypes(e.target.value))} className={selectClasses}>
                    <option value="any">{t('rental:filters.allTypes')}</option>
                    <option value="apartment">{t('seller:propertyTypes.apartment')}</option>
                    <option value="house">{t('seller:propertyTypes.house')}</option>
                    <option value="villa">{t('seller:propertyTypes.villa')}</option>
                    <option value="other">{t('seller:propertyTypes.other')}</option>
                </select>
            </div>

            {/* Beds & Baths */}
            <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">{t('rental:filters.minBeds')}</label>
                    <select value={filters.beds ?? ''} onChange={(e) => onFilterChange('beds', e.target.value ? Number(e.target.value) : null)} className={selectClasses}>
                        <option value="">{t('common:any')}</option>
                        {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}+</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">{t('rental:filters.minBaths')}</label>
                    <select value={filters.baths ?? ''} onChange={(e) => onFilterChange('baths', e.target.value ? Number(e.target.value) : null)} className={selectClasses}>
                        <option value="">{t('common:any')}</option>
                        {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}+</option>)}
                    </select>
                </div>
            </div>

            {/* Furnishing */}
            <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">{t('rental:filters.furnishing')}</label>
                <select value={filters.furnishing} onChange={(e) => onFilterChange('furnishing', e.target.value)} className={selectClasses}>
                    <option value="any">{t('common:any')}</option>
                    <option value="furnished">{t('rental:furnishing.furnished')}</option>
                    <option value="semi-furnished">{t('rental:furnishing.semi-furnished')}</option>
                    <option value="unfurnished">{t('rental:furnishing.unfurnished')}</option>
                </select>
            </div>

            {/* Boolean Filters */}
            <div className="flex flex-wrap gap-2">
                <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer">
                    <input type="checkbox" checked={filters.petsAllowed === true} onChange={(e) => onFilterChange('petsAllowed', e.target.checked ? true : null)} className="rounded text-blue-500 focus:ring-blue-500/30 bg-gray-100/60 border-gray-300" />
                    {t('rental:filters.petsAllowed')}
                </label>
                <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer">
                    <input type="checkbox" checked={filters.hasBalcony === true} onChange={(e) => onFilterChange('hasBalcony', e.target.checked ? true : null)} className="rounded text-blue-500 focus:ring-blue-500/30 bg-gray-100/60 border-gray-300" />
                    {t('rental:filters.hasBalcony')}
                </label>
                <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer">
                    <input type="checkbox" checked={filters.hasAirConditioning === true} onChange={(e) => onFilterChange('hasAirConditioning', e.target.checked ? true : null)} className="rounded text-blue-500 focus:ring-blue-500/30 bg-gray-100/60 border-gray-300" />
                    {t('rental:filters.airConditioning')}
                </label>
                <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer">
                    <input type="checkbox" checked={filters.hasElevator === true} onChange={(e) => onFilterChange('hasElevator', e.target.checked ? true : null)} className="rounded text-blue-500 focus:ring-blue-500/30 bg-gray-100/60 border-gray-300" />
                    {t('rental:filters.hasElevator')}
                </label>
            </div>

            {/* Sort */}
            <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">{t('rental:filters.sortBy')}</label>
                <select value={filters.sortBy} onChange={(e) => onFilterChange('sortBy', e.target.value)} className={selectClasses}>
                    <option value="newest">{t('rental:filters.newest')}</option>
                    <option value="price-low">{t('rental:filters.priceLow')}</option>
                    <option value="price-high">{t('rental:filters.priceHigh')}</option>
                    <option value="sqft-high">{t('rental:filters.sqftHigh')}</option>
                </select>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
                <Button variant="cool" onClick={onSearch} className="flex-1 text-sm font-semibold rounded-xl">
                    {t('rental:filters.search')}
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
                    {t('rental:filters.reset')}
                </button>
            </div>
        </div>
    );
};

export default RentalFilters;
