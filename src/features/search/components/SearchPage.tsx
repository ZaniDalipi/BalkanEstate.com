import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/context/AppContext';
import MapComponent from '@/src/features/map/components/MapComponent';
import PropertyList from './PropertyList';
import { SavedSearch, ChatMessage, AiSearchQuery, Filters, initialFilters, SearchPageState, Property, NominatimResult } from '@/types';
import { getAiChatResponse, generateSearchName, generateSearchNameFromCoords } from '@/services/geminiService';
import { searchLocation } from '@/services/osmService';
import Toast from '@/components/shared/Toast';
import L from 'leaflet';
import { Bars3Icon, SearchIcon, UserCircleIcon, XMarkIcon, AdjustmentsHorizontalIcon, MapPinIcon, Squares2x2Icon, BellIcon, PencilIcon, PlusIcon, SparklesIcon, CrosshairsIcon, XCircleIcon, MapIcon, SpinnerIcon } from '@/constants';
import { LiquidGlassSwitch } from '@/src/components/ui/LiquidGlassSwitch';
import { filterProperties } from '@/utils/propertyUtils';
import AiSearch from './AiSearch';
import Modal from '@/components/shared/Modal';
import { COUNTRY_OPTIONS, BALKAN_COUNTRIES, normalizeCountryKey } from '@/constants/countries';
import { SEO, generateSearchBreadcrumbs, Breadcrumbs } from '@/src/components/seo';

// Helper to serialize Leaflet bounds to a consistent JSON format
const serializeBounds = (bounds: L.LatLngBounds): string => {
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    return JSON.stringify({
        _southWest: { lat: sw.lat, lng: sw.lng },
        _northEast: { lat: ne.lat, lng: ne.lng }
    });
};

interface SearchPageProps {
    onToggleSidebar: () => void;
}

const AiChatModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    properties: Property[];
    onApplyFilters: (query: AiSearchQuery) => void;
    history: ChatMessage[];
    onHistoryChange: (history: ChatMessage[]) => void;
}> = ({ isOpen, onClose, ...aiSearchProps }) => (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" title="AI Property Search">
        <div className="h-[70vh] flex flex-col">
            <AiSearch {...aiSearchProps} isMobile={true} />
        </div>
    </Modal>
);

// Type for props passed to PropertyList (matching its interface)
interface PropertyListPropsForMobile {
    properties: Property[];
    filters: Filters;
    onFilterChange: <K extends keyof Filters>(name: K, value: Filters[K]) => void;
    onSearchClick: () => void;
    onResetFilters: () => void;
    onSortChange: (value: string) => void;
    onSaveSearch: () => void;
    isSaving: boolean;
    isMobile: boolean;
    showFilters: boolean;
    showList: boolean;
    searchMode: 'manual' | 'ai';
    onSearchModeChange: (mode: 'manual' | 'ai') => void;
    onApplyAiFilters: (query: AiSearchQuery) => void;
    isAreaDrawn: boolean;
    aiChatHistory: ChatMessage[];
    onAiChatHistoryChange: (history: ChatMessage[]) => void;
    onDrawStart: () => void;
    isDrawing: boolean;
    isSearchingLocation: boolean;
    onPropertyHover?: (propertyId: string | null) => void;
    suggestions?: NominatimResult[];
    onSuggestionClick?: (suggestion: NominatimResult) => void;
    isQueryInputFocused?: boolean;
    onQueryInputFocusChange?: (focused: boolean) => void;
    fallbackLocation?: string | null;
}

