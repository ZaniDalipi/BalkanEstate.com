import { useState, useCallback } from 'react';
import { Filters, initialFilters } from '../../../../types';
import { SearchPageState } from '../../../../types';
import { BALKAN_COUNTRIES } from '../../../../constants/countries';
import L from 'leaflet';

export const useSearchFilters = (
    filters: Filters,
    updateSearchPageState: (state: Partial<SearchPageState>) => void,
    setFlyToTarget: (target: { center: [number, number], zoom: number } | null) => void,
    isMobile: boolean
) => {
    const [localFilters, setLocalFilters] = useState<Filters>(filters);

    const handleFilterChange = useCallback(<K extends keyof Filters>(
        name: K, 
        value: Filters[K]
    ) => {
        const newFilters = { ...filters, [name]: value };

        // If country filter is changed, fly to the country bounds
        if (name === 'country' && value && value !== 'any') {
            const countryData = BALKAN_COUNTRIES[value as string];
            if (countryData) {
                const bounds = L.latLngBounds(countryData.bounds[0], countryData.bounds[1]);
                setFlyToTarget({ center: countryData.center, zoom: countryData.zoom });
                updateSearchPageState({
                    filters: newFilters,
                    activeFilters: newFilters,
                    drawnBoundsJSON: JSON.stringify(bounds),
                });
                return;
            }
        }

        updateSearchPageState({ filters: newFilters, activeFilters: newFilters });
    }, [filters, updateSearchPageState, setFlyToTarget]);

    const handleLocalFilterChange = (name: keyof Filters, value: string | number | null) => {
        setLocalFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleResetFilters = useCallback(() => {
        const resetState: Partial<SearchPageState> = {
            filters: initialFilters,
            activeFilters: initialFilters,
            drawnBoundsJSON: null,
        };
        if (isMobile) {
            resetState.isFiltersOpen = false;
        }
        updateSearchPageState(resetState);
        setLocalFilters(initialFilters);
        setFlyToTarget({ center: [44.2, 19.9], zoom: 7 });
    }, [isMobile, updateSearchPageState, setFlyToTarget]);

    return {
        localFilters,
        setLocalFilters,
        handleFilterChange,
        handleLocalFilterChange,
        handleResetFilters
    };
};