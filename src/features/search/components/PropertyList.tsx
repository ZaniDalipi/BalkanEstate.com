import React, { useState, useRef, useEffect, memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Property, ChatMessage, AiSearchQuery, Filters, SellerType, FurnishingStatus, HeatingType, PropertyCondition, ViewType, EnergyRating } from '@/types';
import PropertyCard from '@/src/features/property-details/components/PropertyCard';
import HighlightedPropertiesSection from '@/src/features/property-details/components/HighlightedPropertiesSection';
import { SearchIcon, XMarkIcon, BellIcon, BuildingLibraryIcon, ChevronUpIcon, ChevronDownIcon, PencilIcon, XCircleIcon, MapPinIcon, SpinnerIcon, AdjustmentsHorizontalIcon } from '@/constants';
import AiSearch from './AiSearch';
import PropertyCardSkeleton from '@/src/features/property-details/components/PropertyCardSkeleton';
import { AdBanner } from '@/features/ads';
import Footer from '@/components/shared/Footer';
import { AdSlot } from '@/src/features/ads';

interface PropertyListProps {
  properties: Property[];
  filters: Filters;
  onFilterChange: <K extends keyof Filters>(name: K, value: Filters[K]) => void;
  onSearchClick: () => void;
  onResetFilters: () => void;
  onSortChange: (value: string) => void;
  onSaveSearch: () => void;
  isSaving: boolean;
  isMobile: boolean;
  showFilters: boolean;
  showList: boolean;
  searchMode: 'manual' | 'ai';
  onSearchModeChange: (mode: 'manual' | 'ai') => void;
  onApplyAiFilters: (query: AiSearchQuery) => void;
  isAreaDrawn: boolean;
  aiChatHistory: ChatMessage[];
  onAiChatHistoryChange: (history: ChatMessage[]) => void;
  onDrawStart: () => void;
  isDrawing: boolean;
  isSearchingLocation: boolean;
  onPropertyHover?: (propertyId: string | null) => void;
  suggestions?: { place_id: number; display_name: string }[];
  onSuggestionClick?: (suggestion: { place_id: number; display_name: string; lat: string; lon: string; boundingbox: string[] }) => void;
  isQueryInputFocused?: boolean;
  onQueryInputFocusChange?: (focused: boolean) => void;
  // Passed from parent to avoid subscribing to full AppContext
  // (prevents re-render cascade when savedHomes changes)
  isLoadingProperties?: boolean;
  isAuthenticated?: boolean;
  onOpenAuthModal?: () => void;
}

const FilterButton: React.FC<{
  onClick: () => void;
  isActive: boolean;
  children: React.ReactNode;
}> = ({ onClick, isActive, children }) => (
  <button
    onClick={onClick}
    className={`px-2.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 flex-grow text-center ${
      isActive
        ? 'bg-primary text-white shadow'
        : 'bg-neutral-200/70 text-neutral-700 hover:bg-neutral-300/70'
    }`}
  >
    {children}
  </button>
);

const FilterButtonGroup = <T extends string | number | null>({
  label,
  options,
  selectedValue,
  onChange
}: {
  label: string;
  options: { value: T; label: string }[];
  selectedValue: T;
  onChange: (value: T) => void;
}) => (
  <div>
    <label className="block text-xs font-medium text-neutral-700 mb-1">{label}</label>
    <div className="flex items-center space-x-1 bg-neutral-100 p-1 rounded-full border border-neutral-200">
      {options.map(({ value, label: optionLabel }) => (
        <FilterButton
          key={optionLabel}
          onClick={() => onChange(selectedValue === value ? null as T : value)}
          isActive={selectedValue === value}
        >
          {optionLabel}
        </FilterButton>
      ))}
    </div>
  </div>
);

const ToggleSwitch: React.FC<{
  label: string;
  value: boolean | null;
  onChange: (value: boolean | null) => void;
  t: (key: string) => string;
}> = ({ label, value, onChange, t }) => (
  <div className="flex items-center justify-between">
    <label className="text-xs font-medium text-neutral-700">{label}</label>
    <div className="flex items-center gap-1">
      <button
        onClick={() => onChange(false)}
        className={`px-2 py-1 text-xs rounded transition-colors ${
          value === false ? 'bg-red-500 text-white' : 'bg-neutral-200 text-neutral-600'
        }`}
      >
        {t('search:options.no')}
      </button>
      <button
        onClick={() => onChange(null)}
        className={`px-2 py-1 text-xs rounded transition-colors ${
          value === null ? 'bg-neutral-400 text-white' : 'bg-neutral-200 text-neutral-600'
        }`}
      >
        {t('search:options.any')}
      </button>
      <button
        onClick={() => onChange(true)}
        className={`px-2 py-1 text-xs rounded transition-colors ${
          value === true ? 'bg-green-500 text-white' : 'bg-neutral-200 text-neutral-600'
        }`}
      >
        {t('search:options.yes')}
      </button>
    </div>
  </div>
);