const MobileFilters: React.FC<{
    onClose: () => void;
    propertyListProps: PropertyListPropsForMobile;
    localFilters: Filters;
    onLocalFilterChange: <K extends keyof Filters>(name: K, value: Filters[K]) => void;
    onReset: () => void;
    onSave: () => void;
    isSaving: boolean;
    onApply: () => void;
    searchMode: 'manual' | 'ai';
    t: (key: string) => string;
}> = ({ onClose, propertyListProps, localFilters, onLocalFilterChange, onReset, onSave, isSaving, onApply, searchMode, t }) => (
    <div className="bg-white h-full w-full flex flex-col" role="dialog" aria-modal="true" aria-labelledby="filters-title">
        <div className="flex-shrink-0 p-3 sm:p-4 border-b border-neutral-200 flex justify-between items-center landscape:p-2">
            <h2 id="filters-title" className="text-base sm:text-lg font-bold text-neutral-800">{t('search:filters.title')}</h2>
            <button
                onClick={onClose}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-neutral-500 hover:text-neutral-800 rounded-full hover:bg-neutral-100 transition-colors touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                aria-label="Close filters"
            >
                <XMarkIcon className="w-6 h-6" />
            </button>
        </div>
        <div className="flex-shrink-0 p-3 sm:p-4 bg-neutral-50 border-b border-neutral-200 landscape:p-2">
            <label htmlFor="country-select" className="block text-xs font-medium text-neutral-700 mb-1.5 sm:mb-2">{t('search:filters.country')}</label>
            <select
                id="country-select"
                value={localFilters.country}
                onChange={(e) => onLocalFilterChange('country', e.target.value)}
                className="w-full bg-white border border-neutral-300 rounded-lg text-neutral-900 shadow-sm px-3 py-2.5 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors text-sm font-medium"
            >
                <option value="any">{t('search:filters.allCountries')}</option>
                {Object.entries(BALKAN_COUNTRIES).map(([key, country]) => (
                    <option key={key} value={key}>
                        {country.name}
                    </option>
                ))}
            </select>
        </div>
        <div className="flex-grow overflow-y-auto min-h-0 pt-3 sm:pt-4 landscape:pt-2">
            <PropertyList
                {...propertyListProps}
                filters={localFilters}
                onFilterChange={onLocalFilterChange}
                isMobile={true}
                showFilters={true}
                showList={false}
            />
        </div>
        {searchMode === 'manual' && (
            <div className="flex-shrink-0 p-3 sm:p-4 border-t border-neutral-200 bg-white flex items-center gap-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))] landscape:p-2 landscape:pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
                 <button
                    onClick={onReset}
                    className="min-h-[44px] px-3 py-2 border border-neutral-300 rounded-lg text-sm font-semibold text-neutral-700 hover:bg-neutral-100 active:bg-neutral-200 transition-colors touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                 >
                    Reset
                 </button>
                 <button
                    onClick={onSave}
                    disabled={isSaving}
                    className="min-h-[44px] px-3 py-2 border border-neutral-300 rounded-lg text-sm font-semibold text-neutral-700 hover:bg-neutral-100 active:bg-neutral-200 transition-colors disabled:opacity-50 touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                 >
                    {isSaving ? 'Saving...' : 'Save Search'}
                 </button>
                 <button
                    onClick={onApply}
                    className="flex-grow min-h-[44px] px-3 py-2 bg-primary text-white font-bold rounded-lg shadow-md hover:bg-primary-dark active:bg-primary-dark transition-colors touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary/50"
                 >
                    Show Results
                 </button>
            </div>
        )}
    </div>
);


