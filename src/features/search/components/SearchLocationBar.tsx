import React from 'react';
import { Filters, Property } from '@/types';
import type { Coordinates } from '@/shared/geo';
import UniversalSearchBox from '../universal/UniversalSearchBox';
import type { Suggestion } from '../universal/types';

/**
 * The search page's location bar.
 *
 * Thin by design: it is the omnibox with the search page's layout around it,
 * so the desktop header and the mobile sheet cannot drift into behaving
 * differently. Everything about *how* searching works lives in
 * `UniversalSearchBox` and the engine underneath it.
 */

interface SearchLocationBarProps {
    filters: Filters;
    /** Listings already loaded, so the box can offer them directly. */
    properties?: readonly Property[];
    /** Map centre, used to break ties between same-named places. */
    near?: Coordinates | null;
    onFilterChange: <K extends keyof Filters>(name: K, value: Filters[K]) => void;
    onSearch: (query?: string) => void;
    onSelectSuggestion: (suggestion: Suggestion) => void;
    variant: 'desktop' | 'mobile';
}

const SearchLocationBar: React.FC<SearchLocationBarProps> = ({
    filters,
    properties,
    near,
    onFilterChange,
    onSearch,
    onSelectSuggestion,
    variant,
}) => (
    <UniversalSearchBox
        value={filters.query}
        onValueChange={(value) => onFilterChange('query', value)}
        onSelect={onSelectSuggestion}
        onSubmit={onSearch}
        properties={properties}
        country={filters.country !== 'any' ? filters.country : undefined}
        near={near}
        variant={variant === 'mobile' ? 'bare' : 'default'}
        className={variant === 'mobile' ? 'flex-grow' : 'flex-grow max-w-md'}
        inputClassName={
            variant === 'desktop'
                ? 'bg-white/60 backdrop-blur-sm border-white/50 shadow-sm'
                : ''
        }
    />
);

export default SearchLocationBar;
