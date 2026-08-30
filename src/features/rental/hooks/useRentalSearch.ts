import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/context/AppContext';
import { Property, Filters, initialFilters, NominatimResult, SavedSearch } from '@/types';
import { searchLocation, getZoomFromBoundingBox } from '@/services/osmService';
import { generateSearchName, generateSearchNameFromCoords } from '@/services/geminiService';
import L from 'leaflet';
import { filterProperties } from '@/utils/propertyUtils';
import { useRealtimeProperties } from '@/src/features/properties/hooks';
import { API_CONFIG } from '@/src/shared/constants/app.constants';

export const serializeBounds = (bounds: L.LatLngBounds): string => {
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    return JSON.stringify({
        _southWest: { lat: sw.lat, lng: sw.lng },
        _northEast: { lat: ne.lat, lng: ne.lng }
    });
};

export function useRentalSearch() {
    const { t } = useTranslation(['search', 'rental', 'common']);
    const { state, dispatch, updateSearchPageState, addSavedSearch } = useAppContext();
    const { isAuthenticated, currentUser } = state;

    // Full rental dataset (fetched once, filtered client-side)
    const [rentalProperties, setRentalProperties] = useState<Property[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filters - default to rent listingType.
    //
    // `?q=` is read once, in the initialiser rather than an effect: the buy
    // page accepts the same param, and links that arrive here from elsewhere
    // (the home-page city gallery's Rent button, a shared URL) would otherwise
    // land on an unfiltered list. A lazy initialiser means the very first
    // render already has the filter, so no results flash unfiltered first.
    const [filters, setFilters] = useState<Filters>(() => {
        const query = new URLSearchParams(window.location.search).get('q')?.trim() ?? '';
        return {
            ...initialFilters,
            listingType: 'rent',
            ...(query ? { query } : {}),
        };
    });

    // Local state
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [isTablet, setIsTablet] = useState(window.innerWidth >= 768 && window.innerWidth < 1024);
    // Open on the map first on mobile/tablet (e.g. when navigating in from the sidebar).
    const [mobileView, setMobileView] = useState<'list' | 'map'>('map');
    const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });
    const [isDrawing, setIsDrawing] = useState(false);
    const [flyToTarget, setFlyToTarget] = useState<{ center: [number, number]; zoom: number } | null>(null);
    const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
    const searchWrapperRef = useRef<HTMLDivElement>(null);
    const [isSearchingLocation, setIsSearchingLocation] = useState(false);
    const [hoveredPropertyId, setHoveredPropertyId] = useState<string | null>(null);
    const [isQueryInputFocused, setIsQueryInputFocused] = useState(false);
    const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
    const [mapBoundsJSON, setMapBoundsJSON] = useState<string | null>(null);
    const [drawnBoundsJSON, setDrawnBoundsJSON] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const debounceTimer = useRef<number | null>(null);

    // Fetch ALL rental properties once on mount — no filter params sent to API.
    // Filtering & sorting happen client-side via useMemo (same pattern as buy page).
    const fetchRentals = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            params.set('listingType', 'rent');
            params.set('excludePropertyType', 'luxury-villa'); // luxury villas live in the Luxury Villas tab only
            params.set('limit', '3000');

            const response = await fetch(`${API_CONFIG.BASE_URL}/properties?${params.toString()}`);
            if (!response.ok) throw new Error(t('rental:fetchError', 'Failed to fetch rental properties'));
            const data = await response.json();

            const transformed = (data.properties || []).map((p: any) => ({
                ...p,
                id: p.id || p._id,
                sellerId: p.sellerId?.id || p.sellerId?._id || p.sellerId,
                listingType: p.listingType || 'rent',
                rentedAt: p.rentedAt ? new Date(p.rentedAt).getTime() : undefined,
                rentedUntil: p.rentedUntil ? new Date(p.rentedUntil).getTime() : undefined,
                availableFrom: p.availableFrom ? new Date(p.availableFrom).getTime() : undefined,
                promotionStartDate: p.promotionStartDate ? new Date(p.promotionStartDate).getTime() : undefined,
                promotionEndDate: p.promotionEndDate ? new Date(p.promotionEndDate).getTime() : undefined,
                seller: p.sellerId ? {
                    type: p.sellerId.role === 'agent' ? 'agent' : 'private',
                    name: p.sellerId.name || '',
                    avatarUrl: p.sellerId.avatarUrl,
                    phone: p.sellerId.phone || '',
                    agencyName: p.sellerId.agencyName,
                    agencyLogo: p.sellerId.agencyLogo,
                    agencyId: p.sellerId.agencyId,
                } : { type: 'private' as const, name: '', phone: '' },
            }));

            setRentalProperties(transformed);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, []); // No filter deps — fetch the full dataset once

    // Load all rentals on mount
    useEffect(() => {
        fetchRentals();
    }, [fetchRentals]);

    // Real-time updates via WebSocket (same as buy page)
    useRealtimeProperties({
        onPropertyCreated: fetchRentals,
        onPropertyUpdated: fetchRentals,
        onPropertyDeleted: fetchRentals,
    });

    // Also handle optimistic updates from window events for instant UI response
    useEffect(() => {
        const handleOptimisticUpdate = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            if (!detail?.id || !detail?.status) return;
            setRentalProperties(prev => prev.map(p =>
                p.id === detail.id ? { ...p, status: detail.status, rentedAt: detail.rentedAt, rentedUntil: detail.rentedUntil } : p
            ));
        };
        const handlePropertyDeleted = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            if (detail?.id) {
                setRentalProperties(prev => prev.filter(p => p.id !== detail.id));
            }
        };
        window.addEventListener('property-status-update', handleOptimisticUpdate);
        window.addEventListener('property-deleted', handlePropertyDeleted);
        return () => {
            window.removeEventListener('property-status-update', handleOptimisticUpdate);
            window.removeEventListener('property-deleted', handlePropertyDeleted);
        };
    }, []);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
            setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1024);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Geolocation
    useEffect(() => {
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
                () => { /* geolocation denied - ignore */ },
                { enableHighAccuracy: false, timeout: 5000, maximumAge: 600000 }
            );
        }
    }, []);

    // Close suggestions when clicking outside the search wrapper
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchWrapperRef.current && !searchWrapperRef.current.contains(event.target as Node)) {
                setIsQueryInputFocused(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Handle focusing map on a specific property (e.g., from property details "View on Map")
    const focusMapOnProperty = state.searchPageState.focusMapOnProperty;
    useEffect(() => {
        if (focusMapOnProperty) {
            setFlyToTarget({
                center: [focusMapOnProperty.lat, focusMapOnProperty.lng],
                zoom: focusMapOnProperty.zoom ?? 18,
            });
            // Switch to map view on mobile
            if (window.innerWidth < 768) {
                setMobileView('map');
            }
            // Clear the focus state
            updateSearchPageState({ focusMapOnProperty: null });
        }
    }, [focusMapOnProperty, updateSearchPageState]);

    // Parse bounds
    const mapBounds = useMemo(() => {
        if (!mapBoundsJSON) return null;
        try {
            const parsed = JSON.parse(mapBoundsJSON);
            return L.latLngBounds(
                L.latLng(parsed._southWest.lat, parsed._southWest.lng),
                L.latLng(parsed._northEast.lat, parsed._northEast.lng)
            );
        } catch { return null; }
    }, [mapBoundsJSON]);

    const drawnBounds = useMemo(() => {
        if (!drawnBoundsJSON) return null;
        try {
            const parsed = JSON.parse(drawnBoundsJSON);
            return L.latLngBounds(
                L.latLng(parsed._southWest.lat, parsed._southWest.lng),
                L.latLng(parsed._northEast.lat, parsed._northEast.lng)
            );
        } catch { return null; }
    }, [drawnBoundsJSON]);

    // Client-side filtering + sorting (same pattern as buy page — instant, no API call)
    const baseFilteredProperties = useMemo(() => {
        // 1. Apply all user filters client-side
        const filtered = filterProperties(rentalProperties, filters);
        const now = Date.now();

        // 2. Narrow by map/drawn bounds
        const boundsToUse = drawnBounds || mapBounds;
        const bounded = boundsToUse
            ? filtered.filter(p => p.lat && p.lng && boundsToUse.contains(L.latLng(p.lat, p.lng)))
            : filtered;

        // 3. Promotion-aware sorting (matches buy page)
        const getPromotionScore = (p: Property) => {
            const isActive = p.isPromoted && p.promotionEndDate && p.promotionEndDate > now;
            if (!isActive) return 0;
            const tierScores: Record<string, number> = { premium: 100, highlight: 70, featured: 40, standard: 10 };
            return (tierScores[p.promotionTier || 'standard'] || 0) + (p.hasUrgentBadge ? 5 : 0);
        };

        const toTimestamp = (v: number | string | Date | undefined | null): number => {
            if (!v) return 0;
            if (typeof v === 'number') return v;
            if (typeof v === 'string') return new Date(v).getTime();
            if (v instanceof Date) return v.getTime();
            return 0;
        };

        const getPropertyTime = (p: Property) => Math.max(toTimestamp(p.lastRenewed), toTimestamp(p.createdAt));

        const sorted = [...bounded].sort((a, b) => {
            const sA = getPromotionScore(a);
            const sB = getPromotionScore(b);
            if (sA !== sB) return sB - sA;

            switch (filters.sortBy) {
                case 'price_asc': return a.price - b.price;
                case 'price_desc': return b.price - a.price;
                case 'sqft_asc': return a.sqft - b.sqft;
                case 'sqft_desc': return b.sqft - a.sqft;
                case 'beds_desc': return b.beds - a.beds;
                case 'baths_desc': return b.baths - a.baths;
                case 'oldest': return (a.createdAt || 0) - (b.createdAt || 0);
                case 'year_built_desc': return (b.yearBuilt || 0) - (a.yearBuilt || 0);
                case 'price_reduced': {
                    const dA = a.hasDiscount ? 1 : 0;
                    const dB = b.hasDiscount ? 1 : 0;
                    if (dA !== dB) return dB - dA;
                    return getPropertyTime(b) - getPropertyTime(a);
                }
                case 'featured':
                case 'newest':
                default:
                    return getPropertyTime(b) - getPropertyTime(a);
            }
        });

        return sorted;
    }, [rentalProperties, filters, mapBounds, drawnBounds]);

    const listProperties = baseFilteredProperties;

    // --- Handlers ---

    // Toast - matches buy page pattern (Toast component handles auto-dismiss via onClose)
    const showToast = useCallback((message: string, type: 'success' | 'error') => {
        setToast({ show: true, message, type });
    }, []);

    const handleFilterChange = useCallback((key: keyof Filters, value: any) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    }, []);

    // No-op: filtering is now reactive via useMemo, no API call needed
    const handleSearch = useCallback(() => {}, []);

    const handleResetFilters = useCallback(() => {
        setFilters({ ...initialFilters, listingType: 'rent' });
        setDrawnBoundsJSON(null);
        setFlyToTarget({ center: [42.5, 20.5], zoom: 6 });
    }, []);

    const handleSortChange = useCallback((sortBy: string) => {
        setFilters(prev => ({ ...prev, sortBy }));
    }, []);

    // Matches MapComponentProps signature: (bounds: L.LatLngBounds, center: L.LatLng) => void
    const handleMapMove = useCallback((_bounds: L.LatLngBounds, _center?: L.LatLng) => {
        setMapBoundsJSON(serializeBounds(_bounds));
    }, []);

    const toggleDrawing = useCallback(() => {
        setIsDrawing(prev => {
            // Clear any existing drawn bounds when toggling drawing mode
            // Starting a new draw replaces the old one; cancelling also clears
            setDrawnBoundsJSON(null);
            return !prev;
        });
    }, []);

    const handleDrawComplete = useCallback((bounds: L.LatLngBounds | null) => {
        setDrawnBoundsJSON(bounds ? serializeBounds(bounds) : null);
        // Clear query when area is drawn (matches buy page behavior)
        if (bounds) {
            setFilters(prev => ({ ...prev, query: '' }));
        }
        setIsDrawing(false);
    }, []);

    const handleRecenterOnUser = useCallback(() => {
        if (userLocation) {
            setFlyToTarget({ center: userLocation, zoom: 14 });
        } else {
            showToast(t('search:locationUnavailable', 'Your location is not available.'), 'error');
        }
    }, [userLocation, showToast, t]);

    // Reset map view to show the full Balkans region
    const handleResetView = useCallback(() => {
        setFlyToTarget({ center: [42.5, 20.5], zoom: 6 });
    }, []);

    const onFlyComplete = useCallback(() => {
        setFlyToTarget(null);
    }, []);

    const isFormSearchActive = useMemo(() => {
        return filters.query.trim() !== '' || filters.minPrice !== null || filters.maxPrice !== null || filters.beds !== null || filters.baths !== null || filters.propertyType !== 'any';
    }, [filters]);

    const handleSaveSearch = useCallback(async (isAreaOnly: boolean = false) => {
        if (!isAuthenticated) {
            dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true, view: 'signup' } });
            return;
        }

        if (isSaving) return; // Prevent double-clicks

        setIsSaving(true);
        try {
            let newSearch: SavedSearch;
            const now = Date.now();
            // Always set listingType to 'rent' for rental saved searches
            const rentalFilters = { ...(isAreaOnly ? initialFilters : filters), listingType: 'rent' as const };

            if (drawnBounds) { // Priority 1: A user-drawn area
                const center = drawnBounds.getCenter();
                const name = await generateSearchNameFromCoords(center.lat, center.lng, drawnBounds);
                const serializedBounds = serializeBounds(drawnBounds);
                newSearch = {
                    id: `ss-${now}`,
                    name,
                    filters: rentalFilters,
                    drawnBoundsJSON: serializedBounds,
                    createdAt: now,
                    lastAccessed: now,
                    seenPropertyIds: [],
                };
            } else if (isFormSearchActive) { // Priority 2: Active text/form filters
                const name = await generateSearchName(rentalFilters);
                newSearch = {
                    id: `ss-${now}`,
                    name,
                    filters: rentalFilters,
                    drawnBoundsJSON: null,
                    createdAt: now,
                    lastAccessed: now,
                    seenPropertyIds: [],
                };
            } else if (mapBounds) { // Priority 3: The current map view
                const center = mapBounds.getCenter();
                const name = await generateSearchNameFromCoords(center.lat, center.lng, mapBounds);
                newSearch = {
                    id: `ss-${now}`,
                    name: t('search:areaNear', { name, defaultValue: `Area near ${name}` }),
                    filters: { ...initialFilters, listingType: 'rent' as const },
                    drawnBoundsJSON: serializeBounds(mapBounds),
                    createdAt: now,
                    lastAccessed: now,
                    seenPropertyIds: [],
                };
            } else {
                showToast(t('search:cannotSaveEmptySearch', 'Cannot save an empty search. Please add some criteria or move to an area on the map.'), 'error');
                setIsSaving(false);
                return;
            }

            await addSavedSearch(newSearch);
            showToast(t('search:searchSaved', 'Search saved successfully!'), 'success');
        } catch (e: any) {
            const message = e?.message || t('search:couldNotSaveSearch', 'Could not save search. AI might be busy.');
            showToast(message, 'error');
        } finally {
            setIsSaving(false);
        }
    }, [isAuthenticated, isSaving, dispatch, addSavedSearch, filters, isFormSearchActive, showToast, drawnBounds, mapBounds, t]);

    const handleSaveSearchArea = useCallback(() => handleSaveSearch(true), [handleSaveSearch]);

    // Location search with debounce
    const handleSuggestionClick = useCallback((suggestion: NominatimResult) => {
        const lat = parseFloat(suggestion.lat);
        const lng = parseFloat(suggestion.lon);
        if (isNaN(lat) || isNaN(lng)) return; // Validate coordinates

        const displayName = suggestion.display_name.split(',').slice(0, 2).join(',').trim();
        setFilters(prev => ({ ...prev, query: displayName }));
        setSuggestions([]);
        setDrawnBoundsJSON(null); // Clear drawn bounds when searching a location
        const zoom = getZoomFromBoundingBox(suggestion.boundingbox);
        setFlyToTarget({ center: [lat, lng], zoom });
        setIsQueryInputFocused(false);
    }, []);

    useEffect(() => {
        if (!filters.query || filters.query.length < 2 || !isQueryInputFocused) {
            setSuggestions([]);
            return;
        }
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = window.setTimeout(async () => {
            setIsSearchingLocation(true);
            try {
                const results = await searchLocation(filters.query);
                setSuggestions(results.slice(0, 5));
            } catch {
                setSuggestions([]);
            } finally {
                setIsSearchingLocation(false);
            }
        }, 500); // Match buy page debounce (500ms)
        return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
    }, [filters.query, isQueryInputFocused]);

    return {
        t,
        state,
        dispatch,
        rentalProperties,
        isLoading,
        error,
        filters,
        isAuthenticated,
        currentUser,
        mobileView,
        setMobileView,
        isMobile,
        isTablet,
        isQueryInputFocused,
        setIsQueryInputFocused,
        toast,
        setToast,
        isDrawing,
        flyToTarget,
        suggestions,
        searchWrapperRef,
        isSearchingLocation,
        hoveredPropertyId,
        setHoveredPropertyId,
        userLocation,
        mapBounds,
        drawnBounds,
        baseFilteredProperties,
        listProperties,
        handleSuggestionClick,
        toggleDrawing,
        handleDrawComplete,
        handleFilterChange,
        handleSearch,
        handleResetFilters,
        handleSortChange,
        handleMapMove,
        handleRecenterOnUser,
        handleResetView,
        onFlyComplete,
        fetchRentals,
        isSaving,
        handleSaveSearchArea,
        showToast,
    };
}
