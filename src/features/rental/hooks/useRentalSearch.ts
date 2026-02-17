import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/context/AppContext';
import { Property, Filters, initialFilters, NominatimResult, SavedSearch } from '@/types';
import { searchLocation } from '@/services/osmService';
import { generateSearchName, generateSearchNameFromCoords } from '@/services/geminiService';
import L from 'leaflet';
import { filterProperties } from '@/utils/propertyUtils';
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

    // Rental properties state
    const [rentalProperties, setRentalProperties] = useState<Property[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filters - default to rent listingType
    const [filters, setFilters] = useState<Filters>({
        ...initialFilters,
        listingType: 'rent',
    });

    // Local state
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [isTablet, setIsTablet] = useState(window.innerWidth >= 768 && window.innerWidth < 1024);
    const [mobileView, setMobileView] = useState<'list' | 'map'>('list');
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

    // Fetch rental properties
    const fetchRentals = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            params.set('listingType', 'rent');
            params.set('limit', '100');
            if (filters.country && filters.country !== 'any') params.set('country', filters.country);
            if (filters.minPrice) params.set('minPrice', String(filters.minPrice));
            if (filters.maxPrice) params.set('maxPrice', String(filters.maxPrice));
            if (filters.beds) params.set('beds', String(filters.beds));
            if (filters.baths) params.set('baths', String(filters.baths));
            if (filters.propertyType && filters.propertyType !== 'any') params.set('propertyType', filters.propertyType);
            if (filters.query) params.set('query', filters.query);
            if (filters.sortBy) params.set('sortBy', filters.sortBy);

            const response = await fetch(`${API_CONFIG.BASE_URL}/properties?${params.toString()}`);
            if (!response.ok) throw new Error('Failed to fetch rental properties');
            const data = await response.json();

            const transformed = (data.properties || []).map((p: any) => ({
                ...p,
                id: p._id || p.id,
                sellerId: p.sellerId?._id || p.sellerId,
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
    }, [filters.country, filters.minPrice, filters.maxPrice, filters.beds, filters.baths, filters.propertyType, filters.query, filters.sortBy]);

    useEffect(() => {
        fetchRentals();
    }, [fetchRentals]);

    // Re-fetch when a property status changes (e.g., marked as available/rented/deleted)
    // Also handle optimistic updates from detailed events for instant UI response
    useEffect(() => {
        const handleStatusChange = () => {
            fetchRentals();
        };
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
        window.addEventListener('property-status-changed', handleStatusChange);
        window.addEventListener('property-status-update', handleOptimisticUpdate);
        window.addEventListener('property-deleted', handlePropertyDeleted);
        return () => {
            window.removeEventListener('property-status-changed', handleStatusChange);
            window.removeEventListener('property-status-update', handleOptimisticUpdate);
            window.removeEventListener('property-deleted', handlePropertyDeleted);
        };
    }, [fetchRentals]);

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

    // Filter properties by map bounds
    const baseFilteredProperties = useMemo(() => {
        let filtered = rentalProperties;
        const boundsToUse = drawnBounds || mapBounds;
        if (boundsToUse) {
            filtered = filtered.filter(p =>
                p.lat && p.lng && boundsToUse.contains(L.latLng(p.lat, p.lng))
            );
        }
        return filtered;
    }, [rentalProperties, mapBounds, drawnBounds]);

    const listProperties = baseFilteredProperties;

    // --- Handlers ---

    // Toast - matches buy page pattern (Toast component handles auto-dismiss via onClose)
    const showToast = useCallback((message: string, type: 'success' | 'error') => {
        setToast({ show: true, message, type });
    }, []);

    const handleFilterChange = useCallback((key: keyof Filters, value: any) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    }, []);

    const handleSearch = useCallback(() => {
        fetchRentals();
    }, [fetchRentals]);

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
                    name: `Area near ${name}`,
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
        setFlyToTarget({ center: [lat, lng], zoom: 12 });
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
