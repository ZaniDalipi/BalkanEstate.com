import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/context/AppContext';
import { Property, Filters, initialFilters, SavedSearch } from '@/types';
import type { Suggestion } from '@/src/features/search/universal/types';
import { generateSearchName, generateSearchNameFromCoords } from '@/services/geminiService';
import L from 'leaflet';
import { filterAndSortProperties, filterProperties } from '@/utils/propertyUtils';
import { narrowToMapView } from '@/src/features/search/mapList';
import { frameSearchTarget } from '@/src/features/search/frameSearch';
import { applyQueryToFilters } from '@/src/features/search/universal/queryToFilters';
import { getCountryData } from '@/constants/countries';
import { useRealtimeProperties } from '@/src/features/properties/hooks';
import { API_CONFIG } from '@/src/shared/constants/app.constants';
import { serializeBounds } from '@/src/features/rental/hooks/useRentalSearch';
import { resolveVillaSearchTarget } from './villaSearchTarget';

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

    // What the list is actually filtered by. Same split the buy and rent pages
    // keep: `filters` is what the boxes show, `activeFilters` is what has been
    // applied, so a half-typed place name ("Bud") does not empty the list
    // before the word is finished. Everything but the text query moves both at
    // once; the query is debounced into `activeFilters`.
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

    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [isTablet, setIsTablet] = useState(window.innerWidth >= 768 && window.innerWidth < 1024);
    const [mobileView, setMobileView] = useState<'list' | 'map'>('list');
    const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });
    const [isDrawing, setIsDrawing] = useState(false);
    const [flyToTarget, setFlyToTarget] = useState<{ center: [number, number]; zoom: number } | null>(deepLink.focus);
    const [hoveredPropertyId, setHoveredPropertyId] = useState<string | null>(null);
    const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
    const [mapBoundsJSON, setMapBoundsJSON] = useState<string | null>(null);
    const [drawnBoundsJSON, setDrawnBoundsJSON] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    // True while a searched place is still being resolved to a position.
    const [isSearchingLocation, setIsSearchingLocation] = useState(false);

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

    /**
     * The villa collection, filtered and sorted — but never narrowed by the
     * map: the map draws every villa that matches the filters, and only the
     * list follows the viewport (below), which is how the buy page has always
     * worked.
     *
     * The two locked filters are applied here rather than trusted from state,
     * so nothing typed or deep-linked can take this page off luxury villas or
     * out of the market the visitor picked with the tabs.
     */
    const collectionFilters = useMemo((): Filters => ({
        ...activeFilters,
        propertyType: 'luxury-villa',
        listingType: listingMode === 'any' ? 'any' : listingMode,
    }), [activeFilters, listingMode]);

    const baseFilteredProperties = useMemo(
        () => filterAndSortProperties(villaProperties, collectionFilters),
        [villaProperties, collectionFilters]
    );

    /**
     * The same search with the typed text dropped.
     *
     * A street address is a place, not a word any listing contains: "Obala
     * Iva Novakovića 3" locates a point on the map and matches no villa's
     * text at all. Rather than answer that with an empty page, the text is
     * relaxed once the strict search has come back with nothing and the map
     * view becomes the search — which is what a person who typed an address
     * was asking for. Computed only in that case, never on the common path.
     */
    const needsRelaxedText = baseFilteredProperties.length === 0 && collectionFilters.query.trim() !== '';
    const relaxedProperties = useMemo(() => {
        if (!needsRelaxedText) return null;
        const relaxed = filterAndSortProperties(villaProperties, { ...collectionFilters, query: '' });
        return relaxed.length > 0 ? relaxed : null;
    }, [needsRelaxedText, villaProperties, collectionFilters]);

    /**
     * What the map draws — and the set the list is drawn from, so the two
     * always answer the same question.
     *
     * Handing the map the strict set while the list answered from the relaxed
     * one is how a search for an address ended up listing three villas over an
     * empty map: nothing text-matched "Sun Palasë Residence", so the strict
     * set was empty and every pin disappeared while the cards stayed.
     */
    const mapProperties = relaxedProperties ?? baseFilteredProperties;

    /**
     * What the list shows: the villas inside the current view, with the buy
     * page's rules — a drawn area wins over the viewport, and a view holding
     * nothing shows the nearest villas instead of an empty screen.
     */
    const { listProperties, fallbackLocation } = useMemo(
        () => narrowToMapView({
            properties: mapProperties,
            drawnBounds,
            mapBounds,
            ready: !isLoading,
        }),
        [mapProperties, drawnBounds, mapBounds, isLoading]
    );

    /**
     * True when the list is answering a looser question than the one typed —
     * the text matched no villa, so the map view is doing the searching. The
     * page says so rather than letting the results look like an exact match.
     */
    const isTextRelaxed = relaxedProperties !== null && listProperties.length > 0;

    const showToast = useCallback((message: string, type: 'success' | 'error') => {
        setToast({ show: true, message, type });
    }, []);

    const handleFilterChange = useCallback((key: keyof Filters, value: Filters[keyof Filters]) => {
        if (key === 'propertyType' || key === 'listingType') return; // locked to luxury-villa; the market is the tabs
        const next = { ...filters, [key]: value } as Filters;

        // Picking a country moves the map to it — the filter and the view
        // should never disagree about where the visitor is looking.
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

    const handleListingModeChange = useCallback((mode: VillaListingMode) => {
        setListingMode(mode);
    }, []);

    /**
     * Fly to a searched place, framed so the villas it found are on screen.
     *
     * A place resolves to its own centre at its own zoom, which is not the
     * same thing as a view of the villas there: a resort development on the
     * edge of the town named lands outside that viewport, and the visitor
     * reads cards over an empty map.
     *
     * The listings it frames around are the ones the list will draw from,
     * including the relaxed set, so the map and the list never disagree.
     */
    const flyToSearched = useCallback((target: { center: [number, number]; zoom: number }, forFilters: Filters) => {
        const strict = filterProperties(villaProperties, forFilters);
        const answering = strict.length > 0 ? strict : filterProperties(villaProperties, { ...forFilters, query: '' });
        setFlyToTarget(frameSearchTarget(target, answering) ?? target);
    }, [villaProperties]);

    /**
     * Run whatever is in the box, and take the map with it.
     *
     * The sentence is read first, the way the buy and rent pages read it, so
     * "4 bedroom villa in Budva with a pool under 5000" moves the bedroom,
     * pool and price filters and leaves "Budva" as the place to find. The page
     * stays on luxury villas whatever the sentence says; the market it *can*
     * honour, because the tabs are a control for exactly that.
     *
     * Filtering is client side, so a search is also a refetch of the
     * collection — which is what makes this usable as the error state's
     * "Try Again".
     *
     * Where the map goes is `resolveVillaSearchTarget`'s decision; a query it
     * cannot place is not an error, because the filters have already been
     * applied and the text search stands — the map simply stays where it was.
     */
    const handleSearch = useCallback(async (searchQuery?: unknown) => {
        // Also wired straight to onClick (the error state's "Try Again") and to
        // VillaFilters, so the first argument is not always the query.
        const query = (typeof searchQuery === 'string' ? searchQuery : filters.query).trim();

        void fetchVillas();

        if (!query) {
            applyFilters({ ...filters, query: '' });
            return;
        }

        const { filters: parsedFilters, parsed } = applyQueryToFilters(filters, query);
        applyFilters({ ...parsedFilters, ...VILLA_DEFAULTS });
        const nextMode = parsed.intent.listingType ?? listingMode;
        if (parsed.intent.listingType) setListingMode(parsed.intent.listingType);

        // A sentence that was entirely filters ("with a pool under 5000") has
        // no place in it, and the map should stay where it is.
        const placeQuery = parsed.text.trim();
        if (!placeQuery) return;

        setIsSearchingLocation(true);
        try {
            const target = await resolveVillaSearchTarget(placeQuery, villaProperties);
            if (!target) return;

            setDrawnBoundsJSON(null); // A searched place replaces any drawn area.
            flyToSearched(target, {
                ...parsedFilters,
                ...VILLA_DEFAULTS,
                listingType: nextMode === 'any' ? 'any' : nextMode,
            });
        } finally {
            setIsSearchingLocation(false);
        }
    }, [filters, applyFilters, fetchVillas, villaProperties, listingMode, flyToSearched]);

    /**
     * A destination chip in the hero.
     *
     * The chip already knows exactly where it is, so this searches for its
     * name without asking the gazetteer or the geocoder about it — and
     * toggles off when the chip that is already active is clicked again.
     */
    const handleDestinationSelect = useCallback((destination: { query: string; center: [number, number]; zoom: number }) => {
        const isActive = (filters.query ?? '').trim() === destination.query;
        applyFilters({ ...filters, query: isActive ? '' : destination.query });
        setDrawnBoundsJSON(null);
        if (!isActive) setFlyToTarget({ center: destination.center, zoom: destination.zoom });
    }, [filters, applyFilters]);

    const handleResetFilters = useCallback(() => {
        applyFilters({ ...initialFilters, ...VILLA_DEFAULTS });
        setListingMode('any');
        setDrawnBoundsJSON(null);
        setFlyToTarget({ center: [42.5, 20.5], zoom: 6 });
    }, [applyFilters]);

    const handleSortChange = useCallback((sortBy: string) => {
        applyFilters({ ...filters, sortBy });
    }, [filters, applyFilters]);

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
        if (bounds) applyFilters({ ...filters, query: '' });
        setIsDrawing(false);
    }, [filters, applyFilters]);

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
     * Every row ends with the map somewhere: a place flies to its coordinates,
     * a villa flies to the villa, and the two text rows — the query row that
     * says what Enter will do, and a recent search — are run through
     * `handleSearch`, which resolves the place itself. The canonical spelling
     * of whatever was picked goes back into the box, so what the user reads is
     * what was searched.
     *
     * A Google Places row reaches this already carrying its coordinates: the
     * box makes the second lookup before handing the pick over, so nothing
     * here has to know which source answered.
     */
    const handleSuggestionClick = useCallback((suggestion: Suggestion) => {
        if (suggestion.type === 'property') {
            // Stays on the villas page — the point of picking a villa here is
            // to see where it is among the others, not to leave the map.
            const { city, lat, lng } = suggestion.property;
            applyFilters({ ...filters, query: city });
            setDrawnBoundsJSON(null);
            if (Number.isFinite(lat) && Number.isFinite(lng)) {
                setFlyToTarget({ center: [lat, lng], zoom: 15 });
            }
            return;
        }

        if (suggestion.type === 'place') {
            const { filters: parsedFilters } = applyQueryToFilters(filters, suggestion.searchValue);
            applyFilters({ ...parsedFilters, ...VILLA_DEFAULTS });
            setDrawnBoundsJSON(null);

            if (Number.isFinite(suggestion.lat) && Number.isFinite(suggestion.lng)) {
                flyToSearched({
                    center: [suggestion.lat as number, suggestion.lng as number],
                    zoom: suggestion.zoom ?? 12,
                }, {
                    ...parsedFilters,
                    ...VILLA_DEFAULTS,
                    listingType: listingMode === 'any' ? 'any' : listingMode,
                });
            }
            return;
        }

        // 'query' and 'recent' are both "search for this text" — including
        // finding where it is. Passed explicitly rather than read back off
        // `filters`, which this render has not seen updated yet.
        const value = suggestion.type === 'query' ? suggestion.text : suggestion.title;
        void handleSearch(value);
    }, [filters, applyFilters, handleSearch, flyToSearched, listingMode]);

    // A `?destination=` arriving without coordinates is still a search: the
    // map opens on the place that was linked to rather than on the Balkans.
    // Runs once, and only when the link did not carry its own position.
    const hasRunInitialQuery = useRef(false);
    useEffect(() => {
        if (hasRunInitialQuery.current) return;
        hasRunInitialQuery.current = true;
        if (!deepLink.focus && deepLink.destination) void handleSearch(deepLink.destination);
        // Mount-only: `handleSearch` is re-created on every filter change.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return {
        t,
        state,
        dispatch,
        villaProperties,
        totalVillaCount,
        isLoading,
        error,
        filters,
        activeFilters,
        listingMode,
        handleListingModeChange,
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
        hoveredPropertyId,
        setHoveredPropertyId,
        userLocation,
        mapBounds,
        drawnBounds,
        baseFilteredProperties,
        mapProperties,
        listProperties,
        fallbackLocation,
        isTextRelaxed,
        isSearchingLocation,
        handleSuggestionClick,
        handleDestinationSelect,
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
