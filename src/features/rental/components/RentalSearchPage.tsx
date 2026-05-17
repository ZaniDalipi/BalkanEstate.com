import React, { useState, useEffect, useRef, memo } from 'react';
import { useTranslation } from 'react-i18next';
import MapComponent from '@/src/features/map/components/MapComponent';
import PropertyCard from '@/src/features/property-details/components/PropertyCard';
import PropertyCardSkeleton from '@/src/features/property-details/components/PropertyCardSkeleton';
import HighlightedPropertiesSection from '@/src/features/property-details/components/HighlightedPropertiesSection';
import RentalFilters from './RentalFilters';
import Toast from '@/components/shared/Toast';
import { useRentalSearch } from '../hooks/useRentalSearch';
import { Squares2x2Icon, MapIcon, AdjustmentsHorizontalIcon, XMarkIcon, MagnifyingGlassIcon, Bars3Icon } from '@/constants';
import DefaultAvatar from '@/components/shared/DefaultAvatar';
import { LiquidGlassSwitch } from '@/src/components/ui/LiquidGlassSwitch';
import { Button } from '@/components/ui/liquid-glass-button';
import { Helmet } from 'react-helmet-async';
import { SEO } from '@/src/components/seo';
import Footer from '@/components/shared/Footer';
import { useLocalizedNavigation } from '@/src/hooks/useLocalizedNavigation';
import { NominatimResult, Property } from '@/types';

const ITEMS_PER_PAGE = 20;

// Animated property card — staggered fly-in entrance (matches buy page)
const AnimatedPropertyCard = memo<{
    property: Property;
    index: number;
    onHover?: (id: string | null) => void;
    animateEntrance?: boolean;
}>(({ property, index, onHover, animateEntrance }) => {
    const entranceDelay = animateEntrance ? Math.min(index * 60, 1200) : 0;
    return (
        <div
            className={animateEntrance ? 'rental-card-entrance-fly' : undefined}
            style={animateEntrance ? { '--card-delay': `${entranceDelay}ms` } as React.CSSProperties : undefined}
            onMouseEnter={() => onHover?.(property.id)}
            onMouseLeave={() => onHover?.(null)}
        >
            <PropertyCard property={property} />
        </div>
    );
});

// CSS animation keyframes for rental card entrance
const RentalCardAnimationStyles = () => (
    <style>{`
    @keyframes rentalCardSlideUp {
      0% {
        opacity: 0;
        transform: translateY(30px) scale(0.97);
      }
      100% {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
    .rental-card-entrance-fly {
      opacity: 0;
      animation: rentalCardSlideUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards;
      animation-delay: var(--card-delay, 0ms);
    }
  `}</style>
);

interface RentalSearchPageProps {
    onToggleSidebar: () => void;
}

