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
import { serializeBounds } from '@/src/features/rental/hooks/useRentalSearch';

const VILLA_DEFAULTS: Partial<Filters> = {
    listingType: 'any',
    propertyType: 'luxury-villa',
    beds: 3,
    minPrice: 500,
};

export function useVillaSearch() {
    const { t } = useTranslation(['search', 'villas', 'common']);
    const { state, dispatch, updateSearchPageState, addSavedSearch } = useAppContext();
    const { isAuthenticated, currentUser } = state;

    const [villaProperties, setVillaProperties] = useState<Property[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [filters, setFilters] = useState<Filters>({
        ...initialFilters,
        ...VILLA_DEFAULTS,
    });

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

    const fetchVillas = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            params.set('propertyType', 'luxury-villa');
            params.set('limit', '3000');

            const response = await fetch(`${API_CONFIG.BASE_URL}/properties?${params.toString()}`);
            if (!response.ok) throw new Error(t('villas:fetchError', 'Failed to fetch villas'));
            const data = await response.json();

            const transformed = (data.properties || []).map((p: any) => ({
                ...p,
                id: p.id || p._id,
                sellerId: p.sellerId?.id || p.sellerId?._id || p.sellerId,
                listingType: p.listingType || 'sale',
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

            setVillaProperties(transformed);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchVillas();
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
        const filtered = filterProperties(villaProperties, { ...filters, propertyType: 'luxury-villa' });
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
    }, [villaProperties, filters, mapBounds, drawnBounds]);

    const listProperties = baseFilteredProperties;

    const showToast = useCallback((message: string, type: 'success' | 'error') => {
        setToast({ show: true, message, type });
    }, []);

    const handleFilterChange = useCallback((key: keyof Filters, value: any) => {
        if (key === 'propertyType') return; // always locked to luxury-villa
        setFilters(prev => ({ ...prev, [key]: value }));
    }, []);

    const handleSearch = useCallback(() => {}, []);

    const handleResetFilters = useCallback(() => {
        setFilters({ ...initialFilters, ...VILLA_DEFAULTS });
        setDrawnBoundsJSON(null);
        setFlyToTarget({ center: [42.5, 20.5], zoom: 6 });
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
            const villaFilters = { ...(isAreaOnly ? initialFilters : filters), ...VILLA_DEFAULTS };

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
                newSearch = { id: `ss-${now}`, name: t('search:areaNear', { name, defaultValue: `Area near ${name}` }), filters: { ...initialFilters, ...VILLA_DEFAULTS }, drawnBoundsJSON: serializeBounds(mapBounds), createdAt: now, lastAccessed: now, seenPropertyIds: [] };
            } else {
                showToast(t('search:cannotSaveEmptySearch', 'Cannot save an empty search. Please add some criteria or move to an area on the map.'), 'error');
                setIsSaving(false);
                return;
            }

            await addSavedSearch(newSearch);
            showToast(t('search:searchSaved', 'Search saved successfully!'), 'success');
        } catch (e: any) {
            showToast(e?.message || t('search:couldNotSaveSearch', 'Could not save search.'), 'error');
        } finally {
            setIsSaving(false);
        }
    }, [isAuthenticated, isSaving, dispatch, addSavedSearch, filters, isFormSearchActive, showToast, drawnBounds, mapBounds, t]);

    const handleSaveSearchArea = useCallback(() => handleSaveSearch(true), [handleSaveSearch]);

    const handleSuggestionClick = useCallback((suggestion: NominatimResult) => {
        const lat = parseFloat(suggestion.lat);
        const lng = parseFloat(suggestion.lon);
        if (isNaN(lat) || isNaN(lng)) return;
        const displayName = suggestion.display_name.split(',').slice(0, 2).join(',').trim();
        setFilters(prev => ({ ...prev, query: displayName }));
        setSuggestions([]);
        setDrawnBoundsJSON(null);
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
        }, 500);
        return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
    }, [filters.query, isQueryInputFocused]);

    return {
        t,
        state,
        dispatch,
        villaProperties,
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
        fetchVillas,
        isSaving,
        handleSaveSearchArea,
        showToast,
    };
}
