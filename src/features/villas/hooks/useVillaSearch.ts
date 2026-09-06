import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/context/AppContext';
import { Property, Filters, initialFilters, SavedSearch } from '@/types';
import { useUniversalSearch } from '@/src/features/search/universal/useUniversalSearch';
import type { Suggestion } from '@/src/features/search/universal/types';
import { generateSearchName, generateSearchNameFromCoords } from '@/services/geminiService';
import L from 'leaflet';
import { filterProperties } from '@/utils/propertyUtils';
import { useRealtimeProperties } from '@/src/features/properties/hooks';
import { API_CONFIG } from '@/src/shared/constants/app.constants';
import { serializeBounds } from '@/src/features/rental/hooks/useRentalSearch';

const VILLA_DEFAULTS: Partial<Filters> = {
    listingType: 'rent',
    propertyType: 'luxury-villa',
};

/** Which luxury villas to show: both markets, only rentals, or only for-sale. */
export type VillaListingMode = 'any' | 'rent' | 'sale';

/** Longest destination we'll accept from the URL — a search box, not an essay. */
const MAX_DESTINATION_LENGTH = 80;

interface VillaDeepLink {
    destination: string;
    focus: { center: [number, number]; zoom: number } | null;
}

/**
 * Reads `?destination=&lat=&lng=&zoom=` — how the home-page destination hero
 * hands a place over to this page.
 *
 * Everything is treated as untrusted: the destination is trimmed and capped,
 * and the coordinates must be finite and inside real lat/lng and zoom ranges.
 * Anything else is dropped rather than partially applied, so a hand-edited URL
 * lands on an unfiltered page instead of flying the map off the planet.
 */
function readDeepLink(search: string): VillaDeepLink {
    let destination = '';
    let focus: VillaDeepLink['focus'] = null;

    try {
        const params = new URLSearchParams(search);
        destination = (params.get('destination') ?? '').trim().slice(0, MAX_DESTINATION_LENGTH);

        const lat = Number(params.get('lat'));
        const lng = Number(params.get('lng'));
        const zoom = Number(params.get('zoom'));
        const inRange =
            Number.isFinite(lat) && lat >= -90 && lat <= 90 &&
            Number.isFinite(lng) && lng >= -180 && lng <= 180 &&
            Number.isFinite(zoom) && zoom >= 1 && zoom <= 20;

        if (inRange) focus = { center: [lat, lng], zoom };
    } catch {
        // Malformed query string — fall through to the unfiltered defaults.
    }

    return { destination, focus };
}