const SearchPage: React.FC<SearchPageProps> = ({ onToggleSidebar }) => {
    const { t } = useTranslation(['search', 'common']);
    const { state, dispatch, fetchProperties, updateSearchPageState, addSavedSearch } = useAppContext();
    const { properties, isAuthenticated, currentUser, searchPageState } = state;
    const { filters, activeFilters, mapBoundsJSON, drawnBoundsJSON, mobileView, searchMode, aiChatHistory, isAiChatModalOpen, isFiltersOpen, focusMapOnProperty } = searchPageState;

    // Local, non-persistent state
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [isQueryInputFocused, setIsQueryInputFocused] = useState(false);
    const [toast, setToast] = useState<{ show: boolean, message: string, type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });
    const [isSaving, setIsSaving] = useState(false);
    const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
    const shownErrorToast = useRef(false);
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


    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
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

    const handleSuggestionClick = (suggestion: NominatimResult) => {
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
    };

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

    // Handle focusing map on a specific property when navigating from property details
    useEffect(() => {
        if (focusMapOnProperty) {
            // Set the map to fly to the property location
            setFlyToTarget({
                center: [focusMapOnProperty.lat, focusMapOnProperty.lng],
                zoom: 18, // Zoom in closer for individual property
            });

            // Clear the focus state after triggering the map movement
            updateSearchPageState({ focusMapOnProperty: null });
        }
    }, [focusMapOnProperty, updateSearchPageState]);

    const toggleDrawing = () => {
        setIsDrawing(prev => !prev);
    };

    const handleClearDrawnArea = () => {
        updateSearchPageState({ drawnBoundsJSON: null, activeFilters: filters });
    };

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


    // Load properties immediately on mount, not conditionally
    useEffect(() => {
        fetchProperties();
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
                console.warn(`Geolocation warning: ${error.message} (code: ${error.code})`);
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
        if (mapBounds) {
            const withinView = baseFilteredProperties.filter(p => mapBounds.contains([p.lat, p.lng]));

            // If properties in view, show them
            if (withinView.length > 0) {
                return { listProperties: withinView, fallbackLocationValue: null };
            }

            // No properties in view - use smart fallback
            if (baseFilteredProperties.length > 0) {
                const center = mapBounds.getCenter();
                const fallback = getSmartFallback(center.lat, center.lng);

                // Safety: never return empty if we have properties
                if (fallback.properties.length === 0) {
                    return { listProperties: baseFilteredProperties, fallbackLocationValue: null };
                }

                return { listProperties: fallback.properties, fallbackLocationValue: fallback.location };
            }

            return { listProperties: [], fallbackLocationValue: null };
        }

        // Fallback to all filtered properties if no bounds set (initial load)
        return { listProperties: baseFilteredProperties, fallbackLocationValue: null };
    }, [baseFilteredProperties, drawnBounds, mapBounds, isMobile, showAllOnMobile]);

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
    }, [filters, updateSearchPageState, showToast]);
    
    const handleLocalFilterChange = <K extends keyof Filters>(name: K, value: Filters[K]) => {
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
            console.error("Failed to save search:", e);
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


    const handleRecenterOnUser = () => {
        if (userLocation) {
            setFlyToTarget({ center: userLocation, zoom: 14 });
        } else {
            showToast("Your location is not available.", "error");
        }
    };

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
                console.error("[AI Search] Error searching location:", error);
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


    const handleApplyFiltersFromModal = () => {
        updateSearchPageState({
            filters: localFilters,
            activeFilters: localFilters,
            isFiltersOpen: false,
            drawnBoundsJSON: null,
        });
    };
    
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

    const mapProps = {
        properties: baseFilteredProperties,
        onMapMove: handleMapMove,
        userLocation: userLocation,
        onSaveSearch: handleSaveSearchArea,
        isSaving: isSaving,
        isAuthenticated: isAuthenticated,
        mapBounds: mapBounds,
        drawnBounds: drawnBounds,
        onDrawComplete: handleDrawComplete,
        isDrawing: isDrawing,
        onDrawStart: toggleDrawing,
        flyToTarget: flyToTarget,
        onFlyComplete: onFlyComplete,
        onRecenter: handleRecenterOnUser,
        isMobile: isMobile,
        searchMode: searchMode,
        hoveredPropertyId: hoveredPropertyId,
    };

    const propertyListProps = {
        properties: listProperties,
        filters: filters,
        onFilterChange: handleFilterChange,
        onSearchClick: handleSearchClick,
        onResetFilters: handleResetFilters,
        onSortChange: handleSortChange,
        onSaveSearch: handleSaveSearchFilters,
        isSaving: isSaving,
        isMobile: isMobile,
        showFilters: !isMobile,
        showList: true,
        searchMode: searchMode,
        onSearchModeChange: handleSearchModeChange,
        onApplyAiFilters: handleApplyAiFilters,
        isAreaDrawn: !!drawnBounds,
        aiChatHistory: aiChatHistory,
        onAiChatHistoryChange: handleAiChatHistoryChange,
        onDrawStart: toggleDrawing,
        isDrawing: isDrawing,
        isSearchingLocation: isSearchingLocation,
        onPropertyHover: setHoveredPropertyId,
        suggestions: suggestions,
        onSuggestionClick: handleSuggestionClick,
        isQueryInputFocused: isQueryInputFocused,
        onQueryInputFocusChange: setIsQueryInputFocused,
        fallbackLocation: fallbackLocation,
    };

    // Generate dynamic SEO based on current filters
    const seoTitle = useMemo(() => {
        const parts: string[] = [];
        if (filters.country && filters.country !== 'all') {
            parts.push(`Properties in ${filters.country}`);
        } else {
            parts.push('Properties in the Balkans');
        }
        if (filters.query) {
            parts[0] = `Properties in ${filters.query}`;
        }
        return parts[0];
    }, [filters.country, filters.query]);

    const seoDescription = useMemo(() => {
        let desc = 'Browse ';
        if (filters.beds) desc += `${filters.beds}+ bedroom `;
        desc += 'houses, apartments, and villas for sale';
        if (filters.country && filters.country !== 'all') {
            desc += ` in ${filters.country}`;
        } else if (filters.query) {
            desc += ` in ${filters.query}`;
        } else {
            desc += ' across the Balkans';
        }
        if (filters.minPrice || filters.maxPrice) {
            desc += '. Price range: ';
            if (filters.minPrice) desc += `€${filters.minPrice.toLocaleString()}`;
            if (filters.minPrice && filters.maxPrice) desc += ' - ';
            if (filters.maxPrice) desc += `€${filters.maxPrice.toLocaleString()}`;
        }
        desc += '. Find your dream property with Balkan Estate.';
        return desc;
    }, [filters]);

    const renderSearchInput = (isMobileInput: boolean) => (
         <div className="relative flex-grow" ref={isMobileInput ? null : searchWrapperRef}>
            {!isMobileInput && <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><SearchIcon className="h-4 w-4 text-neutral-400" /></div>}
            {isMobileInput && <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2"><SearchIcon className="h-5 w-5 text-neutral-500" /></div>}
            <input
                type="text"
                name="query"
                placeholder="Search city, address..."
                value={filters.query}
                onChange={(e) => handleFilterChange('query', e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                onFocus={() => setIsQueryInputFocused(true)}
                className={isMobileInput
                    ? "block w-full text-base bg-transparent border-none text-neutral-900 px-9 py-1 focus:outline-none focus:ring-0"
                    : "block w-full bg-white border border-neutral-300 rounded-xl text-neutral-900 text-sm px-3 py-2 pl-9 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-neutral-400"
                }
            />
            {filters.query && !isSearchingLocation && (<div className="absolute inset-y-0 right-0 flex items-center pr-2"><button onClick={() => handleFilterChange('query', '')} className="text-neutral-400 hover:text-neutral-800"><XMarkIcon className="h-5 w-5" /></button></div>)}
            {isSearchingLocation && <div className="absolute inset-y-0 right-0 flex items-center pr-2"><SpinnerIcon className="h-5 w-5 text-primary" /></div>}
            {suggestions.length > 0 && isQueryInputFocused && (
                <ul className="absolute z-20 w-full mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {suggestions.map((suggestion) => (
                        <li key={suggestion.place_id} onMouseDown={() => handleSuggestionClick(suggestion)} className="px-4 py-3 text-sm text-neutral-700 hover:bg-neutral-100 cursor-pointer flex items-center gap-2">
                             <MapPinIcon className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                            <span>{suggestion.display_name}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );

    return (
        <div className={`relative flex h-full w-full flex-col md:flex-row ${isMobile && isFiltersOpen ? 'overflow-hidden' : ''}`}>
            {/* Dynamic SEO for Search Page */}
            <SEO
                title={seoTitle}
                description={seoDescription}
                canonical={`${window.location.origin}/search`}
                type="website"
            />

             <div className="absolute inset-0 z-0 bg-neutral-50"></div>
            <Toast show={toast.show} message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, show: false })} />
            <AiChatModal
                isOpen={isAiChatModalOpen}
                onClose={() => updateSearchPageState({ isAiChatModalOpen: false })}
                properties={properties}
                onApplyFilters={handleApplyAiFilters}
                history={aiChatHistory}
                onHistoryChange={(newHistory: ChatMessage[]) => updateSearchPageState({ aiChatHistory: newHistory })}
            />
            
            {/* Main Content Wrapper */}
            <div className={`flex h-full w-full flex-col md:flex-row transition-all duration-300 relative ${isMobile && isFiltersOpen ? 'blur-sm pointer-events-none' : ''}`}>
                {/* --- Left Panel: List & Filters --- */}
                 <div className={`absolute inset-0 z-10 h-full w-full bg-white md:relative md:w-[55%] md:flex-shrink-0 md:border-r md:border-neutral-200 md:flex md:flex-col ${ isMobile && mobileView === 'list' ? 'translate-x-0' : '-translate-x-full md:translate-x-0' } transition-transform duration-300`}>
                    <div className="hidden md:flex p-3 border-b border-neutral-200 flex-shrink-0 items-center gap-3 relative z-[100] bg-white">
                        <h2 className="text-base font-semibold text-neutral-800 flex-shrink-0">{t('search:propertiesForSale')}</h2>
                        {/* Desktop Search Bar */}
                        <div className="flex-grow max-w-md" ref={searchWrapperRef}>
                            <div className="relative">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <SearchIcon className="h-4 w-4 text-neutral-400" />
                                </div>
                                <input
                                    type="text"
                                    placeholder={t('search:searchPlaceholder')}
                                    value={filters.query}
                                    onChange={(e) => handleFilterChange('query', e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    onFocus={() => setIsQueryInputFocused(true)}
                                    className="block w-full bg-white border border-neutral-300 rounded-xl text-neutral-900 text-sm px-3 py-2 pl-9 pr-8 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-neutral-400"
                                />
                                {filters.query && !isSearchingLocation && (
                                    <button
                                        onClick={() => handleFilterChange('query', '')}
                                        className="absolute inset-y-0 right-0 flex items-center pr-2 text-neutral-400 hover:text-neutral-800"
                                    >
                                        <XMarkIcon className="h-4 w-4" />
                                    </button>
                                )}
                                {isSearchingLocation && (
                                    <div className="absolute inset-y-0 right-0 flex items-center pr-2">
                                        <SpinnerIcon className="h-4 w-4 text-primary" />
                                    </div>
                                )}
                                {suggestions.length > 0 && isQueryInputFocused && (
                                    <ul className="absolute z-30 w-full mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                        {suggestions.map((suggestion) => (
                                            <li
                                                key={suggestion.place_id}
                                                onMouseDown={() => handleSuggestionClick(suggestion)}
                                                className="px-4 py-3 text-sm text-neutral-700 hover:bg-neutral-100 cursor-pointer flex items-center gap-2"
                                            >
                                                <MapPinIcon className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                                                <span>{suggestion.display_name}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                        <select
                            value={filters.country}
                            onChange={(e) => handleFilterChange('country', e.target.value)}
                            className="bg-white border border-neutral-300 rounded-xl text-neutral-900 text-sm px-3 py-2 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all appearance-none cursor-pointer flex-shrink-0"
                            style={{ backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")", backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em', paddingRight: '2.5rem' }}
                        >
                            <option value="any">{t('search:filters.allCountries')}</option>
                            {Object.entries(BALKAN_COUNTRIES).map(([key, country]) => (
                                <option key={key} value={key}>
                                    {country.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <PropertyList {...propertyListProps} />
                </div>


                {/* --- Right Panel: Map --- */}
                <div className="h-full w-full md:w-[45%] md:flex-shrink-0 relative z-0">
                    <div className="absolute inset-0">
                        <MapComponent {...mapProps} />
                    </div>

                    {/* Newsletter Subscription - Compact bar at bottom */}
                    <div className="hidden md:flex absolute bottom-0 left-0 right-0 z-10 bg-primary/95 backdrop-blur-sm items-center justify-center gap-3 py-1.5 px-4">
                        <span className="text-white text-xs font-medium">📬 Get new listings alerts</span>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const formData = new FormData(e.currentTarget);
                            const email = formData.get('email') as string;
                            if (!email || !email.trim() || !email.includes('@')) {
                                dispatch({
                                    type: 'SHOW_ALERT',
                                    payload: {
                                        type: 'warning',
                                        title: 'Invalid Email',
                                        message: 'Please enter a valid email address',
                                    },
                                });
                                return;
                            }
                            // Navigate to pricing page with email saved
                            dispatch({ type: 'SET_SUBSCRIPTION_EMAIL', payload: email.trim() });
                            dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'pricing' });
                            const currentLang = window.location.pathname.split('/')[1] || 'en';
                            const validLangs = ['en', 'sq', 'sr', 'de', 'mk'];
                            const lang = validLangs.includes(currentLang) ? currentLang : 'en';
                            window.history.pushState({}, '', `/${lang}/subscribe`);
                        }} className="flex gap-1.5">
                            <input
                                type="email"
                                name="email"
                                placeholder="Email"
                                className="w-44 px-2.5 py-1 text-xs rounded bg-white/15 border border-white/25 text-white placeholder-white/50 focus:outline-none focus:ring-1 focus:ring-secondary"
                            />
                            <button
                                type="submit"
                                className="px-3 py-1 text-xs font-semibold bg-secondary text-primary-dark rounded hover:bg-yellow-300 transition-colors"
                            >
                                Subscribe
                            </button>
                        </form>
                    </div>
                </div>
                
                {/* --- Mobile View Overlays --- */}
                {isMobile && !isFiltersOpen && (
                    <>
                        <div className="absolute top-0 left-0 right-0 z-[100] p-2 landscape:p-1.5 pointer-events-none safe-area-inset-top">
                            <div ref={searchWrapperRef} className="pointer-events-auto w-full space-y-2">
                                <div className="w-full bg-white/95 backdrop-blur-md rounded-full shadow-lg p-1 flex items-center gap-0.5 sm:gap-1">
                                    <button
                                        onClick={onToggleSidebar}
                                        className="min-h-[44px] min-w-[44px] flex items-center justify-center flex-shrink-0 rounded-full hover:bg-neutral-100 active:bg-neutral-200 transition-colors touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50"
                                        aria-label="Open menu"
                                    >
                                        <Bars3Icon className="w-6 h-6 text-neutral-800"/>
                                    </button>
                                    {renderSearchInput(true)}
                                    <button
                                        onClick={() => updateSearchPageState({ isFiltersOpen: true })}
                                        className="min-h-[44px] min-w-[44px] flex items-center justify-center flex-shrink-0 rounded-full hover:bg-neutral-100 active:bg-neutral-200 transition-colors touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50"
                                        aria-label="Open filters"
                                    >
                                        <AdjustmentsHorizontalIcon className="w-6 h-6 text-neutral-800"/>
                                    </button>
                                    {isAuthenticated && currentUser && (
                                        <button
                                            onClick={() => dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'account' })}
                                            className="min-h-[44px] min-w-[44px] flex items-center justify-center flex-shrink-0 rounded-full hover:bg-neutral-100 active:bg-neutral-200 transition-colors touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50 mr-0.5"
                                            aria-label="My account"
                                        >
                                            {currentUser.avatarUrl ? (
                                                <img src={currentUser.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" referrerPolicy="no-referrer" aria-hidden="true" />
                                            ) : (
                                                <UserCircleIcon className="w-8 h-8 text-neutral-400" aria-hidden="true"/>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="absolute bottom-20 xs:bottom-24 sm:bottom-20 landscape:bottom-14 left-0 right-0 z-[100] p-3 sm:p-4 landscape:p-2 pointer-events-none" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 8px)' }}>
                            {/* Map hint tooltip - positioned to point at Map button */}
                            {showMapHint && (
                                <div className="absolute bottom-full right-1/2 translate-x-[70%] mb-2 pointer-events-auto animate-bounce">
                                    <div className="relative bg-primary text-white px-3 py-1.5 rounded-lg shadow-lg text-xs font-medium whitespace-nowrap">
                                        <span>Tap "Map"</span>
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-6 border-transparent border-t-primary"></div>
                                    </div>
                                </div>
                            )}
                            <div className="pointer-events-auto mx-auto w-fit" role="tablist" aria-label="View toggle">
                                <LiquidGlassSwitch
                                    options={[
                                        { value: 'list', label: 'List', icon: <Squares2x2Icon className="w-full h-full" /> },
                                        { value: 'map', label: 'Map', icon: <MapIcon className="w-full h-full" /> },
                                    ]}
                                    value={mobileView}
                                    onChange={(val) => {
                                        updateSearchPageState({ mobileView: val as 'list' | 'map' });
                                        if (val === 'map') setShowMapHint(false);
                                    }}
                                    size="md"
                                />
                            </div>
                        </div>
                    </>
                )}
            </div>
            
            {isMobile && isFiltersOpen && (
                <div className="fixed inset-0 z-30 flex flex-col">
                    <div className="absolute inset-0 bg-black/50" onClick={() => updateSearchPageState({ isFiltersOpen: false })}></div>
                    <div className="relative w-full h-full" onClick={(e) => { e.stopPropagation(); updateSearchPageState({ isFiltersOpen: false }); }}>
                        <div className="absolute inset-0 bg-white" onClick={e => e.stopPropagation()}>
                             <MobileFilters
                                onClose={() => updateSearchPageState({ isFiltersOpen: false })}
                                propertyListProps={propertyListProps}
                                localFilters={localFilters}
                                onLocalFilterChange={handleLocalFilterChange}
                                onReset={handleResetFilters}
                                onSave={() => handleSaveSearch(false)}
                                isSaving={isSaving}
                                onApply={handleApplyFiltersFromModal}
                                searchMode={searchMode}
                                t={t}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SearchPage;