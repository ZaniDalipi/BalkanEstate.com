import React from 'react';
import { useTranslation } from 'react-i18next';
import type { Property } from '@/types';
import UniversalSearchBox from '@/src/features/search/universal/UniversalSearchBox';
import type { Suggestion } from '@/src/features/search/universal/types';

/**
 * The villas corridor's location bar.
 *
 * The twin of the buy page's `SearchLocationBar`, and thin for the same
 * reason: searching is the omnibox's job, so the desktop header and the mobile
 * pill cannot drift into behaving differently — from each other or from the
 * rest of the app.
 *
 * This page used to render its own input and its own dropdown while calling
 * the shared engine underneath, which meant it got the app's suggestions but
 * none of the box's behaviour: no ↑/↓ through the list, no bold on the matched
 * text, no recent searches, no second lookup to turn a Google Places row into
 * coordinates, and a translucent panel at a z-index below the sticky filter
 * chips, so the suggestions were drawn through by the page behind them.
 *
 * Only the *box* is shared. What the villas page searches for — luxury villas,
 * with its own view, amenity and bed filters — is untouched: this hands the
 * page's own villa list to the box so listings can be offered directly, and
 * hands the pick straight back for the page to act on.
 */

interface VillaLocationBarProps {
    query: string;
    /** The villas already loaded, so the box can offer them as rows. */
    properties?: readonly Property[];
    onQueryChange: (value: string) => void;
    onSelectSuggestion: (suggestion: Suggestion) => void;
    /** Enter with no row highlighted — run the text as typed. */
    onSearch: (query?: string) => void;
    variant: 'desktop' | 'mobile';
}

const VillaLocationBar: React.FC<VillaLocationBarProps> = ({
    query,
    properties,
    onQueryChange,
    onSelectSuggestion,
    onSearch,
    variant,
}) => {
    const { t } = useTranslation(['villas']);
    const label = t('villas:filters.searchCity', 'Search by location...');

    return (
        <UniversalSearchBox
            value={query}
            onValueChange={onQueryChange}
            onSelect={onSelectSuggestion}
            onSubmit={onSearch}
            properties={properties}
            placeholder={label}
            aria-label={label}
            variant={variant === 'mobile' ? 'bare' : 'default'}
            className="w-full min-w-0"
        />
    );
};

export default VillaLocationBar;
