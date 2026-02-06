import React from 'react';
import { Filters, NominatimResult } from '@/types';
import { SearchIcon, XMarkIcon, MapPinIcon, SpinnerIcon } from '@/constants';

interface SearchLocationBarProps {
    filters: Filters;
    suggestions: NominatimResult[];
    isQueryInputFocused: boolean;
    isSearchingLocation: boolean;
    searchWrapperRef: React.RefObject<HTMLDivElement>;
    onFilterChange: <K extends keyof Filters>(name: K, value: Filters[K]) => void;
    onSearch: () => void;
    onQueryInputFocusChange: (focused: boolean) => void;
    onSuggestionClick: (suggestion: NominatimResult) => void;
    variant: 'desktop' | 'mobile';
}

const SearchLocationBar: React.FC<SearchLocationBarProps> = ({
    filters,
    suggestions,
    isQueryInputFocused,
    isSearchingLocation,
    searchWrapperRef,
    onFilterChange,
    onSearch,
    onQueryInputFocusChange,
    onSuggestionClick,
    variant,
}) => {
    if (variant === 'mobile') {
        return (
            <div className="relative flex-grow">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2">
                    <SearchIcon className="h-5 w-5 text-neutral-500" />
                </div>
                <input
                    type="text"
                    name="query"
                    placeholder="Search city, address..."
                    value={filters.query}
                    onChange={(e) => onFilterChange('query', e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                    onFocus={() => onQueryInputFocusChange(true)}
                    className="block w-full text-base bg-transparent border-none text-neutral-900 px-9 py-1 focus:outline-none focus:ring-0"
                />
                {filters.query && !isSearchingLocation && (
                    <div className="absolute inset-y-0 right-0 flex items-center pr-2">
                        <button onClick={() => onFilterChange('query', '')} className="text-neutral-400 hover:text-neutral-800" aria-label="Clear search">
                            <XMarkIcon className="h-5 w-5" />
                        </button>
                    </div>
                )}
                {isSearchingLocation && (
                    <div className="absolute inset-y-0 right-0 flex items-center pr-2">
                        <SpinnerIcon className="h-5 w-5 text-primary" />
                    </div>
                )}
                {suggestions.length > 0 && isQueryInputFocused && (
                    <ul className="absolute z-20 w-full mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {suggestions.map((suggestion) => (
                            <li key={suggestion.place_id} onMouseDown={() => onSuggestionClick(suggestion)} className="px-4 py-3 text-sm text-neutral-700 hover:bg-neutral-100 cursor-pointer flex items-center gap-2">
                                <MapPinIcon className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                                <span>{suggestion.display_name}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        );
    }

    // Desktop variant
    return (
        <div className="flex-grow max-w-md" ref={searchWrapperRef}>
            <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <SearchIcon className="h-4 w-4 text-neutral-400" />
                </div>
                <input
                    type="text"
                    placeholder="Search city, address..."
                    value={filters.query}
                    onChange={(e) => onFilterChange('query', e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                    onFocus={() => onQueryInputFocusChange(true)}
                    className="block w-full bg-white/60 backdrop-blur-sm border border-white/50 rounded-xl text-neutral-900 text-sm px-3 py-2 pl-9 pr-8 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-neutral-400 shadow-sm"
                />
                {filters.query && !isSearchingLocation && (
                    <button
                        onClick={() => onFilterChange('query', '')}
                        className="absolute inset-y-0 right-0 flex items-center pr-2 text-neutral-400 hover:text-neutral-800"
                    >
                        <XMarkIcon className="h-4 w-4" />
                    </button>
                )}
                {isSearchingLocation && (
                    <div className="absolute inset-y-0 right-0 flex items-center pr-2">
                        <SpinnerIcon className="h-4 w-4 text-primary" />
                    </div>
                )}
                {suggestions.length > 0 && isQueryInputFocused && (
                    <ul
                        className="absolute z-30 w-full mt-1 bg-white/80 backdrop-blur-xl border border-white/40 rounded-xl max-h-60 overflow-y-auto"
                        style={{
                            boxShadow: '0 8px 32px rgba(31, 38, 135, 0.15), inset 0 0 15px rgba(255, 255, 255, 0.2)',
                        }}
                    >
                        {suggestions.map((suggestion) => (
                            <li
                                key={suggestion.place_id}
                                onMouseDown={() => onSuggestionClick(suggestion)}
                                className="px-4 py-3 text-sm text-neutral-700 hover:bg-neutral-100 cursor-pointer flex items-center gap-2"
                            >
                                <MapPinIcon className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                                <span>{suggestion.display_name}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default SearchLocationBar;
