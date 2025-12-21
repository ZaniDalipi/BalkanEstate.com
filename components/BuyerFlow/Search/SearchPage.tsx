import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useAppContext } from '../../../context/AppContext';
import MapComponent from '../Maps/MapComponent';
import PropertyList from './PropertyList';
import { SavedSearch, ChatMessage, AiSearchQuery, Filters, initialFilters, SearchPageState, Property, NominatimResult } from '../../../types';
import { getAiChatResponse, generateSearchName, generateSearchNameFromCoords } from '../../../services/geminiService';
import { searchLocation } from '../../../services/osmService';
import Toast from '@/components/shared/Toast';
import L from 'leaflet';
import { Bars3Icon, SearchIcon, UserCircleIcon, XMarkIcon, AdjustmentsHorizontalIcon, MapPinIcon, Squares2x2Icon, BellIcon, PencilIcon, PlusIcon, SparklesIcon, CrosshairsIcon, XCircleIcon, MapIcon, SpinnerIcon } from '../../../constants';
import { filterProperties } from '../../../utils/propertyUtils';
import AiSearch from './AiSearch';
import Modal from '../../shared/Modal';
import { COUNTRY_OPTIONS, BALKAN_COUNTRIES } from '../../../constants/countries';

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

const MobileFilters: React.FC<{
    onClose: () => void;
    propertyListProps: any; // Simplified for this context
    localFilters: Filters;
    onLocalFilterChange: (name: keyof Filters, value: string | number | null) => void;
    onReset: () => void;
    onSave: () => void;
    isSaving: boolean;
    onApply: () => void;
    searchMode: 'manual' | 'ai';
}> = ({ onClose, propertyListProps, localFilters, onLocalFilterChange, onReset, onSave, isSaving, onApply, searchMode }) => (
    <div className="bg-white h-full w-full flex flex-col">
        <div className="flex-shrink-0 p-4 border-b border-neutral-200 flex justify-between items-center">
            <h2 className="text-lg font-bold text-neutral-800">Filters</h2>
            <button onClick={onClose} className="p-2 text-neutral-500 hover:text-neutral-800" aria-label="Close filters">
                <XMarkIcon className="w-6 h-6" />
            </button>
        </div>
        <div className="flex-shrink-0 p-4 bg-neutral-50 border-b border-neutral-200">
            <label className="block text-xs font-medium text-neutral-700 mb-2">Country</label>
            <select
                value={localFilters.country}
                onChange={(e) => onLocalFilterChange('country', e.target.value)}
                className="w-full bg-white border border-neutral-300 rounded-lg text-neutral-900 shadow-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors text-sm font-medium"
            >
                {COUNTRY_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </div>
        <div className="flex-grow overflow-y-auto min-h-0 pt-4">
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
            <div className="flex-shrink-0 p-4 border-t border-neutral-200 bg-white flex items-center gap-2">
                 <button onClick={onReset} className="px-3 py-2 border border-neutral-300 rounded-lg text-sm font-semibold text-neutral-700 hover:bg-neutral-100">Reset</button>
                 <button onClick={onSave} disabled={isSaving} className="px-3 py-2 border border-neutral-300 rounded-lg text-sm font-semibold text-neutral-700 hover:bg-neutral-100">Save Search</button>
                 <button onClick={onApply} className="flex-grow px-3 py-2 bg-primary text-white font-bold rounded-lg shadow-md hover:bg-primary-dark">Show Results</button>
            </div>
        )}
    </div>
);


