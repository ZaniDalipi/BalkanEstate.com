import React from 'react';
import { Filters, Property, AiSearchQuery, ChatMessage, NominatimResult } from '@/types';
import { XMarkIcon } from '@/constants';
import { BALKAN_COUNTRIES } from '@/constants/countries';
import PropertyList from './PropertyList';

// Type for props passed to PropertyList (matching its interface)
export interface PropertyListPropsForMobile {
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
    suggestions?: NominatimResult[];
    onSuggestionClick?: (suggestion: NominatimResult) => void;
    isQueryInputFocused?: boolean;
    onQueryInputFocusChange?: (focused: boolean) => void;
    fallbackLocation?: string | null;
}

interface SearchMobileFiltersProps {
    onClose: () => void;
    propertyListProps: PropertyListPropsForMobile;
    localFilters: Filters;
    onLocalFilterChange: <K extends keyof Filters>(name: K, value: Filters[K]) => void;
    onReset: () => void;
    onSave: () => void;
    isSaving: boolean;
    onApply: () => void;
    searchMode: 'manual' | 'ai';
    t: (key: string) => string;
}

const SearchMobileFilters: React.FC<SearchMobileFiltersProps> = ({
    onClose,
    propertyListProps,
    localFilters,
    onLocalFilterChange,
    onReset,
    onSave,
    isSaving,
    onApply,
    searchMode,
    t,
}) => (
    <div className="bg-white h-full w-full flex flex-col" role="dialog" aria-modal="true" aria-labelledby="filters-title">
        {/* Header: top padding must clear the notch/Dynamic Island in standalone PWA mode */}
        <div
            className="flex-shrink-0 px-3 sm:px-4 pb-3 sm:pb-4 border-b border-neutral-200 flex justify-between items-center"
            style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)' }}
        >
            <h2 id="filters-title" className="text-base sm:text-lg font-bold text-neutral-800">{t('search:filters.title')}</h2>
            <button
                onClick={onClose}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-neutral-500 hover:text-neutral-800 rounded-full hover:bg-neutral-100 transition-colors touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                aria-label="Close filters"
            >
                <XMarkIcon className="w-6 h-6" />
            </button>
        </div>
        <div className="flex-shrink-0 p-3 sm:p-4 bg-neutral-50 border-b border-neutral-200 landscape:p-2">
            <label htmlFor="country-select" className="block text-xs font-medium text-neutral-700 mb-1.5 sm:mb-2">{t('search:filters.country')}</label>
            <select
                id="country-select"
                value={localFilters.country}
                onChange={(e) => onLocalFilterChange('country', e.target.value)}
                className="w-full bg-white border border-neutral-300 rounded-lg text-neutral-900 shadow-sm px-3 py-2.5 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors text-sm font-medium"
            >
                <option value="any">{t('search:filters.allCountries')}</option>
                {Object.entries(BALKAN_COUNTRIES).map(([key, country]) => (
                    <option key={key} value={key}>
                        {country.name}
                    </option>
                ))}
            </select>
        </div>
        <div className="flex-grow overflow-y-auto min-h-0 pt-3 sm:pt-4 landscape:pt-2">
            <PropertyList
                {...propertyListProps}
                filters={localFilters}
                onFilterChange={onLocalFilterChange}
                isMobile={true}
                showFilters={true}
                showList={false}
            />
        </div>
        {searchMode === 'manual' && (
            <div className="flex-shrink-0 p-3 sm:p-4 border-t border-neutral-200 bg-white flex items-center gap-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))] landscape:p-2 landscape:pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
                 <button
                    onClick={onReset}
                    className="min-h-[44px] px-3 py-2 border border-neutral-300 rounded-lg text-sm font-semibold text-neutral-700 hover:bg-neutral-100 active:bg-neutral-200 transition-colors touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                 >
                    Reset
                 </button>
                 <button
                    onClick={onSave}
                    disabled={isSaving}
                    className="min-h-[44px] px-3 py-2 border border-neutral-300 rounded-lg text-sm font-semibold text-neutral-700 hover:bg-neutral-100 active:bg-neutral-200 transition-colors disabled:opacity-50 touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                 >
                    {isSaving ? 'Saving...' : 'Save Search'}
                 </button>
                 <button
                    onClick={onApply}
                    className="flex-grow min-h-[44px] px-3 py-2 bg-primary text-white font-bold rounded-lg shadow-md hover:bg-primary-dark active:bg-primary-dark transition-colors touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary/50"
                 >
                    Show Results
                 </button>
            </div>
        )}
    </div>
);

export default SearchMobileFilters;