const FilterControls: React.FC<Omit<PropertyListProps, 'properties' | 'showList' | 'aiChatHistory' | 'onAiChatHistoryChange'>> = ({
    filters, onFilterChange, onSearchClick, onResetFilters, onSaveSearch, isSaving, isMobile, isAreaDrawn, onDrawStart, isDrawing, isSearchingLocation, suggestions = [], onSuggestionClick, isQueryInputFocused, onQueryInputFocusChange
}) => {
    const { t } = useTranslation(['search', 'common']);
    const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

    const handleNumericInputChange = (field: keyof Filters, value: string) => {
        const num = parseInt(value.replace(/\D/g, ''), 10);
        onFilterChange(field, isNaN(num) ? null : num);
    };

    const inputBaseClasses = "block w-full text-xs bg-white border border-neutral-300 rounded-xl text-neutral-900 px-3 py-2 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-neutral-400";

    return (
         <div className="space-y-4">

            {/* Search by Address */}
            <div className="relative">
                <label className="block text-xs font-medium text-neutral-700 mb-1">{t('search:searchLocation')}</label>
                <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <MapPinIcon className="h-4 w-4 text-neutral-400" />
                    </div>
                    <input
                        type="text"
                        placeholder={t('search:searchPlaceholder')}
                        value={filters.query}
                        onChange={(e) => onFilterChange('query', e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && onSearchClick()}
                        onFocus={() => onQueryInputFocusChange?.(true)}
                        className={`${inputBaseClasses} pl-9`}
                        aria-label={t('search:searchLocation')}
                        aria-autocomplete="list"
                        aria-expanded={suggestions.length > 0 && isQueryInputFocused}
                    />
                    {filters.query && !isSearchingLocation && (
                        <div className="absolute inset-y-0 right-0 flex items-center pr-2">
                            <button onClick={() => onFilterChange('query', '')} className="text-neutral-400 hover:text-neutral-800 transition-colors">
                                <XMarkIcon className="h-4 w-4" />
                            </button>
                        </div>
                    )}
                    {isSearchingLocation && (
                        <div className="absolute inset-y-0 right-0 flex items-center pr-2">
                            <SpinnerIcon className="h-4 w-4 text-primary" />
                        </div>
                    )}
                </div>
                {suggestions.length > 0 && isQueryInputFocused && (
                    <ul className="absolute z-30 w-full mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg max-h-48 overflow-y-auto" role="listbox" aria-label="Search suggestions">
                        {suggestions.map((suggestion) => (
                            <li
                                key={suggestion.place_id}
                                onMouseDown={() => onSuggestionClick?.(suggestion as any)}
                                className="px-3 py-2 text-xs text-neutral-700 hover:bg-primary/5 cursor-pointer flex items-center gap-2 transition-colors"
                                role="option"
                                aria-selected={false}
                            >
                                <MapPinIcon className="w-4 h-4 text-primary flex-shrink-0" />
                                <span className="truncate">{suggestion.display_name}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">{t('search:filters.priceRange')}</label>
                <div className="flex items-center gap-2">
                    <div className="relative w-1/2">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-sm">€</span>
                        <input
                            type="text"
                            placeholder={t('search:filters.min')}
                            value={filters.minPrice ? filters.minPrice.toLocaleString('de-DE') : ''}
                            onChange={(e) => handleNumericInputChange('minPrice', e.target.value)}
                            className={`${inputBaseClasses} pl-7`}
                            aria-label={t('search:filters.min') + ' ' + t('search:filters.priceRange')}
                        />
                    </div>
                    <span className="text-neutral-400">-</span>
                    <div className="relative w-1/2">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-sm">€</span>
                        <input
                            type="text"
                            placeholder={t('search:filters.max')}
                            value={filters.maxPrice ? filters.maxPrice.toLocaleString('de-DE') : ''}
                             onChange={(e) => handleNumericInputChange('maxPrice', e.target.value)}
                            className={`${inputBaseClasses} pl-7`}
                            aria-label={t('search:filters.max') + ' ' + t('search:filters.priceRange')}
                        />
                    </div>
                </div>
            </div>

            <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">{t('search:filters.areaRange')}</label>
                <div className="flex items-center gap-2">
                    <div className="relative w-1/2">
                        <input
                            type="text"
                            placeholder={t('search:filters.min')}
                             value={filters.minSqft ? filters.minSqft.toLocaleString('de-DE') : ''}
                             onChange={(e) => handleNumericInputChange('minSqft', e.target.value)}
                             className={`${inputBaseClasses} pr-8`}
                             aria-label={t('search:filters.min') + ' ' + t('search:filters.areaRange')}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 text-sm">m²</span>
                    </div>
                    <span className="text-neutral-400">-</span>
                    <div className="relative w-1/2">
                        <input
                            type="text"
                            placeholder={t('search:filters.max')}
                            value={filters.maxSqft ? filters.maxSqft.toLocaleString('de-DE') : ''}
                            onChange={(e) => handleNumericInputChange('maxSqft', e.target.value)}
                            className={`${inputBaseClasses} pr-8`}
                            aria-label={t('search:filters.max') + ' ' + t('search:filters.areaRange')}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 text-sm">m²</span>
                    </div>
                </div>
            </div>

            {/* Price per m² Range */}
            <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">{t('search:filters.pricePerSqm', 'Price per m²')}</label>
                <div className="flex items-center gap-2">
                    <div className="relative w-1/2">
                        <input
                            type="text"
                            placeholder={t('search:filters.min')}
                            value={filters.minPricePerSqm ? filters.minPricePerSqm.toLocaleString('de-DE') : ''}
                            onChange={(e) => handleNumericInputChange('minPricePerSqm' as keyof Filters, e.target.value)}
                            className={`${inputBaseClasses} pr-12`}
                            aria-label={t('search:filters.min') + ' ' + t('search:filters.pricePerSqm', 'Price per m²')}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 text-[10px]">€/m²</span>
                    </div>
                    <span className="text-neutral-400">-</span>
                    <div className="relative w-1/2">
                        <input
                            type="text"
                            placeholder={t('search:filters.max')}
                            value={filters.maxPricePerSqm ? filters.maxPricePerSqm.toLocaleString('de-DE') : ''}
                            onChange={(e) => handleNumericInputChange('maxPricePerSqm' as keyof Filters, e.target.value)}
                            className={`${inputBaseClasses} pr-12`}
                            aria-label={t('search:filters.max') + ' ' + t('search:filters.pricePerSqm', 'Price per m²')}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 text-[10px]">€/m²</span>
                    </div>
                </div>
            </div>

            {/* Days on Market */}
            <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">{t('search:filters.daysOnMarket', 'Listed within')}</label>
                <select
                    value={filters.maxDaysListed !== null ? filters.maxDaysListed : ''}
                    onChange={(e) => onFilterChange('maxDaysListed', e.target.value ? parseInt(e.target.value) : null)}
                    className={inputBaseClasses}
                >
                    <option value="">{t('search:options.any')}</option>
                    <option value="1">{t('search:filters.last24h', 'Last 24 hours')}</option>
                    <option value="3">{t('search:filters.last3Days', 'Last 3 days')}</option>
                    <option value="7">{t('search:filters.last7Days', 'Last 7 days')}</option>
                    <option value="30">{t('search:filters.last30Days', 'Last 30 days')}</option>
                </select>
            </div>

            {/* Price Change Filters */}
            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={() => onFilterChange('hasDiscount', filters.hasDiscount === true ? null : true)}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium border transition-colors flex items-center justify-center gap-1.5 ${
                        filters.hasDiscount === true
                            ? 'bg-red-50 border-red-300 text-red-700'
                            : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                    }`}
                >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                    {t('search:filters.priceReduced', 'Price Reduced')}
                </button>
                <button
                    type="button"
                    onClick={() => onFilterChange('hasPriceIncrease', filters.hasPriceIncrease === true ? null : true)}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium border transition-colors flex items-center justify-center gap-1.5 ${
                        filters.hasPriceIncrease === true
                            ? 'bg-amber-50 border-amber-300 text-amber-700'
                            : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                    }`}
                >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                    {t('search:filters.priceIncreased', 'Price Increased')}
                </button>
            </div>

            <div className="border-t border-neutral-200 pt-4">
                <button type="button" onClick={() => setIsAdvancedOpen(!isAdvancedOpen)} className="w-full flex justify-between items-center text-left">
                    <h3 className="text-sm font-semibold text-neutral-800">{t('search:filters.advancedFilters')}</h3>
                    {isAdvancedOpen ? <ChevronUpIcon className="w-5 h-5 text-neutral-500" /> : <ChevronDownIcon className="w-5 h-5 text-neutral-500" />}
                </button>

                {isAdvancedOpen && (
                    <div className="pt-4 space-y-4 animate-fade-in">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <FilterButtonGroup
                                label={t('search:filters.bedrooms')}
                                options={[ {value: null, label: t('search:options.any')}, {value: 1, label: '1+'}, {value: 2, label: '2+'}, {value: 3, label: '3+'}, {value: 4, label: '4+'}, ]}
                                selectedValue={filters.beds}
                                onChange={(value) => onFilterChange('beds', value)}
                            />
                            <FilterButtonGroup
                                label={t('search:filters.bathrooms')}
                                options={[ {value: null, label: t('search:options.any')}, {value: 1, label: '1+'}, {value: 2, label: '2+'}, {value: 3, label: '3+'}, ]}
                                selectedValue={filters.baths}
                                onChange={(value) => onFilterChange('baths', value)}
                            />
                            <FilterButtonGroup
                                label={t('search:filters.livingRooms')}
                                options={[ {value: null, label: t('search:options.any')}, {value: 1, label: '1+'}, {value: 2, label: '2+'}, ]}
                                selectedValue={filters.livingRooms}
                                onChange={(value) => onFilterChange('livingRooms', value)}
                            />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <FilterButtonGroup
                                label={t('search:filters.listingType')}
                                options={[ {value: 'any', label: t('search:listingTypes.any')}, {value: 'agent', label: t('search:listingTypes.agent')}, {value: 'private', label: t('search:listingTypes.private')}, ]}
                                selectedValue={filters.sellerType}
                                onChange={(value) => onFilterChange('sellerType', (value as SellerType) || 'any')}
                            />
                            <FilterButtonGroup
                                label={t('search:filters.propertyType')}
                                options={[ { value: 'any', label: t('search:propertyTypes.any') }, { value: 'house', label: t('search:propertyTypes.house') }, { value: 'apartment', label: t('search:propertyTypes.apartment') }, { value: 'villa', label: t('search:propertyTypes.villa') }, { value: 'land', label: t('search:propertyTypes.land') }, ]}
                                selectedValue={filters.propertyType}
                                onChange={(value) => onFilterChange('propertyType', (value as Filters['propertyType']) || 'any')}
                            />
                        </div>

                        {/* Year Built */}
                        <div>
                            <label className="block text-xs font-medium text-neutral-700 mb-1">{t('search:filters.yearBuilt')}</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    placeholder={t('search:filters.minYear')}
                                    value={filters.minYearBuilt || ''}
                                    onChange={(e) => onFilterChange('minYearBuilt', e.target.value ? parseInt(e.target.value) : null)}
                                    className={inputBaseClasses}
                                />
                                <span className="text-neutral-400">-</span>
                                <input
                                    type="number"
                                    placeholder={t('search:filters.maxYear')}
                                    value={filters.maxYearBuilt || ''}
                                    onChange={(e) => onFilterChange('maxYearBuilt', e.target.value ? parseInt(e.target.value) : null)}
                                    className={inputBaseClasses}
                                />
                            </div>
                        </div>

                        {/* Parking */}
                        <FilterButtonGroup
                            label={t('search:filters.parkingSpaces')}
                            options={[
                                {value: null, label: t('search:options.any')},
                                {value: 1, label: '1+'},
                                {value: 2, label: '2+'},
                                {value: 3, label: '3+'}
                            ]}
                            selectedValue={filters.minParking}
                            onChange={(value) => onFilterChange('minParking', value)}
                        />

                        {/* Furnishing Status */}
                        <div>
                            <label className="block text-xs font-medium text-neutral-700 mb-1">{t('search:filters.furnishing')}</label>
                            <select
                                value={filters.furnishing}
                                onChange={(e) => onFilterChange('furnishing', e.target.value as FurnishingStatus)}
                                className={inputBaseClasses}
                            >
                                <option value="any">{t('search:furnishingOptions.any')}</option>
                                <option value="furnished">{t('search:furnishingOptions.furnished')}</option>
                                <option value="semi-furnished">{t('search:furnishingOptions.semi-furnished')}</option>
                                <option value="unfurnished">{t('search:furnishingOptions.unfurnished')}</option>
                            </select>
                        </div>

                        {/* Heating Type */}
                        <div>
                            <label className="block text-xs font-medium text-neutral-700 mb-1">{t('search:filters.heating')}</label>
                            <select
                                value={filters.heatingType}
                                onChange={(e) => onFilterChange('heatingType', e.target.value as HeatingType)}
                                className={inputBaseClasses}
                            >
                                <option value="any">{t('search:heatingOptions.any')}</option>
                                <option value="central">{t('search:heatingOptions.central')}</option>
                                <option value="electric">{t('search:heatingOptions.electric')}</option>
                                <option value="gas">{t('search:heatingOptions.gas')}</option>
                                <option value="oil">{t('search:heatingOptions.oil')}</option>
                                <option value="heat-pump">{t('search:heatingOptions.heat-pump')}</option>
                                <option value="solar">{t('search:heatingOptions.solar')}</option>
                                <option value="wood">{t('search:heatingOptions.wood')}</option>
                                <option value="none">{t('search:heatingOptions.none')}</option>
                            </select>
                        </div>

                        {/* Property Condition */}
                        <div>
                            <label className="block text-xs font-medium text-neutral-700 mb-1">{t('search:filters.condition')}</label>
                            <select
                                value={filters.condition}
                                onChange={(e) => onFilterChange('condition', e.target.value as PropertyCondition)}
                                className={inputBaseClasses}
                            >
                                <option value="any">{t('search:conditionOptions.any')}</option>
                                <option value="new">{t('search:conditionOptions.new')}</option>
                                <option value="excellent">{t('search:conditionOptions.excellent')}</option>
                                <option value="good">{t('search:conditionOptions.good')}</option>
                                <option value="fair">{t('search:conditionOptions.fair')}</option>
                                <option value="needs-renovation">{t('search:conditionOptions.needs-renovation')}</option>
                            </select>
                        </div>

                        {/* View Type */}
                        <div>
                            <label className="block text-xs font-medium text-neutral-700 mb-1">{t('search:filters.viewType')}</label>
                            <select
                                value={filters.viewType}
                                onChange={(e) => onFilterChange('viewType', e.target.value as ViewType)}
                                className={inputBaseClasses}
                            >
                                <option value="any">{t('search:viewOptions.any')}</option>
                                <option value="sea">{t('search:viewOptions.sea')}</option>
                                <option value="mountain">{t('search:viewOptions.mountain')}</option>
                                <option value="city">{t('search:viewOptions.city')}</option>
                                <option value="park">{t('search:viewOptions.park')}</option>
                                <option value="garden">{t('search:viewOptions.garden')}</option>
                                <option value="street">{t('search:viewOptions.street')}</option>
                            </select>
                        </div>

                        {/* Energy Rating */}
                        <div>
                            <label className="block text-xs font-medium text-neutral-700 mb-1">{t('search:filters.energyRating')}</label>
                            <select
                                value={filters.energyRating}
                                onChange={(e) => onFilterChange('energyRating', e.target.value as EnergyRating)}
                                className={inputBaseClasses}
                            >
                                <option value="any">{t('search:options.any')}</option>
                                <option value="A+">A+</option>
                                <option value="A">A</option>
                                <option value="B">B</option>
                                <option value="C">C</option>
                                <option value="D">D</option>
                                <option value="E">E</option>
                                <option value="F">F</option>
                                <option value="G">G</option>
                            </select>
                        </div>

                        {/* Floor Number Range (for apartments) */}
                        <div>
                            <label className="block text-xs font-medium text-neutral-700 mb-1">{t('search:filters.floorNumber')}</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    placeholder={t('search:filters.min')}
                                    value={filters.minFloorNumber !== null ? filters.minFloorNumber : ''}
                                    onChange={(e) => onFilterChange('minFloorNumber', e.target.value ? parseInt(e.target.value) : null)}
                                    className={inputBaseClasses}
                                />
                                <span className="text-neutral-400">-</span>
                                <input
                                    type="number"
                                    placeholder={t('search:filters.max')}
                                    value={filters.maxFloorNumber !== null ? filters.maxFloorNumber : ''}
                                    onChange={(e) => onFilterChange('maxFloorNumber', e.target.value ? parseInt(e.target.value) : null)}
                                    className={inputBaseClasses}
                                />
                            </div>
                        </div>

                        {/* Amenities Toggle Switches */}
                        <div className="space-y-2 p-3 bg-neutral-50 rounded-lg">
                            <h4 className="text-xs font-semibold text-neutral-800 mb-2">{t('search:amenities.title')}</h4>
                            <ToggleSwitch
                                label={t('search:amenities.balcony')}
                                value={filters.hasBalcony}
                                onChange={(value) => onFilterChange('hasBalcony', value)}
                                t={t}
                            />
                            <ToggleSwitch
                                label={t('search:amenities.garden')}
                                value={filters.hasGarden}
                                onChange={(value) => onFilterChange('hasGarden', value)}
                                t={t}
                            />
                            <ToggleSwitch
                                label={t('search:amenities.elevator')}
                                value={filters.hasElevator}
                                onChange={(value) => onFilterChange('hasElevator', value)}
                                t={t}
                            />
                            <ToggleSwitch
                                label={t('search:amenities.security')}
                                value={filters.hasSecurity}
                                onChange={(value) => onFilterChange('hasSecurity', value)}
                                t={t}
                            />
                            <ToggleSwitch
                                label={t('search:amenities.airConditioning')}
                                value={filters.hasAirConditioning}
                                onChange={(value) => onFilterChange('hasAirConditioning', value)}
                                t={t}
                            />
                            <ToggleSwitch
                                label={t('search:amenities.pool')}
                                value={filters.hasPool}
                                onChange={(value) => onFilterChange('hasPool', value)}
                                t={t}
                            />
                            <ToggleSwitch
                                label={t('search:amenities.petsAllowed')}
                                value={filters.petsAllowed}
                                onChange={(value) => onFilterChange('petsAllowed', value)}
                                t={t}
                            />
                            <ToggleSwitch
                                label={t('search:amenities.has360Tour')}
                                value={filters.has360Tour}
                                onChange={(value) => onFilterChange('has360Tour', value)}
                                t={t}
                            />
                        </div>

                        {/* Distance Filters */}
                        <div className="space-y-2 p-3 bg-neutral-50 rounded-lg">
                            <h4 className="text-xs font-semibold text-neutral-800 mb-2">{t('search:distance.title')}</h4>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs text-neutral-600 mb-1">{t('search:distance.toCenter')}</label>
                                    <input
                                        type="number"
                                        placeholder={t('search:distance.maxKm')}
                                        value={filters.maxDistanceToCenter !== null ? filters.maxDistanceToCenter : ''}
                                        onChange={(e) => onFilterChange('maxDistanceToCenter', e.target.value ? parseFloat(e.target.value) : null)}
                                        className={inputBaseClasses}
                                        step="0.1"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-neutral-600 mb-1">{t('search:distance.toSea')}</label>
                                    <input
                                        type="number"
                                        placeholder={t('search:distance.maxKm')}
                                        value={filters.maxDistanceToSea !== null ? filters.maxDistanceToSea : ''}
                                        onChange={(e) => onFilterChange('maxDistanceToSea', e.target.value ? parseFloat(e.target.value) : null)}
                                        className={inputBaseClasses}
                                        step="0.1"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-neutral-600 mb-1">{t('search:distance.toSchool')}</label>
                                    <input
                                        type="number"
                                        placeholder={t('search:distance.maxKm')}
                                        value={filters.maxDistanceToSchool !== null ? filters.maxDistanceToSchool : ''}
                                        onChange={(e) => onFilterChange('maxDistanceToSchool', e.target.value ? parseFloat(e.target.value) : null)}
                                        className={inputBaseClasses}
                                        step="0.1"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-neutral-600 mb-1">{t('search:distance.toHospital')}</label>
                                    <input
                                        type="number"
                                        placeholder={t('search:distance.maxKm')}
                                        value={filters.maxDistanceToHospital !== null ? filters.maxDistanceToHospital : ''}
                                        onChange={(e) => onFilterChange('maxDistanceToHospital', e.target.value ? parseFloat(e.target.value) : null)}
                                        className={inputBaseClasses}
                                        step="0.1"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Amenities Filter */}
                        <div className="space-y-2 p-3 bg-neutral-50 rounded-lg">
                            <h4 className="text-xs font-semibold text-neutral-800 mb-2">{t('search:amenities.title')}</h4>
                            <div>
                                <input
                                    type="text"
                                    placeholder={t('search:amenities.placeholder')}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            const input = e.currentTarget;
                                            const value = input.value.trim().toLowerCase();
                                            if (value && !filters.amenities.includes(value)) {
                                                onFilterChange('amenities', [...filters.amenities, value]);
                                            }
                                            input.value = '';
                                        }
                                    }}
                                    className={inputBaseClasses}
                                />
                                {filters.amenities.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {filters.amenities.map((amenity) => (
                                            <div
                                                key={amenity}
                                                className="flex items-center gap-1 bg-primary-light text-primary-dark text-xs font-semibold px-2 py-1 rounded-full"
                                            >
                                                <span>#{amenity}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        onFilterChange('amenities', filters.amenities.filter(a => a !== amenity));
                                                    }}
                                                    className="text-primary-dark/70 hover:text-primary-dark"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

        </div>
    );
};


const ITEMS_PER_PAGE = 20;

// Wrapper for property cards - memoized to prevent re-renders on parent state changes
const AnimatedPropertyCard = memo<{
  property: Property;
  index: number;
  onHover?: (id: string | null) => void;
  isNew?: boolean;
  animateEntrance?: boolean;
}>(({ property, index, onHover, animateEntrance }) => {
  // Stagger delay: cap total cascade at 1.2s, each card 60ms apart
  const entranceDelay = animateEntrance ? Math.min(index * 60, 1200) : 0;
  return (
    <div
      className={animateEntrance ? 'card-entrance-fly' : 'property-card-container'}
      style={animateEntrance ? { '--card-delay': `${entranceDelay}ms` } as React.CSSProperties : undefined}
      onMouseEnter={() => onHover?.(property.id)}
      onMouseLeave={() => onHover?.(null)}
    >
      <PropertyCard property={property} />
    </div>
  );
});

// CSS for property card transitions
const PropertyListStyles = () => (
  <style>{`
    /* Layout and style containment only — deliberately NOT paint.
       Paint containment clips a child to this box, and the card paints
       outside it on hover: it lifts 6px and casts a shadow past all four
       edges. With paint containment the lift was sliced off flat, squaring
       the rounded top corners and leaving a hard grey band where the top
       edge and its shadow should be. content-visibility: auto implies paint
       containment too, so it cannot come back either; the list is paginated
       at ITEMS_PER_PAGE, so it was never carrying much of the load. */
    .property-card-container {
      contain: layout style;
    }

    .property-grid-loading {
      opacity: 0.6;
      pointer-events: none;
    }

    @keyframes cardSlideUp {
      0% {
        opacity: 0;
        transform: translateY(40px) scale(0.97);
      }
      50% {
        opacity: 1;
      }
      75% {
        transform: translateY(-4px) scale(1.01);
      }
      100% {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .card-entrance-fly {
      opacity: 0;
      animation: cardSlideUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards;
      animation-delay: var(--card-delay, 0ms);
    }
  `}</style>
);

const PropertyList = memo<PropertyListProps>((props) => {
    const { t } = useTranslation(['search', 'common']);

    // Use props instead of useAppContext() to avoid re-rendering the
    // entire property list when unrelated context state changes (e.g. savedHomes).
    const { properties, filters, onSortChange, isMobile, showFilters, showList, searchMode, onSearchModeChange, onApplyAiFilters, aiChatHistory, onAiChatHistoryChange, onPropertyHover, onResetFilters, onSearchClick, onSaveSearch, isSaving, isSearchingLocation, isLoadingProperties = false, isAuthenticated = false, onOpenAuthModal } = props;

    const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
    const loadMoreRef = useRef(null);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [isFiltersCollapsed, setIsFiltersCollapsed] = useState(true);

    // Count active basic filters (shown in collapse toggle badge)
    const activeBasicFilterCount = [
        filters.query,
        filters.minPrice,
        filters.maxPrice,
        filters.minSqft,
        filters.maxSqft,
        filters.minPricePerSqm,
        filters.maxPricePerSqm,
        filters.maxDaysListed,
        filters.hasDiscount,
        filters.hasPriceIncrease,
    ].filter(v => v !== null && v !== undefined && v !== '' && v !== false).length;

    // Entrance animation: check if splash screen just completed
    const [animateCards, setAnimateCards] = useState(() => {
      const splashDone = (window as any).__balkanestateSplashDone;
      return !!(splashDone && Date.now() - splashDone < 8000);
    });
    useEffect(() => {
      if (!animateCards) return;
      const timer = setTimeout(() => setAnimateCards(false), 2500);
      return () => clearTimeout(timer);
    }, [animateCards]);

    // Reset pagination only when the user's filter criteria change,
    // NOT on every map move (which changes the properties array reference).
    // Memoized so JSON.stringify only runs when filters reference changes, not on every
    // internal state change (visibleCount, isLoadingMore, etc.).
    const filtersKey = useMemo(() => JSON.stringify(filters), [filters]);
    useEffect(() => {
      setVisibleCount(ITEMS_PER_PAGE);
    }, [filtersKey]);

    // Show skeleton placeholders briefly when search filters change,
    // so users see a clear "refreshing" signal instead of an instant jump.
    const [isSearchFiltering, setIsSearchFiltering] = useState(false);
    const [animateFilteredCards, setAnimateFilteredCards] = useState(false);
    const isFirstFilterRender = useRef(true);
    const filteringTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => {
      if (isFirstFilterRender.current) {
        isFirstFilterRender.current = false;
        return;
      }
      setIsSearchFiltering(true);
      setAnimateFilteredCards(false);
      if (filteringTimer.current) clearTimeout(filteringTimer.current);
      filteringTimer.current = setTimeout(() => {
        setIsSearchFiltering(false);
        setAnimateFilteredCards(true);
      }, 800);
      return () => {
        if (filteringTimer.current) clearTimeout(filteringTimer.current);
      };
    }, [filtersKey]);
    useEffect(() => {
      if (!animateFilteredCards) return;
      const t = setTimeout(() => setAnimateFilteredCards(false), 2000);
      return () => clearTimeout(t);
    }, [animateFilteredCards]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && !isLoadingMore && visibleCount < properties.length) {
                    setIsLoadingMore(true);
                    setTimeout(() => {
                        setVisibleCount(prev => prev + ITEMS_PER_PAGE);
                        setIsLoadingMore(false);
                    }, 400);
                }
            },
            // threshold 0 fires as soon as the sentinel enters the viewport,
            // giving a head-start so skeletons appear before the user hits the true bottom
            { threshold: 0, rootMargin: '200px' }
        );

        const currentRef = loadMoreRef.current;
        if (currentRef) {
            observer.observe(currentRef);
        }

        return () => {
            if (currentRef) {
                observer.unobserve(currentRef);
            }
        };
    }, [visibleCount, properties.length, isLoadingMore]);
    
    const inputBaseClasses = "block w-full text-xs bg-white border border-neutral-300 rounded-lg text-neutral-900 shadow-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors";
    
    // Desktop layout
    if (!isMobile) {
        return (
            <div className="flex flex-col h-full bg-transparent">
                {/* TOP CONTROLS SECTION */}
                <div className={`${searchMode === 'ai' ? 'flex flex-col' : 'flex-shrink-0'} border-b border-neutral-200`} style={searchMode === 'ai' ? { flex: '1 1 50%', minHeight: 0 } : undefined}>
                    <div className="p-4 pb-2 flex-shrink-0">
                        <div className="bg-neutral-100 p-1 rounded-full flex items-center space-x-1 border border-neutral-200 shadow-sm max-w-sm mx-auto">
                            <button onClick={() => onSearchModeChange('manual')} className={`w-1/2 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${searchMode === 'manual' ? 'bg-white text-primary shadow' : 'text-neutral-600 hover:bg-neutral-200'}`}>{t('search:title')}</button>
                            {isAuthenticated ? (
                                <button onClick={() => onSearchModeChange('ai')} className={`w-1/2 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${searchMode === 'ai' ? 'bg-white text-primary shadow' : 'text-neutral-600 hover:bg-neutral-200'}`}> {t('search:ai.title')}</button>
                            ) : (
                                <button onClick={() => onOpenAuthModal?.()} className="w-1/2 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2 text-neutral-600 hover:bg-neutral-200" title="Sign in to access AI search">
                                     {t('search:ai.title')}
                                </button>
                            )}
                        </div>
                    </div>

                    {searchMode === 'manual' && (
                        <div className="px-4 pt-2 pb-1 flex-shrink-0">
                            <button
                                type="button"
                                onClick={() => setIsFiltersCollapsed(!isFiltersCollapsed)}
                                className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-neutral-50 border border-neutral-200 hover:bg-neutral-100 transition-colors"
                                aria-expanded={!isFiltersCollapsed}
                                aria-controls="desktop-filter-panel"
                            >
                                <div className="flex items-center gap-2">
                                    <AdjustmentsHorizontalIcon className="w-4 h-4 text-neutral-600" />
                                    <span className="text-sm font-semibold text-neutral-700">{t('search:filters.filters', 'Filters')}</span>
                                    {isFiltersCollapsed && activeBasicFilterCount > 0 && (
                                        <span className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white bg-primary rounded-full">
                                            {activeBasicFilterCount}
                                        </span>
                                    )}
                                </div>
                                <ChevronDownIcon className={`w-4 h-4 text-neutral-500 transition-transform duration-300 ${isFiltersCollapsed ? '' : 'rotate-180'}`} />
                            </button>
                        </div>
                    )}

                    {searchMode === 'manual' ? (
                        <div
                            id="desktop-filter-panel"
                            className="relative z-[60] overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out"
                            style={isFiltersCollapsed
                                ? { maxHeight: 0, opacity: 0 }
                                : { maxHeight: '50vh', opacity: 1 }
                            }
                        >
                            <div className="px-4 pb-4 overflow-y-auto" style={{ maxHeight: '50vh' }}>
                                <FilterControls {...props} />
                            </div>
                        </div>
                    ) : (
                        <div className="relative z-[60] flex-grow min-h-0">
                            <div className="px-4 pb-4 h-full">
                                <AiSearch
                                    properties={properties}
                                    onApplyFilters={onApplyAiFilters}
                                    isMobile={isMobile}
                                    history={aiChatHistory}
                                    onHistoryChange={onAiChatHistoryChange}
                                />
                            </div>
                        </div>
                    )}

                    {/* Action buttons - always visible outside collapsible panel */}
                    {searchMode === 'manual' && (
                        <div className="px-4 py-2 flex-shrink-0 space-y-2">
                            <button
                                onClick={onSearchClick}
                                disabled={isSearchingLocation}
                                className="w-full py-2.5 px-4 bg-primary text-white font-bold rounded-lg shadow-md hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-wait flex items-center justify-center gap-2"
                            >
                                {isSearchingLocation ? (
                                    <>
                                        <SpinnerIcon className="w-5 h-5" />
                                        <span>{t('search:ai.searching')}</span>
                                    </>
                                ) : (
                                    t('search:searchButton')
                                )}
                            </button>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={onResetFilters}
                                    className="flex-1 py-2 px-4 border border-neutral-300 text-neutral-600 rounded-lg text-sm font-bold bg-white hover:bg-neutral-100 transition-colors"
                                    aria-label={t('search:filters.resetFilters')}
                                >
                                    {t('search:filters.resetFilters')}
                                </button>
                                <button
                                    onClick={onSaveSearch}
                                    disabled={isSaving}
                                    className="flex-1 py-2 px-4 border border-primary text-primary rounded-lg text-sm font-bold bg-white hover:bg-primary-light disabled:opacity-50 disabled:cursor-wait flex items-center justify-center gap-2 transition-colors"
                                >
                                    {isSaving ? (
                                        <>
                                            <svg className="animate-spin h-4 w-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            {t('search:ai.searching')}
                                        </>
                                    ) : (
                                        t('search:savedSearch.saveSearch')
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* PROPERTY LIST SECTION */}
                <div className="overflow-hidden relative z-0" style={{ flex: searchMode === 'ai' ? '1 1 50%' : '1 1 auto', minHeight: searchMode === 'ai' ? '40%' : 0 }}>
                    <div className="h-full overflow-y-auto overflow-x-hidden">
                        <div className="p-4 border-b border-neutral-200 flex items-center justify-between sticky top-0 bg-white z-[100]">
                            <p className="text-xs text-neutral-500 font-semibold">{t('search:resultsFound', { count: properties.length })}</p>
                            <div className="relative z-[101]">
                                <select
                                    id="sortBy"
                                    name="sortBy"
                                    value={filters.sortBy}
                                    onChange={(e) => onSortChange(e.target.value)}
                                    aria-label={t('search:filters.sortBy', 'Sort properties by')}
                                    className={`${inputBaseClasses} appearance-none pr-8 text-xs !py-1.5`}
                                >
                                    <option value="newest">{t('search:sort.newest')}</option>
                                    <option value="oldest">{t('search:sort.oldest')}</option>
                                    <option value="price_asc">{t('search:sort.priceAsc')}</option>
                                    <option value="price_desc">{t('search:sort.priceDesc')}</option>
                                    <option value="beds_desc">{t('search:sort.bedsDesc')}</option>
                                    <option value="baths_desc">{t('search:sort.bathsDesc')}</option>
                                    <option value="sqft_desc">{t('search:sort.areaDesc')}</option>
                                    <option value="sqft_asc">{t('search:sort.areaAsc')}</option>
                                    <option value="year_built_desc">{t('search:sort.yearBuiltDesc')}</option>
                                    <option value="featured">{t('search:sort.featured')}</option>
                                    <option value="price_reduced">{t('search:sort.priceReduced')}</option>
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-neutral-500">
                                    <svg className="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 md:p-3 relative z-0">
                            <PropertyListStyles />
                            {(isLoadingProperties || isSearchFiltering) ? (
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 xl:gap-8">
                                    {Array.from({ length: 6 }).map((_, index) => (
                                        <PropertyCardSkeleton key={index} index={index} />
                                    ))}
                                </div>
                            ) : properties.length > 0 ? (
                                <>
                                    <HighlightedPropertiesSection properties={properties} />
                                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 xl:gap-8 property-grid-transition">
                                        {properties.slice(0, visibleCount).map((prop, index) => (
                                            <AnimatedPropertyCard
                                                key={prop.id || `prop-${index}`}
                                                property={prop}
                                                index={index}
                                                onHover={onPropertyHover}
                                                animateEntrance={animateCards || animateFilteredCards}
                                            />
                                        ))}
                                    </div>
                                    {/* Below the cards, outside the grid — a slot inside it would
                                        be mistaken for a listing and would break the row heights. */}
                                    <AdBanner placement="searchList" spacing="compact" />
                                    {visibleCount < properties.length && (
                                        <div ref={loadMoreRef}>
                                            {isLoadingMore && (
                                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 xl:gap-8 mt-4">
                                                    {Array.from({ length: Math.min(ITEMS_PER_PAGE, properties.length - visibleCount) }).map((_, i) => (
                                                        <PropertyCardSkeleton key={i} index={i} />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div
                                    className="text-center py-16 px-6 rounded-2xl relative overflow-hidden"
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.7)',
                                        backdropFilter: 'blur(20px)',
                                        WebkitBackdropFilter: 'blur(20px)',
                                        boxShadow: '0 8px 32px rgba(31, 38, 135, 0.12), inset 0 0 60px rgba(255, 255, 255, 0.3), -6px 0 20px rgba(31, 38, 135, 0.06), 6px 0 20px rgba(31, 38, 135, 0.06)',
                                    }}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-blue-50/20 pointer-events-none" />
                                    <div className="relative z-10">
                                        <BuildingLibraryIcon className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                                        <h3 className="text-xl font-semibold text-neutral-800">{t('search:results.noResults')}</h3>
                                        <p className="text-neutral-500 mt-2 mb-6">{t('search:results.tryDifferent')}</p>
                                        <button
                                            onClick={onResetFilters}
                                            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-all shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5"
                                        >
                                            <XCircleIcon className="w-5 h-5" />
                                            {t('search:filters.resetFilters', 'Reset Filters')}
                                        </button>
                                        <p className="text-xs text-neutral-400 mt-3">{t('search:results.resetHint', 'Reset filters to see all properties in this area')}</p>
                                    </div>
                                </div>
                            )}
                            {/* Footer - Integrated at bottom of property list */}
                            <div className="mt-8 overflow-x-hidden">
                                <Footer contained />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    
    // Mobile Layout
    return (
        <div className="flex flex-col bg-white h-full" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 70px)' }}>
            {showFilters && (
                 <div className="p-4 flex-shrink-0">
                    <div className="bg-neutral-100 p-1 rounded-full flex items-center space-x-1 border border-neutral-200 shadow-sm max-w-sm mx-auto">
                        <button onClick={() => onSearchModeChange('manual')} className={`w-1/2 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${searchMode === 'manual' ? 'bg-white text-primary shadow' : 'text-neutral-600 hover:bg-neutral-200'}`}>{t('search:title')}</button>
                        {isAuthenticated ? (
                            <button onClick={() => onSearchModeChange('ai')} className={`w-1/2 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${searchMode === 'ai' ? 'bg-white text-primary shadow' : 'text-neutral-600 hover:bg-neutral-200'}`}> {t('search:ai.title')}</button>
                        ) : (
                            <button onClick={() => onOpenAuthModal?.()} className="w-1/2 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2 text-neutral-600 hover:bg-neutral-200" title="Sign in to access AI search"> {t('search:ai.title')}</button>
                        )}
                    </div>
                </div>
            )}

            {searchMode === 'ai' && showFilters ? (
                <div className="flex-grow min-h-0">
                    <AiSearch
                        properties={properties}
                        onApplyFilters={onApplyAiFilters}
                        isMobile={isMobile}
                        history={aiChatHistory}
                        onHistoryChange={onAiChatHistoryChange}
                    />
                </div>
            ) : (
                <>
                    {showFilters && (
                        <div className="p-4 flex-shrink-0 relative z-[60]">
                            <FilterControls {...props} />
                        </div>
                    )}

                    {showList && (
                        <div className="flex-grow min-h-0 overflow-y-auto relative z-0">
                            <div className="p-4 border-b border-neutral-200 flex items-center justify-between sticky top-0 bg-white z-[100]">
                                <p className="text-xs text-neutral-500 font-semibold">{t('search:resultsFound', { count: properties.length })}</p>
                                <div className="relative z-[101]">
                                    <select
                                        id="sortBy"
                                        name="sortBy"
                                        value={filters.sortBy}
                                        onChange={(e) => onSortChange(e.target.value)}
                                        className={`${inputBaseClasses} appearance-none pr-8 text-xs !py-1.5`}
                                    >
                                        <option value="newest">{t('search:sort.newest')}</option>
                                        <option value="oldest">{t('search:sort.oldest')}</option>
                                        <option value="price_asc">{t('search:sort.priceAsc')}</option>
                                        <option value="price_desc">{t('search:sort.priceDesc')}</option>
                                        <option value="beds_desc">{t('search:sort.bedsDesc')}</option>
                                        <option value="baths_desc">{t('search:sort.bathsDesc')}</option>
                                        <option value="sqft_desc">{t('search:sort.areaDesc')}</option>
                                        <option value="sqft_asc">{t('search:sort.areaAsc')}</option>
                                        <option value="year_built_desc">{t('search:sort.yearBuiltDesc')}</option>
                                        <option value="featured">{t('search:sort.featured')}</option>
                                        <option value="price_reduced">{t('search:sort.priceReduced')}</option>
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-neutral-500">
                                        <svg className="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 md:p-3 relative z-0">
                                <PropertyListStyles />
                                {isLoadingProperties ? (
                                    <div className="grid grid-cols-1 gap-6">
                                        {Array.from({ length: 4 }).map((_, index) => (
                                            <PropertyCardSkeleton key={index} index={index} />
                                        ))}
                                    </div>
                                ) : properties.length > 0 ? (
                                    <>
                                        <HighlightedPropertiesSection properties={properties} />
                                        <div className="grid grid-cols-1 gap-6 property-grid-transition">
                                            {properties.slice(0, visibleCount).map((prop, index) => (
                                                <AnimatedPropertyCard
                                                    key={prop.id || `prop-${index}`}
                                                    property={prop}
                                                    index={index}
                                                    onHover={onPropertyHover}
                                                    animateEntrance={animateCards || animateFilteredCards}
                                                />
                                            ))}
                                        </div>
                                        {/* Below the cards, outside the grid — a slot inside it would
                                            be mistaken for a listing and would break the row heights. */}
                                        <AdBanner placement="searchList" spacing="compact" />
                                        {visibleCount < properties.length && (
                                            <div ref={loadMoreRef}>
                                                {isLoadingMore && (
                                                    <div className="grid grid-cols-1 gap-6 mt-4 px-4">
                                                        {Array.from({ length: Math.min(ITEMS_PER_PAGE, properties.length - visibleCount) }).map((_, i) => (
                                                            <PropertyCardSkeleton key={i} index={i} />
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div
                                        className="text-center py-16 px-6 rounded-2xl relative overflow-hidden"
                                        style={{
                                            background: 'rgba(255, 255, 255, 0.7)',
                                            backdropFilter: 'blur(20px)',
                                            WebkitBackdropFilter: 'blur(20px)',
                                            boxShadow: '0 8px 32px rgba(31, 38, 135, 0.12), inset 0 0 60px rgba(255, 255, 255, 0.3), -6px 0 20px rgba(31, 38, 135, 0.06), 6px 0 20px rgba(31, 38, 135, 0.06)',
                                        }}
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-blue-50/20 pointer-events-none" />
                                        <div className="relative z-10">
                                            <BuildingLibraryIcon className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                                            <h3 className="text-xl font-semibold text-neutral-800">{t('search:results.noResults')}</h3>
                                            <p className="text-neutral-500 mt-2 mb-6">{t('search:results.tryDifferent')}</p>
                                            <button
                                                onClick={onResetFilters}
                                                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark active:bg-primary-dark transition-all shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 touch-manipulation"
                                            >
                                                <XCircleIcon className="w-5 h-5" />
                                                {t('search:filters.resetFilters', 'Reset Filters')}
                                            </button>
                                            <p className="text-xs text-neutral-400 mt-3">{t('search:results.resetHint', 'Reset filters to see all properties in this area')}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Footer - Integrated at bottom of property list */}
                                <div className="mt-8 overflow-x-hidden">
                                    <Footer contained />
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
});

PropertyList.displayName = 'PropertyList';

export default PropertyList;