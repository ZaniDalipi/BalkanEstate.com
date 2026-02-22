import React from 'react';
import { Filters, NominatimResult } from '@/types';
// Icons are used by the SearchLocationBar child component
import { BALKAN_COUNTRIES } from '@/constants/countries';
import SearchLocationBar from './SearchLocationBar';

interface SearchHeaderProps {
    t: (key: string, defaultValue?: string) => string;
    filters: Filters;
    suggestions: NominatimResult[];
    isQueryInputFocused: boolean;
    isSearchingLocation: boolean;
    searchWrapperRef: React.RefObject<HTMLDivElement>;
    onFilterChange: <K extends keyof Filters>(name: K, value: Filters[K]) => void;
    onSearch: () => void;
    onQueryInputFocusChange: (focused: boolean) => void;
    onSuggestionClick: (suggestion: NominatimResult) => void;
}

const SearchHeader: React.FC<SearchHeaderProps> = ({
    t,
    filters,
    suggestions,
    isQueryInputFocused,
    isSearchingLocation,
    searchWrapperRef,
    onFilterChange,
    onSearch,
    onQueryInputFocusChange,
    onSuggestionClick,
}) => {
    return (
        <div
            className="hidden md:flex p-2 xl:p-3 border-b border-white/40 flex-shrink-0 items-center gap-2 xl:gap-3 relative z-[100] bg-white/70 backdrop-blur-xl"
            style={{
                boxShadow: '0 4px 20px rgba(31, 38, 135, 0.08), inset 0 0 20px rgba(255, 255, 255, 0.3)',
            }}
        >
            <h2 className="text-sm xl:text-base font-semibold text-neutral-800 flex-shrink-0 hidden xl:block">{t('search:propertiesForSale')}</h2>
            {/* Desktop Search Bar */}
            <SearchLocationBar
                filters={filters}
                suggestions={suggestions}
                isQueryInputFocused={isQueryInputFocused}
                isSearchingLocation={isSearchingLocation}
                searchWrapperRef={searchWrapperRef}
                onFilterChange={onFilterChange}
                onSearch={onSearch}
                onQueryInputFocusChange={onQueryInputFocusChange}
                onSuggestionClick={onSuggestionClick}
                variant="desktop"
            />
            <select
                value={filters.country}
                onChange={(e) => onFilterChange('country', e.target.value)}
                aria-label={t('search:filters.allCountries', 'Filter by country')}
                className="hidden xl:block bg-white/60 backdrop-blur-sm border border-white/50 rounded-xl text-neutral-900 text-sm px-3 py-2 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all appearance-none cursor-pointer flex-shrink-0 shadow-sm"
                style={{ backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")", backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em', paddingRight: '2.5rem' }}
            >
                <option value="any">{t('search:filters.allCountries')}</option>
                {Object.entries(BALKAN_COUNTRIES).map(([key, country]) => (
                    <option key={key} value={key}>
                        {country.name}
                    </option>
                ))}
            </select>
        </div>
    );
};

export default SearchHeader;
