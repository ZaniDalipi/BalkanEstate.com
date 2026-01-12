import React, { useCallback, useState, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Property, ChatMessage, AiSearchQuery, Filters, SellerType, FurnishingStatus, HeatingType, PropertyCondition, ViewType, EnergyRating } from '@/types';
import PropertyCard from '@/src/features/property-details/components/PropertyCard';
import { SearchIcon, SparklesIcon, XMarkIcon, BellIcon, BuildingLibraryIcon, ChevronUpIcon, ChevronDownIcon, PencilIcon, XCircleIcon, MapPinIcon, SpinnerIcon } from '@/constants';
import AiSearch from './AiSearch';
import PropertyCardSkeleton from '@/src/features/property-details/components/PropertyCardSkeleton';
import { useAppContext } from '@/context/AppContext';
import Footer from '@/components/shared/Footer';

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
  fallbackLocation?: string | null;
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

const FilterControls: React.FC<Omit<PropertyListProps, 'properties' | 'showList' | 'aiChatHistory' | 'onAiChatHistoryChange'>> = React.memo(({
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
            {!isMobile && (
                <div className="flex items-center gap-2">
                        <button
                            onClick={onResetFilters}
                            className="flex-grow py-2.5 px-4 border border-neutral-300 text-neutral-600 rounded-lg text-sm font-bold bg-white hover:bg-neutral-100 transition-colors"
                        >
                            {t('search:filters.resetFilters')}
                        </button>
                    </div>
            )}

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
                    <ul className="absolute z-30 w-full mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {suggestions.map((suggestion) => (
                            <li
                                key={suggestion.place_id}
                                onMouseDown={() => onSuggestionClick?.(suggestion as any)}
                                className="px-3 py-2 text-xs text-neutral-700 hover:bg-primary/5 cursor-pointer flex items-center gap-2 transition-colors"
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
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 text-sm">m²</span>
                    </div>
                </div>
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
                            <ToggleSwitch
                                label={t('search:amenities.hasDiscount')}
                                value={filters.hasDiscount}
                                onChange={(value) => onFilterChange('hasDiscount', value)}
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

            {!isMobile && (
                 <div className="pt-2 space-y-2">
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
                            onClick={onSaveSearch}
                            disabled={isSaving}
                            className="flex-grow py-2.5 px-4 border border-primary text-primary rounded-lg shadow-sm text-sm font-bold bg-white hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-wait flex items-center justify-center gap-2"
                        >
                            {isSaving ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
    );
});


const ITEMS_PER_PAGE = 20;

const PropertyList: React.FC<PropertyListProps> = (props) => {
    const { t } = useTranslation(['search', 'common']);
    const { state, dispatch } = useAppContext();
    const { isLoadingProperties, isAuthenticated } = state;

    const { properties, filters, onSortChange, isMobile, showFilters, showList, searchMode, onSearchModeChange, onApplyAiFilters, aiChatHistory, onAiChatHistoryChange, onPropertyHover, fallbackLocation } = props;

    const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
    const loadMoreRef = useRef(null);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    // Create stable keys for filters and properties to avoid infinite loops
    const filtersKey = useMemo(() => JSON.stringify(filters), [filters]);
    const propertiesKey = useMemo(() => properties.map(p => p.id).join(','), [properties]);

    useEffect(() => {
      // Reset visible count when filters or properties actually change
      setVisibleCount(ITEMS_PER_PAGE);
    }, [filtersKey, propertiesKey]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && !isLoadingMore && visibleCount < properties.length) {
                    setIsLoadingMore(true);
                    setTimeout(() => {
                        setVisibleCount(prev => prev + ITEMS_PER_PAGE);
                        setIsLoadingMore(false);
                    }, 300); // Small delay to show loading and prevent rapid firing
                }
            },
            { threshold: 1.0 }
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
                <div className="flex-shrink-0 border-b border-neutral-200">
                    <div className="p-4">
                        <div className="bg-neutral-100 p-1 rounded-full flex items-center space-x-1 border border-neutral-200 shadow-sm max-w-sm mx-auto">
                            <button onClick={() => onSearchModeChange('manual')} className={`w-1/2 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${searchMode === 'manual' ? 'bg-white text-primary shadow' : 'text-neutral-600 hover:bg-neutral-200'}`}>{t('search:title')}</button>
                            {isAuthenticated ? (
                                <button onClick={() => onSearchModeChange('ai')} className={`w-1/2 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${searchMode === 'ai' ? 'bg-white text-primary shadow' : 'text-neutral-600 hover:bg-neutral-200'}`}><SparklesIcon className="w-4 h-4" /> {t('search:ai.title')}</button>
                            ) : (
                                <button onClick={() => dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true, view: 'login' } })} className="w-1/2 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2 text-neutral-600 hover:bg-neutral-200" title="Sign in to access AI search">
                                    <SparklesIcon className="w-4 h-4" /> {t('search:ai.title')}
                                </button>
                            )}
                        </div>
                    </div>
                    
                    <div className="px-4 pb-4" style={{ height: '280px' }}>
                        {searchMode === 'manual' ? (
                            <div className="h-full overflow-y-auto pr-2">
                                <FilterControls {...props} />
                            </div>
                        ) : (
                            <div className="h-full">
                                <AiSearch
                                    properties={properties}
                                    onApplyFilters={onApplyAiFilters}
                                    isMobile={isMobile}
                                    history={aiChatHistory}
                                    onHistoryChange={onAiChatHistoryChange}
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* PROPERTY LIST SECTION */}
                <div className="flex-grow min-h-0">
                    <div className="h-full overflow-y-auto">
                        <div className="p-4 border-b border-neutral-200 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-sm z-20">
                            <p className="text-xs text-neutral-500 font-semibold">{t('search:resultsFound', { count: properties.length })}</p>
                            <div className="relative">
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
                                    <option value="area_desc">{t('search:sort.areaDesc')}</option>
                                    <option value="area_asc">{t('search:sort.areaAsc')}</option>
                                    <option value="beds_desc">{t('search:sort.bedsDesc')}</option>
                                    <option value="baths_desc">{t('search:sort.bathsDesc')}</option>
                                    <option value="featured">{t('search:sort.featured')}</option>
                                    <option value="price_per_sqm">{t('search:sort.pricePerSqm')}</option>
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-neutral-500">
                                    <svg className="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 md:p-3">
                            {/* Fallback location message */}
                            {fallbackLocation && !isLoadingProperties && properties.length > 0 && (
                                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
                                    <MapPinIcon className="w-4 h-4 text-amber-600 flex-shrink-0" />
                                    <p className="text-xs text-amber-800">
                                        {t('search:showingNearbyProperties', { location: fallbackLocation })}
                                    </p>
                                </div>
                            )}
                            {isLoadingProperties ? (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-5">
                                    {Array.from({ length: 6 }).map((_, index) => (
                                        <PropertyCardSkeleton key={index} />
                                    ))}
                                </div>
                            ) : properties.length > 0 ? (
                                <>
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-5">
                                        {properties.slice(0, visibleCount).map(prop => (
                                            <div key={prop.id} onMouseEnter={() => onPropertyHover?.(prop.id)} onMouseLeave={() => onPropertyHover?.(null)}>
                                                <PropertyCard property={prop} />
                                            </div>
                                        ))}
                                    </div>
                                    {visibleCount < properties.length && (
                                        <div ref={loadMoreRef} className="text-center p-8 md:p-4">
                                            {isLoadingMore && <span>{t('common:loadingMore')}</span>}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-center py-16 px-4"><h3 className="text-xl font-semibold text-neutral-800">{t('search:results.noResults')}</h3></div>
                            )}

                            {/* Footer */}
                            <div className="mt-8">
                                <Footer />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    
    // Mobile Layout
    return (
        <div className="flex flex-col bg-white h-full pt-20">
            {showFilters && (
                 <div className="p-4 flex-shrink-0">
                    <div className="bg-neutral-100 p-1 rounded-full flex items-center space-x-1 border border-neutral-200 shadow-sm max-w-sm mx-auto">
                        <button onClick={() => onSearchModeChange('manual')} className={`w-1/2 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${searchMode === 'manual' ? 'bg-white text-primary shadow' : 'text-neutral-600 hover:bg-neutral-200'}`}>{t('search:title')}</button>
                        {isAuthenticated ? (
                            <button onClick={() => onSearchModeChange('ai')} className={`w-1/2 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${searchMode === 'ai' ? 'bg-white text-primary shadow' : 'text-neutral-600 hover:bg-neutral-200'}`}><SparklesIcon className="w-4 h-4" /> {t('search:ai.title')}</button>
                        ) : (
                            <button onClick={() => dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true, view: 'login' } })} className="w-1/2 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2 text-neutral-600 hover:bg-neutral-200" title="Sign in to access AI search"><SparklesIcon className="w-4 h-4" /> {t('search:ai.title')}</button>
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
                        <div className="p-4 flex-shrink-0">
                            <FilterControls {...props} />
                        </div>
                    )}

                    {showList && (
                        <div className="flex-grow min-h-0 overflow-y-auto">
                            <div className="p-4 border-b border-neutral-200 flex items-center justify-between sticky top-0 bg-white z-20">
                                <p className="text-xs text-neutral-500 font-semibold">{t('search:resultsFound', { count: properties.length })}</p>
                                <div className="relative">
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
                                        <option value="area_desc">{t('search:sort.areaDesc')}</option>
                                        <option value="area_asc">{t('search:sort.areaAsc')}</option>
                                        <option value="beds_desc">{t('search:sort.bedsDesc')}</option>
                                        <option value="baths_desc">{t('search:sort.bathsDesc')}</option>
                                        <option value="featured">{t('search:sort.featured')}</option>
                                        <option value="price_per_sqm">{t('search:sort.pricePerSqm')}</option>
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-neutral-500">
                                        <svg className="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                                    </div>
                                </div>
                            </div>

                            {/* Mobile: Info banner - show fallback message or map-visible info */}
                            {fallbackLocation ? (
                                <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <MapPinIcon className="w-4 h-4 text-amber-600 flex-shrink-0" />
                                        <p className="text-xs text-amber-800">
                                            {t('search:showingNearbyProperties', { location: fallbackLocation })}
                                        </p>
                                    </div>
                                    <button
                                        onClick={props.onResetFilters}
                                        className="text-xs font-semibold text-amber-600 hover:text-amber-800 underline whitespace-nowrap"
                                    >
                                        {t('search:filters.seeAll', { defaultValue: 'See All' })}
                                    </button>
                                </div>
                            ) : (
                                <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <MapPinIcon className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                        <p className="text-xs text-blue-700">{t('search:mobileMapInfo', { defaultValue: 'Showing properties visible on map' })}</p>
                                    </div>
                                    <button
                                        onClick={props.onResetFilters}
                                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 underline whitespace-nowrap"
                                    >
                                        {t('search:filters.seeAll', { defaultValue: 'See All' })}
                                    </button>
                                </div>
                            )}

                            <div className="p-4 md:p-3">
                                {isLoadingProperties ? (
                                    <div className="grid grid-cols-1 gap-5">
                                        {Array.from({ length: 4 }).map((_, index) => (
                                            <PropertyCardSkeleton key={index} />
                                        ))}
                                    </div>
                                ) : properties.length > 0 ? (
                                    <>
                                        <div className="grid grid-cols-1 gap-5">
                                            {properties.slice(0, visibleCount).map(prop => (
                                                <div key={prop.id} onMouseEnter={() => onPropertyHover?.(prop.id)} onMouseLeave={() => onPropertyHover?.(null)}>
                                                    <PropertyCard property={prop} />
                                                </div>
                                            ))}
                                        </div>
                                        {visibleCount < properties.length && (
                                            <div ref={loadMoreRef} className="text-center p-8">
                                                {isLoadingMore ? (
                                                    <div className="flex justify-center items-center space-x-2 text-neutral-500">
                                                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                                        <span>Loading more...</span>
                                                    </div>
                                                ) : <div className="h-1"></div>}
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="text-center py-16 px-4 bg-neutral-50/70 rounded-lg border">
                                        <BuildingLibraryIcon className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                                        <h3 className="text-xl font-semibold text-neutral-800">{t('search:results.noResults')}</h3>
                                        <p className="text-neutral-500 mt-2">{t('search:results.tryDifferent')}</p>
                                    </div>
                                )}

                                {/* Footer */}
                                <Footer />
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default React.memo(PropertyList);