const SearchPage: React.FC<SearchPageProps> = ({ onToggleSidebar }) => {
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


    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

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

        // Clear the search input - we're navigating to the location visually
        const newFilters = { ...filters, query: '' };

        updateSearchPageState({
            filters: newFilters,
            activeFilters: newFilters,
            drawnBoundsJSON: null, // Clear any drawn bounds - show all visible properties
        });

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
        updateSearchPageState({ drawnBoundsJSON: bounds ? JSON.stringify(bounds) : null, activeFilters: {...filters, query: ''} });
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
        switch (activeFilters.sortBy) {
            case 'price_asc': return filtered.sort((a, b) => a.price - b.price);
            case 'price_desc': return filtered.sort((a, b) => b.price - a.price);
            case 'beds_desc': return filtered.sort((a, b) => b.beds - a.beds);
            case 'newest': return filtered.sort((a, b) => (Math.max(b.createdAt || 0, b.lastRenewed || 0)) - (Math.max(a.createdAt || 0, a.lastRenewed || 0)));
            default: return filtered;
        }
    }, [properties, activeFilters]);

    const listProperties = useMemo(() => {
        // If a specific area is drawn/searched by the user, filter to that area
        if (drawnBounds) {
            const withinDrawn = baseFilteredProperties.filter(p => drawnBounds.contains([p.lat, p.lng]));
            return withinDrawn;
        }

        // Filter to show only properties visible in the current map view
        if (mapBounds) {
            const withinView = baseFilteredProperties.filter(p => mapBounds.contains([p.lat, p.lng]));
            return withinView;
        }
        // Fallback to all filtered properties if no bounds set
        return baseFilteredProperties;
    }, [baseFilteredProperties, drawnBounds, mapBounds]);


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
                    drawnBoundsJSON: JSON.stringify(bounds), // Set the country bounds as the search area
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
                newSearch = {
                    id: `ss-${now}`,
                    name,
                    filters: isAreaOnly ? initialFilters : filters,
                    drawnBoundsJSON: drawnBoundsJSON,
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
                    drawnBoundsJSON: JSON.stringify(mapBounds), // Save the current map view as the search area
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
    }, [isAuthenticated, dispatch, addSavedSearch, filters, isFormSearchActive, showToast, drawnBounds, drawnBoundsJSON, mapBounds]);
    
    const handleMapMove = useCallback((newBounds: L.LatLngBounds, newCenter: L.LatLng) => {
        if (isMobile && isFiltersOpen) return;
        
        const newState: Partial<SearchPageState> = { mapBoundsJSON: JSON.stringify(newBounds) };
        updateSearchPageState(newState);
    }, [isMobile, isFiltersOpen, updateSearchPageState]);


    const handleRecenterOnUser = () => {
        if (userLocation) {
            setFlyToTarget({ center: userLocation, zoom: 14 });
        } else {
            showToast("Your location is not available.", "error");
        }
    };

    const handleApplyAiFilters = useCallback(async (aiQuery: AiSearchQuery) => {
        const newFilters: Partial<Filters> = {
            query: aiQuery.location || '',
            minPrice: aiQuery.minPrice || null,
            maxPrice: aiQuery.maxPrice || null,
            beds: aiQuery.beds || null,
            baths: aiQuery.baths || null,
            livingRooms: aiQuery.livingRooms || null,
            minSqft: aiQuery.minSqft || null,
            maxSqft: aiQuery.maxSqft || null,
        };
        const updatedFilters = { ...initialFilters, ...newFilters };
        updateSearchPageState({ filters: updatedFilters, activeFilters: updatedFilters, searchMode: 'manual', isAiChatModalOpen: false });
        updateSearchPageState({ isFiltersOpen: false });

        // Navigate map to the AI-provided location if available
        if (aiQuery.location) {
            try {
                const results = await searchLocation(aiQuery.location);
                if (results.length > 0) {
                    const [south, north, west, east] = results[0].boundingbox.map(Number);
                    const searchBounds = L.latLngBounds([
                        [south, west],
                        [north, east],
                    ]);
                    updateSearchPageState({
                        mapBoundsJSON: JSON.stringify(searchBounds),
                    });
                    setFlyToTarget({ center: [Number(results[0].lat), Number(results[0].lon)], zoom: 12 });
                }
            } catch (error) {
                console.error("Error searching location:", error);
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

    const mapProps = {
        properties: baseFilteredProperties,
        onMapMove: handleMapMove,
        userLocation: userLocation,
        onSaveSearch: () => handleSaveSearch(true),
        isSaving: isSaving,
        isAuthenticated: isAuthenticated,
        mapBounds: mapBounds,
        drawnBounds,
        onDrawComplete: handleDrawComplete,
        isDrawing: isDrawing,
        onDrawStart: toggleDrawing,
        flyToTarget: flyToTarget,
        onFlyComplete: onFlyComplete,
        onRecenter: handleRecenterOnUser,
        isMobile: isMobile,
        hoveredPropertyId: hoveredPropertyId,
    };
    
    const propertyListProps = {
        properties: listProperties,
        filters: filters,
        onFilterChange: handleFilterChange,
        onSearchClick: () => handleSearch(),
        onResetFilters: handleResetFilters,
        onSortChange: handleSortChange,
        onSaveSearch: () => handleSaveSearch(false),
        isSaving,
        searchMode,
        onSearchModeChange: (mode: 'manual' | 'ai') => updateSearchPageState({ searchMode: mode }),
        onApplyAiFilters: handleApplyAiFilters,
        isAreaDrawn: !!drawnBounds,
        aiChatHistory: aiChatHistory,
        onAiChatHistoryChange: (newHistory: ChatMessage[]) => updateSearchPageState({ aiChatHistory: newHistory }),
        onDrawStart: toggleDrawing,
        isDrawing,
        isSearchingLocation: isSearchingLocation,
        onPropertyHover: setHoveredPropertyId,
        suggestions: suggestions,
        onSuggestionClick: handleSuggestionClick,
        isQueryInputFocused: isQueryInputFocused,
        onQueryInputFocusChange: setIsQueryInputFocused,
    };
    
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
                 <div className={`absolute inset-0 z-10 h-full w-full bg-white md:relative md:w-[55%] md:flex-shrink-0 md:border-r md:border-neutral-200 md:flex md:flex-col ${ isMobile && mobileView === 'list' ? 'translate-x-0' : 'translate-x-full md:translate-x-0' } transition-transform duration-300`}>
                    <div className="hidden md:flex p-3 border-b border-neutral-200 flex-shrink-0 items-center justify-between">
                        <h2 className="text-base font-semibold text-neutral-800">Properties for Sale</h2>
                        <select
                            value={filters.country}
                            onChange={(e) => handleFilterChange('country', e.target.value)}
                            className="bg-white border border-neutral-300 rounded-xl text-neutral-900 text-sm px-3 py-2 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all appearance-none cursor-pointer"
                            style={{ backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")", backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em', paddingRight: '2.5rem' }}
                        >
                            {COUNTRY_OPTIONS.map(option => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <PropertyList {...propertyListProps} isMobile={isMobile} showList={true} showFilters={!isMobile} />
                </div>


                {/* --- Right Panel: Map --- */}
                <div className="h-full w-full md:w-[45%] relative z-0 flex flex-col">
                    <div className="flex-grow relative">
                        <MapComponent {...mapProps} searchMode={searchMode} />
                    </div>

                    {/* Newsletter Subscription Section */}
                    <div className="bg-gradient-to-br from-primary-dark via-primary to-primary text-white p-2 sm:p-2.5 md:p-3 flex-shrink-0">
                        <div className="max-w-xl mx-auto">
                            <h3 className="text-xs sm:text-sm font-semibold mb-1">Stay Updated with New Properties</h3>
                            <p className="text-xs text-white/80 mb-1.5 sm:mb-2 hidden sm:block">Subscribe to get notifications about new listings in your area</p>
                            <form onSubmit={(e) => {
                                e.preventDefault();
                                const formData = new FormData(e.currentTarget);
                                const email = formData.get('email') as string;
                                if (!email || !email.trim() || !email.includes('@')) {
                                    alert('Please enter a valid email address');
                                    return;
                                }
                                dispatch({ type: 'TOGGLE_SUBSCRIPTION_MODAL', payload: { isOpen: true, email: email.trim() } });
                            }} className="flex gap-2">
                                <input
                                    type="email"
                                    name="email"
                                    placeholder="Enter your email"
                                    className="flex-grow px-3 py-1.5 text-xs rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent backdrop-blur-sm"
                                />
                                <button
                                    type="submit"
                                    className="px-3 py-1.5 text-xs font-semibold bg-secondary text-primary-dark rounded-lg hover:bg-yellow-300 transition-colors whitespace-nowrap"
                                >
                                    Subscribe
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
                
                {/* --- Mobile View Overlays --- */}
                {isMobile && !isFiltersOpen && (
                    <>
                        <div className="absolute top-0 left-0 right-0 z-20 p-2 pointer-events-none">
                            <div ref={searchWrapperRef} className="pointer-events-auto w-full space-y-2">
                                <div className="w-full bg-white/80 backdrop-blur-sm rounded-full shadow-lg p-1 flex items-center gap-1">
                                    <button onClick={onToggleSidebar} className="p-2 flex-shrink-0"><Bars3Icon className="w-6 h-6 text-neutral-800"/></button>
                                    {renderSearchInput(true)}
                                    <button onClick={() => updateSearchPageState({ isFiltersOpen: true })} className="p-2 flex-shrink-0 hover:bg-neutral-100 rounded-full"><AdjustmentsHorizontalIcon className="w-6 h-6 text-neutral-800"/></button>
                                    {isAuthenticated && currentUser && (
                                        <button onClick={() => dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'account' })} className="flex-shrink-0 mr-1">
                                            {currentUser.avatarUrl ? (
                                                <img src={currentUser.avatarUrl} alt="My Account" className="w-8 h-8 rounded-full object-cover"/>
                                            ) : (
                                                <UserCircleIcon className="w-8 h-8 text-neutral-400"/>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        <div className="absolute bottom-16 left-0 right-0 z-[1002] p-4 pointer-events-none">
                            <div className="pointer-events-auto mx-auto w-fit bg-white/80 text-neutral-800 p-1.5 rounded-full shadow-lg backdrop-blur-sm flex items-center gap-1">
                                <button onClick={() => updateSearchPageState({ mobileView: 'list' })} className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold transition-colors ${mobileView === 'list' ? 'bg-primary text-white shadow' : 'hover:bg-neutral-200'}`}>
                                    <Squares2x2Icon className="w-4 h-4" />
                                    <span>List</span>
                                </button>
                                <button onClick={() => updateSearchPageState({ mobileView: 'map' })} className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold transition-colors ${mobileView === 'map' ? 'bg-primary text-white shadow' : 'hover:bg-neutral-200'}`}>
                                    <MapIcon className="w-4 h-4" />
                                    <span>Map</span>
                                </button>
                            </div>
                        </div>

                        {mobileView === 'map' && (
                            <div className="absolute inset-0 z-10 pointer-events-none p-2 flex flex-col justify-between pt-24 pb-24">
                                <div className="pointer-events-auto self-end">
                                    <button onClick={toggleDrawing} className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold rounded-full shadow-lg transition-colors ${ isDrawing ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-neutral-800 text-white hover:bg-neutral-900' }`}>
                                        {isDrawing ? <XCircleIcon className="w-4 h-4" /> : <PencilIcon className="w-4 h-4" />}
                                        <span>{isDrawing ? 'Cancel' : 'Draw'}</span>
                                    </button>
                                </div>
                                {drawnBoundsJSON && !isDrawing && (
                                    <div className="absolute top-1/2 right-2 -translate-y-1/2 pointer-events-auto flex flex-col gap-2">
                                        {isAuthenticated && (<button onClick={() => handleSaveSearch(true)} disabled={isSaving} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-sm font-bold rounded-full shadow-lg hover:bg-primary-dark transition-colors disabled:opacity-50"><BellIcon className="w-4 h-4" /><span>{isSaving ? 'Saving...' : 'Save Area'}</span></button>)}
                                        <button onClick={handleClearDrawnArea} className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 text-white text-sm font-bold rounded-full shadow-lg hover:bg-neutral-900"><XCircleIcon className="w-4 h-4" /><span>Clear</span></button>
                                    </div>
                                )}
                                <div className="pointer-events-auto flex justify-between items-end">
                                    <div>
                                        {/* This is where the mobile legend used to be */}
                                    </div>
                                    <div className="bg-white/80 text-neutral-800 p-1.5 rounded-full shadow-lg backdrop-blur-sm flex items-center gap-1">
                                        <button onClick={handleRecenterOnUser} className="p-2 rounded-full hover:bg-black/10 transition-colors" title="My Location"><CrosshairsIcon className="w-4 h-4" /></button>
                                        {isAuthenticated && !drawnBoundsJSON && (<button onClick={() => handleSaveSearch(false)} disabled={isSaving} className="p-2 rounded-full hover:bg-black/10 transition-colors disabled:opacity-50" title="Save Search"><BellIcon className="w-4 h-4" /></button>)}
                                        {isAuthenticated ? (
                                            <button onClick={() => updateSearchPageState({ isAiChatModalOpen: true })} className="p-2 rounded-full hover:bg-black/10 transition-colors" title="AI Search"><SparklesIcon className="w-4 h-4 text-primary" /></button>
                                        ) : (
                                            <button onClick={() => dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true, view: 'login' } })} className="p-2 rounded-full hover:bg-black/10 transition-colors" title="Sign in to use AI Search"><SparklesIcon className="w-4 h-4 text-primary" /></button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
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
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SearchPage;