const RentalSearchPage: React.FC<RentalSearchPageProps> = ({ onToggleSidebar }) => {
    const { t } = useTranslation(['rental', 'search', 'common']);
    const { getLocalizedPath } = useLocalizedNavigation();

    const {
        state,
        dispatch,
        isLoading,
        error,
        filters,
        isAuthenticated,
        mobileView,
        setMobileView,
        isMobile,
        isTablet,
        isDrawing,
        flyToTarget,
        hoveredPropertyId,
        setHoveredPropertyId,
        userLocation,
        mapBounds,
        drawnBounds,
        baseFilteredProperties,
        listProperties,
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
        // City search
        suggestions,
        searchWrapperRef,
        isSearchingLocation,
        isQueryInputFocused,
        setIsQueryInputFocused,
        handleSuggestionClick,
        // Save search
        isSaving,
        handleSaveSearchArea,
        // Toast
        toast,
        setToast,
    } = useRentalSearch();

    const [isFiltersOpen, setIsFiltersOpen] = React.useState(false);

    // Entrance animation: animate cards when rental data first loads
    const [animateCards, setAnimateCards] = useState(true);
    const prevLoadingRef = useRef(true);
    useEffect(() => {
        // Trigger animation when loading transitions from true -> false (data arrived)
        if (prevLoadingRef.current && !isLoading) {
            setAnimateCards(true);
            const timer = setTimeout(() => setAnimateCards(false), 2500);
            return () => clearTimeout(timer);
        }
        prevLoadingRef.current = isLoading;
    }, [isLoading]);

    // Pagination with infinite scroll (matches buy page)
    const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
    const loadMoreRef = useRef<HTMLDivElement>(null);

    // Reset pagination when filters change
    const filtersKey = JSON.stringify(filters);
    useEffect(() => {
        setVisibleCount(ITEMS_PER_PAGE);
    }, [filtersKey]);

    // Infinite scroll observer
    useEffect(() => {
        if (!loadMoreRef.current) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && visibleCount < listProperties.length) {
                    setVisibleCount(prev => Math.min(prev + ITEMS_PER_PAGE, listProperties.length));
                }
            },
            { rootMargin: '200px' }
        );
        observer.observe(loadMoreRef.current);
        return () => observer.disconnect();
    }, [visibleCount, listProperties.length]);

    const showSplitView = !isMobile && !isTablet;
    const showViewToggle = isMobile || isTablet;

    const mapProps = {
        properties: baseFilteredProperties,
        onMapMove: handleMapMove,
        userLocation,
        onSaveSearch: handleSaveSearchArea,
        isSaving,
        isAuthenticated,
        mapBounds,
        drawnBounds,
        onDrawComplete: handleDrawComplete,
        isDrawing,
        onDrawStart: toggleDrawing,
        flyToTarget,
        onFlyComplete,
        onRecenter: handleRecenterOnUser,
        onResetView: handleResetView,
        isMobile,
        searchMode: 'manual' as const,
        hoveredPropertyId,
    };

    const handleCreateRental = () => {
        dispatch({ type: 'SET_PROPERTY_TO_EDIT', payload: null });
        dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'create-rental' });
        window.history.pushState({}, '', getLocalizedPath('/create-rental'));
    };

    return (
        <div className="relative flex h-full w-full flex-col lg:flex-row">
            <SEO
                title={t('rental:seo.title', 'Properties for Rent | BalkanEstate')}
                description={t('rental:seo.description', 'Browse rental properties across the Balkans. Find apartments, houses, and villas for rent.')}
                canonical={`${window.location.origin}/rentals${window.location.search}`}
                type="website"
            />

            <Toast show={toast.show} message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, show: false })} />

            {/* Dark gradient background for the left panel */}
            <div className="absolute inset-0 z-0" style={{ background: 'linear-gradient(135deg, #f8f9fc 0%, #eef1f8 50%, #f0f4fa 100%)' }} />

            <div className={`flex h-full w-full flex-col lg:flex-row transition-all duration-300 relative ${isFiltersOpen && (isMobile || isTablet) ? 'blur-sm pointer-events-none' : ''}`}>
                {/* Left Panel: Search + Filters + Property List */}
                <div className={`absolute inset-0 z-10 h-full w-full flex flex-col lg:relative lg:w-[45%] xl:w-[55%] lg:flex-shrink-0 lg:border-r lg:border-gray-200 ${showViewToggle && mobileView === 'list' ? 'translate-x-0' : showViewToggle ? '-translate-x-full' : ''} lg:translate-x-0 transition-transform duration-300`} style={{ background: 'linear-gradient(180deg, rgba(248,249,252,0.98) 0%, rgba(238,241,248,0.95) 100%)' }}>
                    {/* Spacer for floating mobile header */}
                    {isMobile && <div className="h-14 flex-shrink-0" />}

                    {/* Header with city search — desktop only (mobile uses floating pill bar) */}
                    <div className="hidden lg:block sticky top-0 z-20" style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                        <div className="px-4 py-3 flex items-center justify-between gap-3">
                            <div>
                                <h1 className="text-lg font-bold text-gray-900 text-glow">{t('rental:title')}</h1>
                                <p className="text-xs text-gray-400">
                                    {listProperties.length} {t('rental:propertiesFound')}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="accent"
                                    size="sm"
                                    onClick={handleCreateRental}
                                    className="font-semibold rounded-xl"
                                >
                                    + {t('rental:createListing')}
                                </Button>
                            </div>
                        </div>

                        {/* City Search Bar */}
                        <div className="px-4 pb-3">
                            <div ref={searchWrapperRef} className="relative">
                                <div className="relative">
                                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                    <input
                                        type="text"
                                        value={filters.query}
                                        onChange={(e) => handleFilterChange('query', e.target.value)}
                                        onFocus={() => setIsQueryInputFocused(true)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                                        placeholder={t('rental:filters.searchCity', 'Search by city or location...')}
                                        className="glass-input w-full pl-9 pr-9 py-2 text-sm"
                                        aria-label={t('rental:filters.searchCity', 'Search by city or location...')}
                                    />
                                    {filters.query && (
                                        <button
                                            onClick={() => handleFilterChange('query', '')}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-600 transition-colors"
                                            aria-label={t('common:aria.clearSearch')}
                                        >
                                            <XMarkIcon className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>

                                {/* Location Suggestions Dropdown */}
                                {isQueryInputFocused && suggestions.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-1 glass-panel-light z-50 max-h-60 overflow-y-auto glass-scrollbar">
                                        {suggestions.map((suggestion: NominatimResult, index: number) => (
                                            <button
                                                key={index}
                                                onClick={() => handleSuggestionClick(suggestion)}
                                                className="w-full text-left px-3 py-2.5 text-sm hover:bg-gray-100 transition-colors flex items-center gap-2 border-b border-gray-200 last:border-b-0"
                                            >
                                                <MapIcon className="w-4 h-4 text-gray-300 flex-shrink-0" />
                                                <span className="truncate text-gray-600">{suggestion.display_name}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                                {isSearchingLocation && (
                                    <div className="absolute top-full left-0 right-0 mt-1 glass-panel-light z-50 p-3 text-center">
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400 mx-auto" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Desktop Filters */}
                    <div className="hidden lg:block" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                        <RentalFilters
                            filters={filters}
                            onFilterChange={handleFilterChange}
                            onSearch={handleSearch}
                            onReset={handleResetFilters}
                            onSaveSearch={handleSaveSearchArea}
                            isSaving={isSaving}
                            compact
                        />
                    </div>

                    {/* Property List */}
                    <div className="flex-1 overflow-y-auto pb-28 lg:pb-3 glass-scrollbar" data-scroll-container aria-live="polite">
                        {/* Results count + location + sort bar */}
                        <div className="sticky top-0 bg-white z-[100] border-b border-neutral-200">
                            <div className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-2 min-w-0">
                                    <p className="text-xs text-neutral-500 font-semibold flex-shrink-0">{t('search:resultsFound', { count: listProperties.length })}</p>
                                    {filters.query && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium truncate max-w-[140px]">
                                            <MapIcon className="w-3 h-3 flex-shrink-0" />
                                            <span className="truncate">{filters.query}</span>
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    {(filters.query || filters.country !== 'any' || filters.minPrice || filters.maxPrice || filters.beds || filters.baths || (filters.propertyType && filters.propertyType !== 'any')) && (
                                        <button
                                            onClick={handleResetFilters}
                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 text-red-600 text-xs font-semibold hover:bg-red-100 active:bg-red-200 transition-colors"
                                            aria-label={t('search:filters.resetFilters', 'Reset filters')}
                                        >
                                            <XMarkIcon className="w-3.5 h-3.5" />
                                            {t('common:reset', 'Reset')}
                                        </button>
                                    )}
                                    <div className="relative z-[101]">
                                        <select
                                            id="rentalSortBy"
                                            name="sortBy"
                                            value={filters.sortBy || 'newest'}
                                            onChange={(e) => handleSortChange(e.target.value)}
                                            aria-label={t('search:filters.sortBy', 'Sort properties by')}
                                            className="block w-full text-xs bg-white border border-neutral-300 rounded-xl text-neutral-900 px-3 py-1.5 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all appearance-none pr-8"
                                        >
                                            <option value="newest">{t('search:sort.newest')}</option>
                                            <option value="oldest">{t('search:sort.oldest')}</option>
                                            <option value="price_asc">{t('search:sort.priceAsc')}</option>
                                            <option value="price_desc">{t('search:sort.priceDesc')}</option>
                                            <option value="beds_desc">{t('search:sort.bedsDesc')}</option>
                                            <option value="baths_desc">{t('search:sort.bathsDesc')}</option>
                                            <option value="sqft_desc">{t('search:sort.areaDesc')}</option>
                                            <option value="sqft_asc">{t('search:sort.areaAsc')}</option>
                                            <option value="year_built_desc">{t('search:sort.yearBuiltDesc')}</option>
                                            <option value="featured">{t('search:sort.featured')}</option>
                                            <option value="price_reduced">{t('search:sort.priceReduced')}</option>
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-neutral-500">
                                            <svg className="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="p-3">
                        {isLoading ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {[...Array(6)].map((_, i) => (
                                    <PropertyCardSkeleton key={i} />
                                ))}
                            </div>
                        ) : error ? (
                            <div className="text-center py-12">
                                <p className="text-sm text-red-400 mb-2">{error}</p>
                                <button onClick={handleSearch} className="text-sm text-blue-600 hover:underline">
                                    {t('common:tryAgain')}
                                </button>
                            </div>
                        ) : listProperties.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="text-4xl mb-3 opacity-60">🏠</div>
                                <h3 className="text-lg font-semibold text-gray-600 mb-1">{t('rental:noProperties')}</h3>
                                <p className="text-sm text-gray-400 mb-4">{t('rental:noPropertiesHint')}</p>
                                <button
                                    onClick={handleResetFilters}
                                    className="text-sm text-blue-600 font-medium hover:underline"
                                >
                                    {t('rental:filters.reset')}
                                </button>
                            </div>
                        ) : (
                            <>
                                <RentalCardAnimationStyles />
                                <HighlightedPropertiesSection properties={listProperties} />
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {listProperties.slice(0, visibleCount).map((property, index) => (
                                        <AnimatedPropertyCard
                                            key={property.id}
                                            property={property}
                                            index={index}
                                            onHover={setHoveredPropertyId}
                                            animateEntrance={animateCards}
                                        />
                                    ))}
                                </div>
                                {visibleCount < listProperties.length && (
                                    <div ref={loadMoreRef} className="text-center p-4">
                                        <div className="flex justify-center items-center space-x-2 text-neutral-500">
                                            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                            <span>{t('common:loadingMore', 'Loading more...')}</span>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                        {/* Footer - Integrated at bottom of property list */}
                        <div className="mt-8 overflow-x-hidden">
                            <Footer contained />
                        </div>
                        </div>
                    </div>
                </div>

                {/* Right Panel: Map */}
                <div className="h-full w-full lg:w-[55%] xl:w-[45%] lg:flex-shrink-0 relative z-0 overflow-hidden">
                    <div className="absolute inset-0 overflow-hidden">
                        <MapComponent {...mapProps} />
                    </div>
                </div>

                {/* Mobile/Tablet View Overlays */}
                {showViewToggle && !isFiltersOpen && (
                    <>
                        {/* Mobile-only: floating search bar overlay (matches buy page pattern) */}
                        {isMobile && (
                            <div
                                className="absolute top-0 left-0 right-0 z-[100] pb-2 landscape:pb-1.5 pointer-events-none"
                                style={{
                                    paddingTop: 'var(--floating-search-top-pad)',
                                    paddingLeft: 'calc(env(safe-area-inset-left, 0px) + 8px)',
                                    paddingRight: 'calc(env(safe-area-inset-right, 0px) + 8px)',
                                }}
                            >
                                <div ref={searchWrapperRef} className="pointer-events-auto w-full space-y-2">
                                    <div
                                        className="w-full bg-white/60 backdrop-blur-xl rounded-full p-1 flex items-center gap-0.5 sm:gap-1 border border-white/40"
                                        style={{
                                            boxShadow: '0 8px 32px rgba(31, 38, 135, 0.15), inset 0 0 20px rgba(255, 255, 255, 0.3)',
                                        }}
                                    >
                                        <button
                                            onClick={onToggleSidebar}
                                            className="min-h-[44px] min-w-[44px] flex items-center justify-center flex-shrink-0 rounded-full hover:bg-neutral-100 active:bg-neutral-200 transition-colors touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50"
                                            aria-label={t('common:aria.openMenu')}
                                        >
                                            <Bars3Icon className="w-6 h-6 text-neutral-800"/>
                                        </button>
                                        <div className="flex-1 min-w-0 relative">
                                            <div className="relative">
                                                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                <input
                                                    type="text"
                                                    value={filters.query}
                                                    onChange={(e) => handleFilterChange('query', e.target.value)}
                                                    onFocus={() => setIsQueryInputFocused(true)}
                                                    onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                                                    placeholder={t('rental:filters.searchCity', 'Search city...')}
                                                    className="w-full pl-9 pr-8 py-2 text-sm bg-transparent border-none outline-none placeholder-gray-400"
                                                    aria-label={t('rental:filters.searchCity', 'Search by city or location...')}
                                                />
                                                {filters.query && (
                                                    <button
                                                        onClick={() => handleFilterChange('query', '')}
                                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                                        aria-label={t('common:aria.clearSearch')}
                                                    >
                                                        <XMarkIcon className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                            {/* Location Suggestions Dropdown */}
                                            {isQueryInputFocused && suggestions.length > 0 && (
                                                <div className="absolute top-full left-0 right-0 mt-1 glass-panel-light z-50 max-h-60 overflow-y-auto glass-scrollbar rounded-xl">
                                                    {suggestions.map((suggestion: NominatimResult, index: number) => (
                                                        <button
                                                            key={index}
                                                            onClick={() => handleSuggestionClick(suggestion)}
                                                            className="w-full text-left px-3 py-2.5 text-sm hover:bg-gray-100 transition-colors flex items-center gap-2 border-b border-gray-200 last:border-b-0"
                                                        >
                                                            <MapIcon className="w-4 h-4 text-gray-300 flex-shrink-0" />
                                                            <span className="truncate text-gray-600">{suggestion.display_name}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                            {isSearchingLocation && (
                                                <div className="absolute top-full left-0 right-0 mt-1 glass-panel-light z-50 p-3 text-center rounded-xl">
                                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400 mx-auto" />
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => setIsFiltersOpen(true)}
                                            className="min-h-[44px] min-w-[44px] flex items-center justify-center flex-shrink-0 rounded-full hover:bg-neutral-100 active:bg-neutral-200 transition-colors touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50"
                                            aria-label={t('common:aria.openFilters')}
                                        >
                                            <AdjustmentsHorizontalIcon className="w-6 h-6 text-neutral-800"/>
                                        </button>
                                        {isAuthenticated && state.currentUser && (
                                            <button
                                                onClick={() => dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'account' })}
                                                className="min-h-[44px] min-w-[44px] flex items-center justify-center flex-shrink-0 rounded-full hover:bg-neutral-100 active:bg-neutral-200 transition-colors touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50 mr-0.5"
                                                aria-label={t('common:aria.myAccount')}
                                            >
                                                <div className="w-8 h-8 rounded-full overflow-hidden">
                                                    {state.currentUser.avatarUrl ? (
                                                        <img src={state.currentUser.avatarUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" aria-hidden="true" />
                                                    ) : (
                                                        <DefaultAvatar gender={state.currentUser.gender} seed={state.currentUser.id || state.currentUser.name} avatarOptions={state.currentUser.avatarOptions} />
                                                    )}
                                                </div>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Floating List/Map toggle */}
                        <div className="absolute bottom-28 xs:bottom-32 sm:bottom-28 md:bottom-6 landscape:bottom-16 left-0 right-0 z-[100] p-3 sm:p-4 landscape:p-2 pointer-events-none flex justify-center" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)' }}>
                            <div className="pointer-events-auto mx-auto w-fit" role="tablist" aria-label={t('common:aria.viewToggle')}>
                                <LiquidGlassSwitch
                                    options={[
                                        { value: 'list', label: t('search:map.list'), icon: <Squares2x2Icon className="w-full h-full" /> },
                                        { value: 'map', label: t('search:map.showMap'), icon: <MapIcon className="w-full h-full" /> },
                                    ]}
                                    value={mobileView}
                                    onChange={(val) => setMobileView(val as 'list' | 'map')}
                                    size="md"
                                />
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Mobile Filters Modal */}
            {(isMobile || isTablet) && isFiltersOpen && (
                <div className="fixed inset-0 z-30 flex flex-col">
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setIsFiltersOpen(false)} />
                    <div className="relative w-full h-full flex items-end sm:items-center justify-center p-0 sm:p-4">
                        <div className="relative w-full sm:max-w-md sm:rounded-xl rounded-t-xl max-h-[85vh] overflow-y-auto glass-scrollbar glass-panel" onClick={e => e.stopPropagation()}>
                            <div className="sticky top-0 z-10 px-4 py-3 flex items-center justify-between" style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                                <h2 className="text-lg font-bold text-gray-900">{t('rental:filters.title')}</h2>
                                <Button variant="glass" size="icon" onClick={() => setIsFiltersOpen(false)} className="rounded-xl" aria-label={t('common:aria.closeFilters')}>
                                    <XMarkIcon className="w-5 h-5 text-gray-500" />
                                </Button>
                            </div>
                            <RentalFilters
                                filters={filters}
                                onFilterChange={handleFilterChange}
                                onSearch={() => { handleSearch(); setIsFiltersOpen(false); }}
                                onReset={handleResetFilters}
                                onSaveSearch={handleSaveSearchArea}
                                isSaving={isSaving}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RentalSearchPage;
