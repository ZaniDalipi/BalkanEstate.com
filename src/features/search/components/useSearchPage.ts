import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/context/AppContext';
import { useRealtimeProperties } from '@/src/features/properties/hooks';
import { SavedSearch, ChatMessage, AiSearchQuery, Filters, initialFilters, SearchPageState, Property, NominatimResult } from '@/types';
import { generateSearchName, generateSearchNameFromCoords } from '@/services/geminiService';
import { searchLocation } from '@/services/osmService';
import L from 'leaflet';
import { filterProperties } from '@/utils/propertyUtils';
import { BALKAN_COUNTRIES, normalizeCountryKey } from '@/constants/countries';
import { generateSearchSEOTitle, generateSearchSEODescription } from '@/src/components/seo/seoKeywords';

// Helper to serialize Leaflet bounds to a consistent JSON format
export const serializeBounds = (bounds: L.LatLngBounds): string => {
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    return JSON.stringify({
        _southWest: { lat: sw.lat, lng: sw.lng },
        _northEast: { lat: ne.lat, lng: ne.lng }
    });
};

export function useSearchPage() {
    const { t } = useTranslation(['search', 'common']);
    const { state, dispatch, fetchProperties, updateSearchPageState, addSavedSearch } = useAppContext();
    const { properties, isAuthenticated, isLoadingProperties, currentUser, searchPageState } = state;
    const { filters, activeFilters, mapBoundsJSON, drawnBoundsJSON, mobileView, searchMode, aiChatHistory, isAiChatModalOpen, isFiltersOpen, focusMapOnProperty } = searchPageState;

    // Local, non-persistent state
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [isTablet, setIsTablet] = useState(window.innerWidth >= 768 && window.innerWidth < 1024);
    const [isQueryInputFocused, setIsQueryInputFocused] = useState(false);
    const [toast, setToast] = useState<{ show: boolean, message: string, type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });
    const [isSaving, setIsSaving] = useState(false);
    const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
    const shownErrorToast = useRef(false);
    const skipGeolocationRef = useRef(false); // Skip geolocation when navigating from explore cities
    const [isDrawing, setIsDrawing] = useState(false);
    const [flyToTarget, setFlyToTarget] = useState<{ center: [number, number], zoom: number } | null>(null);
    const [localFilters, setLocalFilters] = useState<Filters>(filters);
    const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
    const searchWrapperRef = useRef<HTMLDivElement>(null);
    const [isSearchingLocation, setIsSearchingLocation] = useState(false);
    const debounceTimer = useRef<number | null>(null);
    const [hoveredPropertyId, setHoveredPropertyId] = useState<string | null>(null);
    const [showAllOnMobile, setShowAllOnMobile] = useState(false); // Track if filters were reset on mobile
    const [showMapHint, setShowMapHint] = useState(false); // Show hint about map view on mobile
    const [fallbackLocation, setFallbackLocation] = useState<string | null>(null); // Location name when showing fallback properties
    const [showDrawHint, setShowDrawHint] = useState(false); // Show draw area hint when coming from explore cities

    // Enable real-time property updates via WebSocket
    // When any property is created/updated/deleted, the list refreshes instantly
    // Use fetchProperties directly (it's already a stable useCallback) to avoid
    // re-subscribing to websocket events on every render.
    useRealtimeProperties({
        onPropertyCreated: fetchProperties,
        onPropertyUpdated: fetchProperties,
        onPropertyDeleted: fetchProperties,
    });

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
            setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1024);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Show map hint on mobile after 3 seconds, only once per session
    useEffect(() => {
        if (isMobile && mobileView === 'list') {
            const hasSeenMapHint = sessionStorage.getItem('hasSeenMapHint');
            if (!hasSeenMapHint) {
                const timer = setTimeout(() => {
                    setShowMapHint(true);
                    sessionStorage.setItem('hasSeenMapHint', 'true');
                    // Auto-hide after 5 seconds
                    setTimeout(() => setShowMapHint(false), 5000);
                }, 3000);
                return () => clearTimeout(timer);
            }
        }
    }, [isMobile, mobileView]);

    // Sync local filters when global filters change or when modal is opened
    useEffect(() => {
        if (isFiltersOpen) {
            setLocalFilters(filters);
        }
    }, [isFiltersOpen, filters]);

    // Autocomplete suggestions from OSM
    useEffect(() => {
        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
        }
        if (isQueryInputFocused && filters.query.trim().length > 2) {
            setIsSearchingLocation(true);
            debounceTimer.current = window.setTimeout(async () => {
                const results = await searchLocation(filters.query);
                setSuggestions(results);
                setIsSearchingLocation(false);
            }, 500); // 500ms debounce
        } else {
            setSuggestions([]);
        }
        // Cleanup on unmount
        return () => {
            if (debounceTimer.current) {
                clearTimeout(debounceTimer.current);
            }
        };
    }, [filters.query, isQueryInputFocused]);

    const handleSuggestionClick = useCallback((suggestion: NominatimResult) => {
        setSuggestions([]);

        // Keep a shortened version of the location in the search bar
        // Use the first part of the display name (city/area name)
        const shortName = suggestion.display_name.split(',').slice(0, 2).join(',').trim();
        const newFilters = { ...filters, query: shortName };

        updateSearchPageState({
            filters: newFilters,
            activeFilters: newFilters,
            drawnBoundsJSON: null, // Clear any drawn bounds - show all visible properties
        });

        // User is searching for a specific location, so show only map-visible properties
        setShowAllOnMobile(false);

        // Fly to the location's center - mapBounds will update automatically
        // and properties visible on the map will show in the list
        setFlyToTarget({ center: [Number(suggestion.lat), Number(suggestion.lon)], zoom: 12 });
        setIsQueryInputFocused(false);
    }, [filters, updateSearchPageState]);

    // Close suggestions when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchWrapperRef.current && !searchWrapperRef.current.contains(event.target as Node)) {
                setIsQueryInputFocused(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Handle focusing map on a specific property or city when navigating
    useEffect(() => {
        if (focusMapOnProperty) {
            // Prevent geolocation from overriding this position (e.g., when coming from explore cities)
            skipGeolocationRef.current = true;

            // Set the map to fly to the location - use provided zoom or default to 18 for properties
            setFlyToTarget({
                center: [focusMapOnProperty.lat, focusMapOnProperty.lng],
                zoom: focusMapOnProperty.zoom ?? 18,
            });

            // Show draw hint if this is a city-level zoom (coming from explore cities)
            // City-level zoom is typically 12, property-level is 18
            if (focusMapOnProperty.zoom && focusMapOnProperty.zoom <= 14) {
                setShowDrawHint(true);
                // Auto-hide after 8 seconds
                setTimeout(() => setShowDrawHint(false), 8000);
            }

            // Clear the focus state after triggering the map movement
            updateSearchPageState({ focusMapOnProperty: null });
        }
    }, [focusMapOnProperty, updateSearchPageState]);

    const toggleDrawing = useCallback(() => {
        setIsDrawing(prev => {
            // Clear any existing drawn bounds when toggling drawing mode
            // Starting a new draw replaces the old one; cancelling also clears
            updateSearchPageState({ drawnBoundsJSON: null });
            return !prev;
        });
        // Hide draw hint when user starts drawing
        setShowDrawHint(false);
    }, [updateSearchPageState]);

    const handleClearDrawnArea = useCallback(() => {
        updateSearchPageState({ drawnBoundsJSON: null, activeFilters: filters });
    }, [updateSearchPageState, filters]);

    const handleDrawComplete = useCallback((bounds: L.LatLngBounds | null) => {
        updateSearchPageState({ drawnBoundsJSON: bounds ? serializeBounds(bounds) : null, activeFilters: {...filters, query: ''} });
        setIsDrawing(false);
    }, [updateSearchPageState, filters]);

    const mapBounds = useMemo(() => {
        if (!mapBoundsJSON) return null;
        try {
            const parsed = JSON.parse(mapBoundsJSON);
            return L.latLngBounds(parsed._southWest, parsed._northEast);
        } catch (e) {
            return null;
        }
    }, [mapBoundsJSON]);

    const drawnBounds = useMemo(() => {
        if (!drawnBoundsJSON) return null;
        try {
            const parsed = JSON.parse(drawnBoundsJSON);
            return L.latLngBounds(parsed._southWest, parsed._northEast);
        } catch (e) {
            return null;
        }
    }, [drawnBoundsJSON]);


    // Load sale properties immediately on mount (exclude rentals from buy page)
    useEffect(() => {
        fetchProperties({ ...initialFilters, listingType: 'sale' });
    }, []);

    // Track previous country to detect changes
    const prevCountryRef = useRef<string>(filters.country);

    // Parse URL query parameters on mount and apply as filters
    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search);
        const cityParam = searchParams.get('city');
        const countryParamRaw = searchParams.get('country');
        const propertyTypeParam = searchParams.get('propertyType');
        const latParam = searchParams.get('lat');
        const lngParam = searchParams.get('lng');
        const zoomParam = searchParams.get('zoom');

        // Normalize country param to match BALKAN_COUNTRIES keys
        // Handles: "North Macedonia" → "north-macedonia", "Bosnia and Herzegovina" → "bosnia-herzegovina"
        const countryParam = countryParamRaw ? normalizeCountryKey(countryParamRaw) : null;

        // Handle direct lat/lng coordinates (e.g., from viewing saved measurements)
        if (latParam && lngParam) {
            const lat = parseFloat(latParam);
            const lng = parseFloat(lngParam);
            const zoom = zoomParam ? parseInt(zoomParam, 10) : 18;
            if (!isNaN(lat) && !isNaN(lng)) {
                setFlyToTarget({
                    center: [lat, lng],
                    zoom: zoom
                });
            }
        } else if (cityParam || countryParam || propertyTypeParam) {
            const newFilters = { ...filters };

            if (cityParam) {
                newFilters.query = cityParam;
            }
            if (countryParam) {
                newFilters.country = countryParam;
            }
            if (propertyTypeParam) {
                // Validate that propertyType is a valid option
                const validPropertyTypes = ['any', 'house', 'apartment', 'villa', 'land', 'other'] as const;
                if (validPropertyTypes.includes(propertyTypeParam as typeof validPropertyTypes[number])) {
                    newFilters.propertyType = propertyTypeParam as typeof validPropertyTypes[number];
                }
            }

            // Apply filters from URL
            updateSearchPageState({
                filters: newFilters,
                activeFilters: newFilters,
            });

            // If city is specified, fly to that city location
            if (cityParam && countryParam) {
                // Use searchLocation to get coordinates for the city
                const countryData = BALKAN_COUNTRIES[countryParam];
                searchLocation(`${cityParam}, ${countryData?.name || countryParam}`).then(results => {
                    if (results.length > 0) {
                        setFlyToTarget({
                            center: [Number(results[0].lat), Number(results[0].lon)],
                            zoom: 12
                        });
                    }
                });
            } else if (countryParam && !cityParam) {
                // If only country is specified (no city), fly to country center
                const countryData = BALKAN_COUNTRIES[countryParam];
                if (countryData) {
                    setFlyToTarget({
                        center: countryData.center,
                        zoom: countryData.zoom
                    });
                }
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only run on mount

    // React to country filter changes (e.g., from PropertyCard navigation)
    useEffect(() => {
        const prevCountry = prevCountryRef.current;
        // Normalize the current country to handle various formats
        const currentCountry = filters.country ? normalizeCountryKey(filters.country) : '';

        // Only fly if country actually changed and it's a valid country (not 'any')
        if (prevCountry !== currentCountry && currentCountry && currentCountry !== 'any') {
            const countryData = BALKAN_COUNTRIES[currentCountry];
            if (countryData) {
                // If there's also a city query, search for it within the country
                if (filters.query && filters.query.trim()) {
                    searchLocation(`${filters.query}, ${countryData.name}`).then(results => {
                        if (results.length > 0) {
                            setFlyToTarget({
                                center: [Number(results[0].lat), Number(results[0].lon)],
                                zoom: 12
                            });
                        } else {
                            // Fallback to country center if city not found
                            setFlyToTarget({
                                center: countryData.center,
                                zoom: countryData.zoom
                            });
                        }
                    });
                } else {
                    // Just country selected, fly to country center
                    setFlyToTarget({
                        center: countryData.center,
                        zoom: countryData.zoom
                    });
                }
            }
        }

        prevCountryRef.current = currentCountry;
    }, [filters.country, filters.query]);

    useEffect(() => {
        let timeoutId: number;

        const handleGeoError = (error: GeolocationPositionError) => {
            if (error.code === error.POSITION_UNAVAILABLE) {
                // Warning removed
                return;
            }

            if (!shownErrorToast.current) {
                let message = 'Could not determine your location.';
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        message = 'Location access was denied.';
                        break;
                    case error.TIMEOUT:
                        message = 'Location request timed out.';
                        break;
                }
                showToast(message, 'error');
                shownErrorToast.current = true;
            }
        };

        const getLocation = (highAccuracy = true) => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        // Skip setting user location if navigating from explore cities or similar
                        if (skipGeolocationRef.current) {
                            return;
                        }
                        const { latitude, longitude } = position.coords;
                        if (!userLocation && !filters.query.trim()) {
                           setUserLocation([latitude, longitude]);
                        } else if (!userLocation) {
                           setUserLocation([latitude, longitude]);
                        }
                    },
                    (error) => {
                        if (highAccuracy && error.code === error.POSITION_UNAVAILABLE) {
                            getLocation(false);
                        } else {
                            handleGeoError(error);
                        }
                    },
                    { enableHighAccuracy: highAccuracy, timeout: 10000, maximumAge: 0 }
                );
            }
        };

        getLocation();
        timeoutId = window.setTimeout(() => getLocation(), 5000);
        return () => clearTimeout(timeoutId);
    }, []);

    const showToast = useCallback((message: string, type: 'success' | 'error') => {
        setToast({ show: true, message, type });
    }, []);

    const baseFilteredProperties = useMemo(() => {
        const filtered = filterProperties(properties, activeFilters);
        const now = Date.now();

        // Helper to calculate promotion priority score
        // Premium = Gold (1st), Highlight = Light Blue (2nd), Featured = Pink (3rd)
        const getPromotionScore = (p: Property) => {
            const isActivelyPromoted = p.isPromoted && p.promotionEndDate && p.promotionEndDate > now;
            if (!isActivelyPromoted) return 0;

            const tierScores: Record<string, number> = { premium: 100, highlight: 70, featured: 40, standard: 10 };
            const tierScore = tierScores[p.promotionTier || 'standard'] || 0;
            const urgentBonus = p.hasUrgentBadge ? 5 : 0; // Urgent listings first within tier
            return tierScore + urgentBonus;
        };

        // First sort by promotion score, then apply user's selected sort
        const promotionSorted = [...filtered].sort((a, b) => {
            const scoreA = getPromotionScore(a);
            const scoreB = getPromotionScore(b);
            if (scoreA !== scoreB) return scoreB - scoreA; // Higher score first
            return 0; // Keep original order for same score
        });

        // Helper to convert date/string/number to timestamp
        const toTimestamp = (value: number | string | Date | undefined | null): number => {
            if (!value) return 0;
            if (typeof value === 'number') return value;
            if (typeof value === 'string') return new Date(value).getTime();
            if (value instanceof Date) return value.getTime();
            return 0;
        };

        // Helper to get property timestamp (prioritize lastRenewed over createdAt)
        const getPropertyTime = (p: Property) => {
            const renewed = toTimestamp(p.lastRenewed);
            const created = toTimestamp(p.createdAt);
            return Math.max(renewed, created);
        };

        // Then apply user's sorting preference (maintaining promotion priority)
        switch (activeFilters.sortBy) {
            case 'price_asc': return promotionSorted.sort((a, b) => {
                const scoreA = getPromotionScore(a);
                const scoreB = getPromotionScore(b);
                if (scoreA !== scoreB) return scoreB - scoreA;
                return a.price - b.price;
            });
            case 'price_desc': return promotionSorted.sort((a, b) => {
                const scoreA = getPromotionScore(a);
                const scoreB = getPromotionScore(b);
                if (scoreA !== scoreB) return scoreB - scoreA;
                return b.price - a.price;
            });
            case 'area_asc':
            case 'sqft_asc': return promotionSorted.sort((a, b) => {
                const scoreA = getPromotionScore(a);
                const scoreB = getPromotionScore(b);
                if (scoreA !== scoreB) return scoreB - scoreA;
                return a.sqft - b.sqft;
            });
            case 'area_desc':
            case 'sqft_desc': return promotionSorted.sort((a, b) => {
                const scoreA = getPromotionScore(a);
                const scoreB = getPromotionScore(b);
                if (scoreA !== scoreB) return scoreB - scoreA;
                return b.sqft - a.sqft;
            });
            case 'beds_desc': return promotionSorted.sort((a, b) => {
                const scoreA = getPromotionScore(a);
                const scoreB = getPromotionScore(b);
                if (scoreA !== scoreB) return scoreB - scoreA;
                return b.beds - a.beds;
            });
            case 'baths_desc': return promotionSorted.sort((a, b) => {
                const scoreA = getPromotionScore(a);
                const scoreB = getPromotionScore(b);
                if (scoreA !== scoreB) return scoreB - scoreA;
                return b.baths - a.baths;
            });
            case 'oldest': return promotionSorted.sort((a, b) => {
                const scoreA = getPromotionScore(a);
                const scoreB = getPromotionScore(b);
                if (scoreA !== scoreB) return scoreB - scoreA;
                return (a.createdAt || 0) - (b.createdAt || 0);
            });
            case 'featured': return promotionSorted.sort((a, b) => {
                // Already sorted by promotion score, just maintain that order
                const scoreA = getPromotionScore(a);
                const scoreB = getPromotionScore(b);
                if (scoreA !== scoreB) return scoreB - scoreA;
                return getPropertyTime(b) - getPropertyTime(a);
            });
            case 'price_per_sqm': return promotionSorted.sort((a, b) => {
                const scoreA = getPromotionScore(a);
                const scoreB = getPromotionScore(b);
                if (scoreA !== scoreB) return scoreB - scoreA;
                const pricePerSqmA = a.sqft > 0 ? a.price / a.sqft : Infinity;
                const pricePerSqmB = b.sqft > 0 ? b.price / b.sqft : Infinity;
                return pricePerSqmA - pricePerSqmB;
            });
            case 'year_built_desc': return promotionSorted.sort((a, b) => {
                const scoreA = getPromotionScore(a);
                const scoreB = getPromotionScore(b);
                if (scoreA !== scoreB) return scoreB - scoreA;
                return (b.yearBuilt || 0) - (a.yearBuilt || 0);
            });
            case 'price_reduced': return promotionSorted.sort((a, b) => {
                const scoreA = getPromotionScore(a);
                const scoreB = getPromotionScore(b);
                if (scoreA !== scoreB) return scoreB - scoreA;
                // Properties with discounts first, then by discount percentage
                const hasDiscountA = a.hasDiscount ? 1 : 0;
                const hasDiscountB = b.hasDiscount ? 1 : 0;
                if (hasDiscountA !== hasDiscountB) return hasDiscountB - hasDiscountA;
                return getPropertyTime(b) - getPropertyTime(a);
            });
            case 'newest':
            default:
                // Default to newest - prioritize lastRenewed for renewed listings
                return promotionSorted.sort((a, b) => {
                    const scoreA = getPromotionScore(a);
                    const scoreB = getPromotionScore(b);
                    if (scoreA !== scoreB) return scoreB - scoreA;
                    return getPropertyTime(b) - getPropertyTime(a);
                });
        }
    }, [properties, activeFilters]);

    const { listProperties, fallbackLocationValue } = useMemo(() => {
        // Helper to calculate distance between two points
        const getDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
            return Math.sqrt(Math.pow(lat2 - lat1, 2) + Math.pow(lng2 - lng1, 2));
        };

        // Helper to get smart fallback properties with location priority
        const getSmartFallback = (centerLat: number, centerLng: number): { properties: Property[], location: string | null } => {
            if (baseFilteredProperties.length === 0) {
                return { properties: [], location: null };
            }

            // Find the closest property to determine the search city/country
            const propertiesWithDistance = baseFilteredProperties.map(p => ({
                ...p,
                distance: getDistance(centerLat, centerLng, p.lat, p.lng)
            })).sort((a, b) => a.distance - b.distance);

            const closestProperty = propertiesWithDistance[0];
            const searchCity = closestProperty?.city;
            const searchCountry = closestProperty?.country;

            // Priority 1: Properties in the same city
            const sameCityProps = baseFilteredProperties.filter(p =>
                p.city?.toLowerCase() === searchCity?.toLowerCase()
            );

            if (sameCityProps.length > 0) {
                // Sort by distance from center
                const sorted = sameCityProps.sort((a, b) =>
                    getDistance(centerLat, centerLng, a.lat, a.lng) -
                    getDistance(centerLat, centerLng, b.lat, b.lng)
                );
                return { properties: sorted, location: searchCity || null };
            }

            // Priority 2: Properties in nearby cities (same country, sorted by distance)
            const sameCountryProps = baseFilteredProperties.filter(p =>
                p.country?.toLowerCase() === searchCountry?.toLowerCase()
            );

            if (sameCountryProps.length > 0) {
                // Sort by distance to show nearest cities first
                const sorted = sameCountryProps.sort((a, b) =>
                    getDistance(centerLat, centerLng, a.lat, a.lng) -
                    getDistance(centerLat, centerLng, b.lat, b.lng)
                );
                // Get the city of the closest property in the country
                const nearestCity = sorted[0]?.city;
                return { properties: sorted, location: nearestCity || searchCountry || null };
            }

            // Priority 3: All available properties (sorted by distance)
            const sorted = propertiesWithDistance.sort((a, b) => a.distance - b.distance);
            const nearestLocation = sorted[0]?.city || sorted[0]?.country;
            return { properties: sorted, location: nearestLocation || null };
        };

        // If a specific area is drawn/searched by the user, filter to that area
        if (drawnBounds) {
            const withinDrawn = baseFilteredProperties.filter(p => drawnBounds.contains([p.lat, p.lng]));
            // Only filter by drawn bounds if there are results, otherwise show all
            if (withinDrawn.length > 0) {
                return { listProperties: withinDrawn, fallbackLocationValue: null };
            }
            // No properties in drawn area - fall through to mapBounds check or show all
        }

        // On mobile, show ALL properties only when filters were explicitly reset
        if (isMobile && showAllOnMobile) {
            return { listProperties: baseFilteredProperties, fallbackLocationValue: null };
        }

        // Filter to show only properties visible in the current map view
        // Skip bounds filtering while properties are still loading to avoid
        // showing empty/partial results due to race condition with map init
        if (mapBounds && !isLoadingProperties && baseFilteredProperties.length > 0) {
            const withinView = baseFilteredProperties.filter(p => mapBounds.contains([p.lat, p.lng]));

            // If properties in view, show them
            if (withinView.length > 0) {
                return { listProperties: withinView, fallbackLocationValue: null };
            }

            // No properties in view - use smart fallback
            const center = mapBounds.getCenter();
            const fallback = getSmartFallback(center.lat, center.lng);

            // Safety: never return empty if we have properties
            if (fallback.properties.length === 0) {
                return { listProperties: baseFilteredProperties, fallbackLocationValue: null };
            }

            return { listProperties: fallback.properties, fallbackLocationValue: fallback.location };
        }

        // Fallback to all filtered properties if no bounds set (initial load)
        return { listProperties: baseFilteredProperties, fallbackLocationValue: null };
    }, [baseFilteredProperties, drawnBounds, mapBounds, isMobile, showAllOnMobile, isLoadingProperties]);

    // Update fallback location state when computed value changes
    useEffect(() => {
        setFallbackLocation(fallbackLocationValue);
    }, [fallbackLocationValue]);


    const handleFilterChange = useCallback(<K extends keyof Filters>(name: K, value: Filters[K]) => {
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
                    drawnBoundsJSON: serializeBounds(bounds), // Set the country bounds as the search area
                });
                return;
            }
        }

        // Apply filters in real-time by updating both filters and activeFilters
        updateSearchPageState({ filters: newFilters, activeFilters: newFilters });
    }, [filters, updateSearchPageState]);

    const handleSearch = useCallback(async (searchQuery?: string) => {
        setSuggestions([]);
        const query = (searchQuery || filters.query).trim();

        if (!query) {
            updateSearchPageState({ activeFilters: filters, drawnBoundsJSON: null });
            return;
        }

        setIsSearchingLocation(true);
        const results = await searchLocation(query);
        setIsSearchingLocation(false);

        if (results.length > 0) {
            handleSuggestionClick(results[0]);
        } else {
            showToast("Location not found. Showing text-based results.", 'error');
            updateSearchPageState({ activeFilters: filters, drawnBoundsJSON: null });
        }
    }, [filters, updateSearchPageState, showToast, handleSuggestionClick]);

    const handleLocalFilterChange = useCallback(<K extends keyof Filters>(name: K, value: Filters[K]) => {
        setLocalFilters(prev => ({ ...prev, [name]: value }));
    }, []);

    const handleResetFilters = useCallback(() => {
        const resetState: Partial<SearchPageState> = {
            filters: initialFilters,
            activeFilters: initialFilters,
            drawnBoundsJSON: null,
        };
        if (isMobile) {
            resetState.isFiltersOpen = false;
            // On mobile, after reset filters, show ALL properties regardless of map position
            setShowAllOnMobile(true);
        }
        updateSearchPageState(resetState);
        setLocalFilters(initialFilters);
        setFlyToTarget({ center: [44.2, 19.9], zoom: 7 });
    }, [isMobile, updateSearchPageState]);

    const handleSortChange = useCallback((value: string) => {
        updateSearchPageState({
            filters: { ...filters, sortBy: value },
            activeFilters: { ...activeFilters, sortBy: value },
        });
    }, [filters, activeFilters, updateSearchPageState]);

    const isFormSearchActive = useMemo(() => {
        return filters.query.trim() !== '' || filters.minPrice !== null || filters.maxPrice !== null || filters.beds !== null || filters.baths !== null || filters.livingRooms !== null || filters.minSqft !== null || filters.maxSqft !== null || filters.sellerType !== 'any' || filters.propertyType !== 'any';
    }, [filters]);

    const handleSaveSearch = useCallback(async (isAreaOnly: boolean = false) => {
        if (!isAuthenticated) {
            dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true, view: 'signup' } });
            return;
        }
        setIsSaving(true);
        try {
            let newSearch: SavedSearch;
            const now = Date.now();

            if (drawnBounds) { // Priority 1: A user-drawn area
                const center = drawnBounds.getCenter();
                const name = await generateSearchNameFromCoords(center.lat, center.lng, drawnBounds);
                const serializedBounds = serializeBounds(drawnBounds);
                newSearch = {
                    id: `ss-${now}`,
                    name,
                    filters: isAreaOnly ? initialFilters : filters,
                    drawnBoundsJSON: serializedBounds, // Always use serializeBounds for consistent format
                    createdAt: now,
                    lastAccessed: now,
                    seenPropertyIds: [],
                };
            } else if (isFormSearchActive) { // Priority 2: Active text/form filters
                const name = await generateSearchName(filters);
                newSearch = {
                    id: `ss-${now}`,
                    name,
                    filters,
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
                    filters: initialFilters, // Save only the area, not other empty filters
                    drawnBoundsJSON: serializeBounds(mapBounds), // Save the current map view as the search area
                    createdAt: now,
                    lastAccessed: now,
                    seenPropertyIds: [],
                };
            }
            else {
                showToast("Cannot save an empty search. Please add some criteria or move to an area on the map.", 'error');
                setIsSaving(false);
                return;
            }

            await addSavedSearch(newSearch);
            showToast("Search saved successfully!", 'success');
        } catch (e) {
            // Error removed
            showToast("Could not save search. AI might be busy.", 'error');
        } finally {
            setIsSaving(false);
        }
    }, [isAuthenticated, dispatch, addSavedSearch, filters, isFormSearchActive, showToast, drawnBounds, mapBounds]);

    const handleMapMove = useCallback((newBounds: L.LatLngBounds, newCenter: L.LatLng) => {
        if (isMobile && isFiltersOpen) return;

        // User moved the map, so go back to showing only map-visible properties
        if (isMobile && showAllOnMobile) {
            setShowAllOnMobile(false);
        }

        // Update property list immediately - no delay
        const newState: Partial<SearchPageState> = { mapBoundsJSON: serializeBounds(newBounds) };
        updateSearchPageState(newState);
    }, [isMobile, isFiltersOpen, showAllOnMobile, updateSearchPageState]);


    const handleRecenterOnUser = useCallback(() => {
        if (userLocation) {
            setFlyToTarget({ center: userLocation, zoom: 14 });
        } else {
            showToast("Your location is not available.", "error");
        }
    }, [userLocation, showToast]);

    // Reset map view to show the full Balkans region
    const handleResetView = useCallback(() => {
        setFlyToTarget({ center: [42.5, 20.5], zoom: 6 });
    }, []);

    const handleApplyAiFilters = useCallback(async (aiQuery: AiSearchQuery) => {
        // Map for normalizing country names to our key format
        const countryNameToKey: Record<string, string> = {
            'albania': 'albania',
            'bosnia': 'bosnia-herzegovina',
            'bosnia and herzegovina': 'bosnia-herzegovina',
            'bulgaria': 'bulgaria',
            'croatia': 'croatia',
            'greece': 'greece',
            'kosovo': 'kosovo',
            'montenegro': 'montenegro',
            'north macedonia': 'north-macedonia',
            'macedonia': 'north-macedonia',
            'romania': 'romania',
            'serbia': 'serbia',
        };

        // Check if a string is a country name
        const isCountryName = (str?: string): boolean => {
            if (!str) return false;
            return str.toLowerCase() in countryNameToKey;
        };

        // Get normalized country key from name
        const normalizeCountryFromAi = (country?: string): string => {
            if (!country) return 'any';
            return countryNameToKey[country.toLowerCase()] || 'any';
        };

        // Determine the country key - from explicit country field or from location if it's a country name
        const countryFromLocation = aiQuery.location && isCountryName(aiQuery.location)
            ? normalizeCountryFromAi(aiQuery.location)
            : null;
        const countryKey = normalizeCountryFromAi(aiQuery.country) !== 'any'
            ? normalizeCountryFromAi(aiQuery.country)
            : countryFromLocation || 'any';

        // Only put city/area in query, not country names
        const locationIsCountry = aiQuery.location && isCountryName(aiQuery.location);
        const queryValue = locationIsCountry ? '' : (aiQuery.location || '');

        // Only include fields that were explicitly provided by the AI
        // Don't override defaults with AI-generated values the user didn't request
        const newFilters: Partial<Filters> = {
            query: queryValue,
            country: countryKey,
            minPrice: aiQuery.minPrice || null,
            maxPrice: aiQuery.maxPrice || null,
            beds: aiQuery.beds || null,
            baths: aiQuery.baths || null,
            livingRooms: aiQuery.livingRooms || null,
            minSqft: aiQuery.minSqft || null,
            maxSqft: aiQuery.maxSqft || null,
        };

        // Only set propertyType if AI explicitly provided it
        if (aiQuery.propertyType) {
            newFilters.propertyType = aiQuery.propertyType === 'commercial' ? 'other' : aiQuery.propertyType;
        }

        // Only set sellerType if AI explicitly provided it (user asked for agent/private)
        if (aiQuery.sellerType) {
            newFilters.sellerType = aiQuery.sellerType;
        }
        const updatedFilters = { ...initialFilters, ...newFilters };

        updateSearchPageState({ filters: updatedFilters, activeFilters: updatedFilters, searchMode: 'manual', isAiChatModalOpen: false });
        updateSearchPageState({ isFiltersOpen: false });

        // Navigate map based on location type
        // If location is a country name, use our BALKAN_COUNTRIES data directly
        if (locationIsCountry && countryKey !== 'any') {
            const countryData = BALKAN_COUNTRIES[countryKey];
            if (countryData) {
                const bounds = L.latLngBounds(countryData.bounds[0], countryData.bounds[1]);
                updateSearchPageState({
                    drawnBoundsJSON: serializeBounds(bounds),
                });
                setFlyToTarget({ center: countryData.center, zoom: countryData.zoom });
                return;
            }
        }

        // If we have a country but location is a city, search for "city, country" for better OSM results
        if (aiQuery.location && !locationIsCountry) {
            try {
                // Build search query with English country name for better OSM results
                let searchQuery = aiQuery.location;
                if (countryKey !== 'any') {
                    const countryData = BALKAN_COUNTRIES[countryKey];
                    if (countryData) {
                        searchQuery = `${aiQuery.location}, ${countryData.name}`;
                    }
                }

                const results = await searchLocation(searchQuery);

                if (results.length > 0) {
                    const [south, north, west, east] = results[0].boundingbox.map(Number);
                    const searchBounds = L.latLngBounds([
                        [south, west],
                        [north, east],
                    ]);

                    updateSearchPageState({
                        mapBoundsJSON: serializeBounds(searchBounds),
                        drawnBoundsJSON: serializeBounds(searchBounds),
                    });
                    setFlyToTarget({ center: [Number(results[0].lat), Number(results[0].lon)], zoom: 12 });
                }
            } catch (error) {
                // Error removed
            }
        } else if (countryKey !== 'any' && !aiQuery.location) {
            // Only country specified (from country field), no city - fly to country
            const countryData = BALKAN_COUNTRIES[countryKey];
            if (countryData) {
                const bounds = L.latLngBounds(countryData.bounds[0], countryData.bounds[1]);
                updateSearchPageState({
                    drawnBoundsJSON: serializeBounds(bounds),
                });
                setFlyToTarget({ center: countryData.center, zoom: countryData.zoom });
            }
        }
    }, [updateSearchPageState]);


    const handleApplyFiltersFromModal = useCallback(() => {
        updateSearchPageState({
            filters: localFilters,
            activeFilters: localFilters,
            isFiltersOpen: false,
            drawnBoundsJSON: null,
        });
    }, [localFilters, updateSearchPageState]);

    const onFlyComplete = useCallback(() => setFlyToTarget(null), []);

    // Named handlers - no inline functions
    const handleSaveSearchArea = useCallback(() => handleSaveSearch(true), [handleSaveSearch]);
    const handleSaveSearchFilters = useCallback(() => handleSaveSearch(false), [handleSaveSearch]);
    const handleSearchClick = useCallback(() => handleSearch(), [handleSearch]);
    const handleSearchModeChange = useCallback((mode: 'manual' | 'ai') => {
        updateSearchPageState({ searchMode: mode });
    }, [updateSearchPageState]);
    const handleAiChatHistoryChange = useCallback((newHistory: ChatMessage[]) => {
        updateSearchPageState({ aiChatHistory: newHistory });
    }, [updateSearchPageState]);

    // Generate dynamic SEO based on current filters using keyword-optimized data
    const seoTitle = useMemo(() => {
        return generateSearchSEOTitle({
            country: filters.country && filters.country !== 'all' ? filters.country : undefined,
            city: filters.query || undefined,
            propertyType: filters.propertyType && filters.propertyType !== 'all' ? filters.propertyType : undefined,
            query: filters.query || undefined,
        });
    }, [filters.country, filters.query, filters.propertyType]);

    const seoDescription = useMemo(() => {
        return generateSearchSEODescription({
            country: filters.country && filters.country !== 'all' ? filters.country : undefined,
            city: filters.query || undefined,
            propertyType: filters.propertyType && filters.propertyType !== 'all' ? filters.propertyType : undefined,
            query: filters.query || undefined,
            minPrice: filters.minPrice || undefined,
            maxPrice: filters.maxPrice || undefined,
            beds: filters.beds || undefined,
        });
    }, [filters]);

    return {
        // Translation
        t,
        // Context & state
        state,
        dispatch,
        updateSearchPageState,
        properties,
        isAuthenticated,
        isLoadingProperties,
        currentUser,
        // Search page state (from context)
        filters,
        activeFilters,
        mobileView,
        searchMode,
        aiChatHistory,
        isAiChatModalOpen,
        isFiltersOpen,
        // Local state
        isMobile,
        isTablet,
        isQueryInputFocused,
        setIsQueryInputFocused,
        toast,
        setToast,
        isSaving,
        isDrawing,
        flyToTarget,
        localFilters,
        suggestions,
        searchWrapperRef,
        isSearchingLocation,
        hoveredPropertyId,
        setHoveredPropertyId,
        showMapHint,
        setShowMapHint,
        showDrawHint,
        setShowDrawHint,
        fallbackLocation,
        // Computed
        mapBounds,
        drawnBounds,
        baseFilteredProperties,
        listProperties,
        seoTitle,
        seoDescription,
        // Handlers
        handleSuggestionClick,
        toggleDrawing,
        handleClearDrawnArea,
        handleDrawComplete,
        handleFilterChange,
        handleSearch,
        handleLocalFilterChange,
        handleResetFilters,
        handleSortChange,
        handleSaveSearch,
        handleSaveSearchArea,
        handleSaveSearchFilters,
        handleSearchClick,
        handleSearchModeChange,
        handleAiChatHistoryChange,
        handleMapMove,
        handleRecenterOnUser,
        handleResetView,
        handleApplyAiFilters,
        handleApplyFiltersFromModal,
        onFlyComplete,
        userLocation,
    };
}