export function useVillaSearch() {
    const { t } = useTranslation(['search', 'villas', 'common']);
    const { state, dispatch, updateSearchPageState, addSavedSearch } = useAppContext();
    const { isAuthenticated, currentUser } = state;

    const [villaProperties, setVillaProperties] = useState<Property[]>([]);
    // The DB's own countDocuments for the whole villa collection, straight off
    // `pagination.total`. villaProperties.length is only ever one page of it.
    const [totalVillaCount, setTotalVillaCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Luxury villas can be listed for rent OR for sale; the page shows both by
    // default and lets the visitor narrow to one market.
    const [listingMode, setListingMode] = useState<VillaListingMode>('any');

    // Read once, at mount: later navigations within the page own the filters,
    // so re-reading the URL would fight the user's own edits.
    const deepLinkRef = useRef<VillaDeepLink | null>(null);
    if (deepLinkRef.current === null) {
        deepLinkRef.current = readDeepLink(
            typeof window === 'undefined' ? '' : window.location.search,
        );
    }
    const deepLink = deepLinkRef.current;

    const [filters, setFilters] = useState<Filters>({
        ...initialFilters,
        ...VILLA_DEFAULTS,
        ...(deepLink.destination ? { query: deepLink.destination } : {}),
    });

    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [isTablet, setIsTablet] = useState(window.innerWidth >= 768 && window.innerWidth < 1024);
    const [mobileView, setMobileView] = useState<'list' | 'map'>('list');
    const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });
    const [isDrawing, setIsDrawing] = useState(false);
    const [flyToTarget, setFlyToTarget] = useState<{ center: [number, number]; zoom: number } | null>(deepLink.focus);
    const searchWrapperRef = useRef<HTMLDivElement>(null);
    const [hoveredPropertyId, setHoveredPropertyId] = useState<string | null>(null);
    const [isQueryInputFocused, setIsQueryInputFocused] = useState(false);
    const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
    const [mapBoundsJSON, setMapBoundsJSON] = useState<string | null>(null);
    const [drawnBoundsJSON, setDrawnBoundsJSON] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const abortRef = useRef<AbortController | null>(null);

    const fetchVillas = useCallback(async () => {
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        setIsLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            // Always fetch both markets — narrowing to rent/sale is done client
            // side in baseFilteredProperties, so switching the toggle must not
            // cost a round trip (and a skeleton flash) for data we already hold.
            params.set('propertyType', 'luxury-villa');
            params.set('limit', '3000');

            const response = await fetch(`${API_CONFIG.BASE_URL}/properties?${params.toString()}`, {
                signal: controller.signal,
            });
            if (!response.ok) {
                const msg = t('villas:fetchError', 'Failed to fetch villas');
                throw new Error(`${msg} (${response.status})`);
            }
            const data: {
                properties?: Record<string, unknown>[];
                pagination?: { total?: number };
            } = await response.json();

            const transformed = (data.properties ?? []).map((p) => {
                const seller = p.sellerId as Record<string, unknown> | null | undefined;
                return {
                    ...p,
                    id: (p.id || p._id) as string,
                    sellerId: seller?.id || seller?._id || p.sellerId,
                    rentedAt: p.rentedAt ? new Date(p.rentedAt as string).getTime() : undefined,
                    rentedUntil: p.rentedUntil ? new Date(p.rentedUntil as string).getTime() : undefined,
                    availableFrom: p.availableFrom ? new Date(p.availableFrom as string).getTime() : undefined,
                    promotionStartDate: p.promotionStartDate ? new Date(p.promotionStartDate as string).getTime() : undefined,
                    promotionEndDate: p.promotionEndDate ? new Date(p.promotionEndDate as string).getTime() : undefined,
                    seller: seller ? {
                        type: seller.role === 'agent' ? 'agent' : 'private',
                        name: (seller.name as string) || '',
                        avatarUrl: seller.avatarUrl as string | undefined,
                        phone: (seller.phone as string) || '',
                        agencyName: seller.agencyName as string | undefined,
                        agencyLogo: seller.agencyLogo as string | undefined,
                        agencyId: seller.agencyId as string | undefined,
                    } : { type: 'private' as const, name: '', phone: '' },
                };
            });

            setVillaProperties(transformed as Property[]);
            setTotalVillaCount(data.pagination?.total ?? transformed.length);
        } catch (err: unknown) {
            if (err instanceof Error && err.name === 'AbortError') return;
            const message = err instanceof Error ? err.message : t('common:unknownError', 'An unknown error occurred');
            setError(message);
        } finally {
            if (!controller.signal.aborted) setIsLoading(false);
        }
    }, [t]);

    useEffect(() => {
        fetchVillas();
        return () => { abortRef.current?.abort(); };
    }, [fetchVillas]);

    useRealtimeProperties({
        onPropertyCreated: fetchVillas,
        onPropertyUpdated: fetchVillas,
        onPropertyDeleted: fetchVillas,
    });

    useEffect(() => {
        const handleOptimisticUpdate = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            if (!detail?.id || !detail?.status) return;
            setVillaProperties(prev => prev.map(p =>
                p.id === detail.id ? { ...p, status: detail.status, rentedAt: detail.rentedAt, rentedUntil: detail.rentedUntil } : p
            ));
        };
        const handlePropertyDeleted = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            if (detail?.id) {
                setVillaProperties(prev => prev.filter(p => p.id !== detail.id));
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

    useEffect(() => {
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
                () => {},
                { enableHighAccuracy: false, timeout: 5000, maximumAge: 600000 }
            );
        }
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchWrapperRef.current && !searchWrapperRef.current.contains(event.target as Node)) {
                setIsQueryInputFocused(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const focusMapOnProperty = state.searchPageState.focusMapOnProperty;
    useEffect(() => {
        if (focusMapOnProperty) {
            setFlyToTarget({
                center: [focusMapOnProperty.lat, focusMapOnProperty.lng],
                zoom: focusMapOnProperty.zoom ?? 18,
            });
            if (window.innerWidth < 768) setMobileView('map');
            updateSearchPageState({ focusMapOnProperty: null });
        }
    }, [focusMapOnProperty, updateSearchPageState]);

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

    const baseFilteredProperties = useMemo(() => {
        const filtered = filterProperties(villaProperties, {
            ...filters,
            propertyType: 'luxury-villa',
            listingType: listingMode === 'any' ? 'any' : listingMode,
        });
        const now = Date.now();

        const boundsToUse = drawnBounds || mapBounds;
        const bounded = boundsToUse
            ? filtered.filter(p => p.lat && p.lng && boundsToUse.contains(L.latLng(p.lat, p.lng)))
            : filtered;

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

        return [...bounded].sort((a, b) => {
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
    }, [villaProperties, filters, mapBounds, drawnBounds, listingMode]);

    const listProperties = baseFilteredProperties;

    const showToast = useCallback((message: string, type: 'success' | 'error') => {
        setToast({ show: true, message, type });
    }, []);

    const handleFilterChange = useCallback((key: keyof Filters, value: Filters[keyof Filters]) => {
        if (key === 'propertyType' || key === 'listingType') return; // locked to luxury-villa + rent
        setFilters(prev => ({ ...prev, [key]: value }));
    }, []);

    // Filtering is client side, so a search is a refetch of the collection —
    // which also makes this usable as the error state's "Try Again".
    const handleSearch = useCallback(() => { void fetchVillas(); }, [fetchVillas]);

    const handleResetFilters = useCallback(() => {
        setFilters({ ...initialFilters, ...VILLA_DEFAULTS });
        setListingMode('any');
        setDrawnBoundsJSON(null);
        setFlyToTarget({ center: [42.5, 20.5], zoom: 6 });
    }, []);

    const handleListingModeChange = useCallback((mode: VillaListingMode) => {
        setListingMode(mode);
    }, []);

    const handleSortChange = useCallback((sortBy: string) => {
        setFilters(prev => ({ ...prev, sortBy }));
    }, []);

    const handleMapMove = useCallback((_bounds: L.LatLngBounds, _center?: L.LatLng) => {
        setMapBoundsJSON(serializeBounds(_bounds));
    }, []);

    const toggleDrawing = useCallback(() => {
        setIsDrawing(prev => {
            setDrawnBoundsJSON(null);
            return !prev;
        });
    }, []);

    const handleDrawComplete = useCallback((bounds: L.LatLngBounds | null) => {
        setDrawnBoundsJSON(bounds ? serializeBounds(bounds) : null);
        if (bounds) setFilters(prev => ({ ...prev, query: '' }));
        setIsDrawing(false);
    }, []);

    const handleRecenterOnUser = useCallback(() => {
        if (userLocation) {
            setFlyToTarget({ center: userLocation, zoom: 14 });
        } else {
            showToast(t('search:locationUnavailable', 'Your location is not available.'), 'error');
        }
    }, [userLocation, showToast, t]);

    const handleResetView = useCallback(() => {
        setFlyToTarget({ center: [42.5, 20.5], zoom: 6 });
    }, []);

    const onFlyComplete = useCallback(() => {
        setFlyToTarget(null);
    }, []);

    const isFormSearchActive = useMemo(() => {
        return filters.query.trim() !== '' || filters.minPrice !== null || filters.maxPrice !== null || filters.beds !== null || filters.baths !== null;
    }, [filters]);

    const handleSaveSearch = useCallback(async (isAreaOnly: boolean = false) => {
        if (!isAuthenticated) {
            dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true, view: 'signup' } });
            return;
        }
        if (isSaving) return;
        setIsSaving(true);
        try {
            let newSearch: SavedSearch;
            const now = Date.now();
            // Record the market actually being browsed. Spreading VILLA_DEFAULTS
            // wholesale stamped every saved search as 'rent' even from the
            // "For Sale" / "All" tabs.
            const villaFilters: Filters = {
                ...(isAreaOnly ? initialFilters : filters),
                propertyType: 'luxury-villa',
                listingType: listingMode === 'any' ? 'any' : listingMode,
            };

            if (drawnBounds) {
                const center = drawnBounds.getCenter();
                const name = await generateSearchNameFromCoords(center.lat, center.lng, drawnBounds);
                newSearch = { id: `ss-${now}`, name, filters: villaFilters, drawnBoundsJSON: serializeBounds(drawnBounds), createdAt: now, lastAccessed: now, seenPropertyIds: [] };
            } else if (isFormSearchActive) {
                const name = await generateSearchName(villaFilters);
                newSearch = { id: `ss-${now}`, name, filters: villaFilters, drawnBoundsJSON: null, createdAt: now, lastAccessed: now, seenPropertyIds: [] };
            } else if (mapBounds) {
                const center = mapBounds.getCenter();
                const name = await generateSearchNameFromCoords(center.lat, center.lng, mapBounds);
                newSearch = { id: `ss-${now}`, name: t('search:areaNear', { name, defaultValue: `Area near ${name}` }), filters: villaFilters, drawnBoundsJSON: serializeBounds(mapBounds), createdAt: now, lastAccessed: now, seenPropertyIds: [] };
            } else {
                showToast(t('search:cannotSaveEmptySearch', 'Cannot save an empty search. Please add some criteria or move to an area on the map.'), 'error');
                setIsSaving(false);
                return;
            }

            await addSavedSearch(newSearch);
            showToast(t('search:searchSaved', 'Search saved successfully!'), 'success');
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : t('search:couldNotSaveSearch', 'Could not save search.');
            showToast(msg, 'error');
        } finally {
            setIsSaving(false);
        }
    }, [isAuthenticated, isSaving, dispatch, addSavedSearch, filters, listingMode, isFormSearchActive, showToast, drawnBounds, mapBounds, t]);

    const handleSaveSearchArea = useCallback(() => handleSaveSearch(true), [handleSaveSearch]);

    /**
     * A row picked in the search box.
     *
     * Places fly the map; a listing row is handled by the caller; the query
     * row is the text as typed. The canonical spelling of whatever was picked
     * goes back into the box, so what the user reads is what was searched.
     */
    const handleSuggestionClick = useCallback((suggestion: Suggestion) => {
        setIsQueryInputFocused(false);

        if (suggestion.type === 'property') {
            setFilters(prev => ({ ...prev, query: suggestion.property.city }));
            return;
        }

        const value = suggestion.type === 'place' ? suggestion.searchValue : suggestion.title;
        setFilters(prev => ({ ...prev, query: value }));
        setDrawnBoundsJSON(null);

        if (suggestion.type === 'place' && Number.isFinite(suggestion.lat) && Number.isFinite(suggestion.lng)) {
            setFlyToTarget({
                center: [suggestion.lat as number, suggestion.lng as number],
                zoom: suggestion.zoom ?? 12,
            });
        }
    }, []);

    /**
     * Suggestions come from the app-wide engine, so this page offers the same
     * places, under the same names, as every other search box in the app.
     */
    const { suggestions, isSearching: isSearchingLocation } = useUniversalSearch({
        query: filters.query,
        properties: villaProperties,
        enabled: isQueryInputFocused,
    });

    return {
        t,
        state,
        dispatch,
        villaProperties,
        totalVillaCount,
        isLoading,
        error,
        filters,
        listingMode,
        handleListingModeChange,
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
        fetchVillas,
        isSaving,
        handleSaveSearchArea,
        showToast,
        flyTo: (center: [number, number], zoom: number) => setFlyToTarget({ center, zoom }),
    };
}
