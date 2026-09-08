import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/context/AppContext';
import { Property, Filters, initialFilters, SavedSearch } from '@/types';
import type { Suggestion } from '@/src/features/search/universal/types';
import { applyQueryToFilters } from '@/src/features/search/universal/queryToFilters';
import { searchPlaces } from '@/src/features/search/universal/places';
import { generateSearchName, generateSearchNameFromCoords } from '@/services/geminiService';
import { searchLocation, getZoomFromBoundingBox } from '@/services/osmService';
import L from 'leaflet';
import { filterAndSortProperties } from '@/utils/propertyUtils';
import { narrowToMapView } from '@/src/features/search/mapList';
import { useRealtimeProperties } from '@/src/features/properties/hooks';
import { API_CONFIG } from '@/src/shared/constants/app.constants';
import { getCountryData } from '@/constants/countries';
import { generatePropertySlug } from '@/utils/slug';
import { buildLocalizedPath } from '@/src/utils/languageRouting';

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

    // What the list is actually filtered by. Same split the buy page keeps:
    // `filters` is what the boxes show, `activeFilters` is what has been
    // applied, so a half-typed place name ("Tir") does not empty the list
    // before the word is finished. Everything but the text query moves both
    // at once; the query is debounced into `activeFilters`.
    const [activeFilters, setActiveFilters] = useState<Filters>(filters);
    const queryDebounceRef = useRef<number | null>(null);

    /** Apply a filter set immediately, cancelling any pending query debounce. */
    const applyFilters = useCallback((next: Filters) => {
        if (queryDebounceRef.current) {
            clearTimeout(queryDebounceRef.current);
            queryDebounceRef.current = null;
        }
        setFilters(next);
        setActiveFilters(next);
    }, []);

    useEffect(() => () => {
        if (queryDebounceRef.current) clearTimeout(queryDebounceRef.current);
    }, []);

    // Local state
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [isTablet, setIsTablet] = useState(window.innerWidth >= 768 && window.innerWidth < 1024);
    // Open on the map first on mobile/tablet (e.g. when navigating in from the sidebar).
    const [mobileView, setMobileView] = useState<'list' | 'map'>('map');
    const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });
    const [isDrawing, setIsDrawing] = useState(false);
    const [flyToTarget, setFlyToTarget] = useState<{ center: [number, number]; zoom: number } | null>(null);
    const [hoveredPropertyId, setHoveredPropertyId] = useState<string | null>(null);
    const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
    const [mapBoundsJSON, setMapBoundsJSON] = useState<string | null>(null);
    const [drawnBoundsJSON, setDrawnBoundsJSON] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    // True while the geocoder is being asked about a place the app's own
    // gazetteer did not know.
    const [isSearchingLocation, setIsSearchingLocation] = useState(false);

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

    /** Map centre, used to break ties between same-named places in the box. */
    const mapCentre = useMemo(() => {
        if (!mapBounds) return null;
        const centre = mapBounds.getCenter();
        return { lat: centre.lat, lng: centre.lng };
    }, [mapBounds]);

    // Client-side filtering + sorting (same pattern as buy page — instant, no API call).
    // Bounds are deliberately NOT applied here: the map draws every rental that
    // matches the filters, and only the list follows the viewport (below).
    const baseFilteredProperties = useMemo(
        () => filterAndSortProperties(rentalProperties, activeFilters),
        [rentalProperties, activeFilters]
    );

    /**
     * The same search with the typed text dropped.
     *
     * A street address is a place, not a word any listing contains: "Rruga e
     * Kavajës 12" locates a point on the map and matches no listing text at
     * all. Rather than answer that with an empty page, the text is relaxed
     * once the strict search has come back with nothing and the map view
     * becomes the search — which is what a person who typed an address was
     * asking for. Computed only in that case, never on the common path.
     */
    const needsRelaxedText = baseFilteredProperties.length === 0 && activeFilters.query.trim() !== '';
    const relaxedProperties = useMemo(() => {
        if (!needsRelaxedText) return null;
        const relaxed = filterAndSortProperties(rentalProperties, { ...activeFilters, query: '' });
        return relaxed.length > 0 ? relaxed : null;
    }, [needsRelaxedText, rentalProperties, activeFilters]);

    /**
     * What the list shows: the rentals inside the current view.
     *
     * Same rules as the buy page, so a search behaves identically on both
     * tabs. A drawn area wins over the viewport; and when the viewport holds
     * nothing — flying to a town with no rentals in it — the nearest rentals
     * are shown instead of an empty screen, with `fallbackLocation` naming
     * where they actually are.
     */
    const { listProperties, fallbackLocation } = useMemo(
        () => narrowToMapView({
            // The strict search, or — when it found nothing for the typed
            // text — everything the other filters allow, located by the map.
            properties: relaxedProperties ?? baseFilteredProperties,
            drawnBounds,
            mapBounds,
            ready: !isLoading,
        }),
        [baseFilteredProperties, relaxedProperties, drawnBounds, mapBounds, isLoading]
    );

    /**
     * True when the list is answering a looser question than the one typed —
     * the text matched no rental, so the map view is doing the searching. The
     * page says so rather than letting the results look like an exact match.
     */
    const isTextRelaxed = relaxedProperties !== null && listProperties.length > 0;

    // --- Handlers ---

    // Toast - matches buy page pattern (Toast component handles auto-dismiss via onClose)
    const showToast = useCallback((message: string, type: 'success' | 'error') => {
        setToast({ show: true, message, type });
    }, []);

    const handleFilterChange = useCallback((key: keyof Filters, value: any) => {
        const next = { ...filters, [key]: value } as Filters;

        // Picking a country moves the map to it — the filter and the view
        // should never disagree about where the user is looking. The select
        // carries country names ("Albania"), so it is resolved by either
        // spelling rather than by key.
        if (key === 'country' && value && value !== 'any') {
            const countryData = getCountryData(String(value));
            if (countryData) {
                applyFilters(next);
                setDrawnBoundsJSON(null);
                setFlyToTarget({ center: countryData.center, zoom: countryData.zoom });
                return;
            }
        }

        // Typing is not searching: the box updates on every keystroke, the
        // list a beat later, so a name being typed out does not empty it.
        if (key === 'query') {
            setFilters(next);
            if (queryDebounceRef.current) clearTimeout(queryDebounceRef.current);
            queryDebounceRef.current = window.setTimeout(() => setActiveFilters(next), 300);
            return;
        }

        applyFilters(next);
    }, [filters, applyFilters]);

    /**
     * Run whatever is in the box — the buy page's search, on rentals.
     *
     * The sentence is read first, so "2 bed furnished apartment in Tirana
     * under 600" moves the bedroom, furnishing, type and price filters and
     * leaves "Tirana" as the place to find. Then the app's own gazetteer is
     * asked — it answers from memory, so a known city or village flies the
     * map with no network round trip — and only a place it has never heard of
     * goes to the geocoder, which is what makes a street address work.
     *
     * A place that cannot be resolved is not an error: the filters have
     * already been applied, so the text search runs and the user sees
     * listings rather than an empty screen with a toast.
     */
    const handleSearch = useCallback(async (searchQuery?: string) => {
        const query = (typeof searchQuery === 'string' ? searchQuery : filters.query).trim();

        if (!query) {
            applyFilters({ ...filters, query: '' });
            setDrawnBoundsJSON(null);
            return;
        }

        const { filters: parsedFilters, parsed } = applyQueryToFilters(filters, query);
        // This tab is rentals: a sentence saying otherwise ("for sale") moves
        // every other filter but never takes the user off the rent listings.
        const nextFilters: Filters = { ...parsedFilters, listingType: 'rent' };
        applyFilters(nextFilters);
        setDrawnBoundsJSON(null);

        const placeQuery = parsed.text.trim();
        // A sentence that was entirely filters ("furnished under 500") has no
        // place in it, and the map should stay where it is.
        if (!placeQuery) return;

        const [local] = searchPlaces(placeQuery, {
            limit: 1,
            country: nextFilters.country !== 'any' ? nextFilters.country : undefined,
        });

        if (local && Number.isFinite(local.place.lat) && Number.isFinite(local.place.lng)) {
            setFlyToTarget({
                center: [local.place.lat as number, local.place.lng as number],
                zoom: local.place.zoom,
            });
            return;
        }

        setIsSearchingLocation(true);
        try {
            const results = await searchLocation(placeQuery);
            if (results.length > 0) {
                const [best] = results;
                setFlyToTarget({
                    center: [Number(best.lat), Number(best.lon)],
                    zoom: getZoomFromBoundingBox(best.boundingbox),
                });
            }
        } finally {
            setIsSearchingLocation(false);
        }
    }, [filters, applyFilters]);

    const handleResetFilters = useCallback(() => {
        applyFilters({ ...initialFilters, listingType: 'rent' });
        setDrawnBoundsJSON(null);
        setFlyToTarget({ center: [42.5, 20.5], zoom: 6 });
    }, [applyFilters]);

    const handleSortChange = useCallback((sortBy: string) => {
        applyFilters({ ...filters, sortBy });
    }, [filters, applyFilters]);

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
            applyFilters({ ...filters, query: '' });
        }
        setIsDrawing(false);
    }, [filters, applyFilters]);

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

    /**
     * A row picked in the omnibox — the buy page's three cases, unchanged.
     *
     * A place flies the map, a listing opens it, and a query row is run as a
     * search with whatever filters the sentence carried already applied. The
     * box has already resolved a Google Places row to coordinates by the time
     * it gets here, so a street address arrives with a position like any
     * other place.
     */
    const handleSelectSuggestion = useCallback((suggestion: Suggestion) => {
        if (suggestion.type === 'property') {
            // Same route a listing card opens, so a rental found through the
            // search box lands exactly where one found by scrolling does.
            const property = suggestion.property;
            dispatch({ type: 'SET_SELECTED_PROPERTY_OBJECT', payload: property });
            window.history.pushState({}, '', buildLocalizedPath(`/property/${generatePropertySlug(property)}`));
            return;
        }

        if (suggestion.type === 'place') {
            const { filters: parsedFilters } = applyQueryToFilters(filters, suggestion.searchValue);
            applyFilters({ ...parsedFilters, listingType: 'rent' });
            setDrawnBoundsJSON(null); // A picked place replaces any drawn area.

            if (Number.isFinite(suggestion.lat) && Number.isFinite(suggestion.lng)) {
                setFlyToTarget({
                    center: [suggestion.lat as number, suggestion.lng as number],
                    zoom: suggestion.zoom ?? 12,
                });
            }
            return;
        }

        // 'query' and 'recent' are both "search for this text".
        void handleSearch(suggestion.type === 'query' ? suggestion.text : suggestion.title);
    }, [filters, applyFilters, dispatch, handleSearch]);

    // A `?q=` arriving with the page is a search, not just a filter: the map
    // should open on the place that was linked to, exactly as if it had been
    // typed. Runs once, after the first render has the query in the box.
    const hasRunInitialQuery = useRef(false);
    useEffect(() => {
        if (hasRunInitialQuery.current) return;
        hasRunInitialQuery.current = true;
        const initialQuery = filters.query.trim();
        if (initialQuery) void handleSearch(initialQuery);
        // Mount-only: `handleSearch` is re-created on every filter change.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return {
        t,
        state,
        dispatch,
        rentalProperties,
        isLoading,
        error,
        filters,
        activeFilters,
        isAuthenticated,
        currentUser,
        mobileView,
        setMobileView,
        isMobile,
        isTablet,
        toast,
        setToast,
        isDrawing,
        flyToTarget,
        isSearchingLocation,
        hoveredPropertyId,
        setHoveredPropertyId,
        userLocation,
        mapBounds,
        mapCentre,
        drawnBounds,
        baseFilteredProperties,
        listProperties,
        fallbackLocation,
        isTextRelaxed,
        handleSelectSuggestion,
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
