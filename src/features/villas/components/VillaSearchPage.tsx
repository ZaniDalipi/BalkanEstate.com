import React, { useState, useEffect, useRef, memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import MapComponent from '@/src/features/map/components/MapComponent';
import PropertyCard from '@/src/features/property-details/components/PropertyCard';
import PropertyCardSkeleton from '@/src/features/property-details/components/PropertyCardSkeleton';
import HighlightedPropertiesSection from '@/src/features/property-details/components/HighlightedPropertiesSection';
import VillaFilters from './VillaFilters';
import Toast from '@/components/shared/Toast';
import { useVillaSearch } from '../hooks/useVillaSearch';
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

/* CSS animation keyframes for villa card entrance */
const VillaCardAnimationStyles = () => (
    <style>{`
    @keyframes villaCardSlideUp {
      0% { opacity: 0; transform: translateY(30px) scale(0.97); }
      100% { opacity: 1; transform: translateY(0) scale(1); }
    }
    .villa-card-entrance-fly {
      opacity: 0;
      animation: villaCardSlideUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards;
      animation-delay: var(--card-delay, 0ms);
    }
  `}</style>
);

/* Animated property card — staggered fly-in entrance */
const AnimatedPropertyCard = memo<{
    property: Property;
    index: number;
    onHover?: (id: string | null) => void;
    animateEntrance?: boolean;
}>(({ property, index, onHover, animateEntrance }) => {
    const entranceDelay = animateEntrance ? Math.min(index * 60, 1200) : 0;
    return (
        <div
            className={animateEntrance ? 'villa-card-entrance-fly' : undefined}
            style={animateEntrance ? { '--card-delay': `${entranceDelay}ms` } as React.CSSProperties : undefined}
            onMouseEnter={() => onHover?.(property.id)}
            onMouseLeave={() => onHover?.(null)}
        >
            <PropertyCard property={property} />
        </div>
    );
});

interface VillaSearchPageProps {
    onToggleSidebar: () => void;
}

const VillaSearchPage: React.FC<VillaSearchPageProps> = ({ onToggleSidebar }) => {
    const { t } = useTranslation(['villas', 'search', 'common']);
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
        suggestions,
        searchWrapperRef,
        isSearchingLocation,
        isQueryInputFocused,
        setIsQueryInputFocused,
        handleSuggestionClick,
        isSaving,
        handleSaveSearchArea,
        toast,
        setToast,
    } = useVillaSearch();

    const [isFiltersOpen, setIsFiltersOpen] = React.useState(false);

    /* Entrance animation: animate cards when villa data first loads */
    const [animateCards, setAnimateCards] = useState(true);
    const prevLoadingRef = useRef(true);
    useEffect(() => {
        if (prevLoadingRef.current && !isLoading) {
            setAnimateCards(true);
            const timer = setTimeout(() => setAnimateCards(false), 2500);
            return () => clearTimeout(timer);
        }
        prevLoadingRef.current = isLoading;
    }, [isLoading]);

    /* Filter-change shimmer: show skeleton briefly when filters change */
    const [isSearchFiltering, setIsSearchFiltering] = useState(false);
    const [animateFilteredCards, setAnimateFilteredCards] = useState(false);
    const isFirstFilterRender = useRef(true);
    const filteringTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const filtersKey = useMemo(() => JSON.stringify(filters), [filters]);
    useEffect(() => {
        if (isFirstFilterRender.current) { isFirstFilterRender.current = false; return; }
        setIsSearchFiltering(true);
        setAnimateFilteredCards(false);
        if (filteringTimer.current) clearTimeout(filteringTimer.current);
        filteringTimer.current = setTimeout(() => {
            setIsSearchFiltering(false);
            setAnimateFilteredCards(true);
        }, 600);
        return () => { if (filteringTimer.current) clearTimeout(filteringTimer.current); };
    }, [filtersKey]);
    useEffect(() => {
        if (!animateFilteredCards) return;
        const timer = setTimeout(() => setAnimateFilteredCards(false), 2000);
        return () => clearTimeout(timer);
    }, [animateFilteredCards]);

    /* Infinite scroll pagination */
    const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const loadMoreRef = useRef<HTMLDivElement>(null);

    useEffect(() => { setVisibleCount(ITEMS_PER_PAGE); }, [filtersKey]);

    useEffect(() => {
        if (!loadMoreRef.current) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && !isLoadingMore && visibleCount < listProperties.length) {
                    setIsLoadingMore(true);
                    setTimeout(() => {
                        setVisibleCount(prev => Math.min(prev + ITEMS_PER_PAGE, listProperties.length));
                        setIsLoadingMore(false);
                    }, 400);
                }
            },
            { rootMargin: '200px', threshold: 0 }
        );
        observer.observe(loadMoreRef.current);
        return () => observer.disconnect();
    }, [visibleCount, listProperties.length, isLoadingMore]);

    /* Active filter count for badge */
    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (filters.query && filters.query.trim()) count++;
        if (filters.country && filters.country !== 'any') count++;
        if (filters.minPrice != null) count++;
        if (filters.maxPrice != null) count++;
        if (filters.beds != null) count++;
        if (filters.viewType && filters.viewType !== 'any') count++;
        if ((filters as any).hasPool === true) count++;
        if ((filters as any).hasGarden === true) count++;
        const amenities = (filters.amenities as string[] | undefined) ?? [];
        if (amenities.length > 0) count += amenities.length;
        return count;
    }, [filters]);

    /* Min price from results for "from €X/night" display */
    const minResultPrice = useMemo(() => {
        if (listProperties.length === 0) return null;
        const prices = listProperties.map(p => p.price).filter(Boolean);
        return prices.length > 0 ? Math.min(...prices) : null;
    }, [listProperties]);

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

    const handleListVilla = () => {
        dispatch({ type: 'SET_PROPERTY_TO_EDIT', payload: null });
        dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'create-rental' });
        window.history.pushState({}, '', getLocalizedPath('/create-rental'));
    };

    const hasActiveFilters = activeFilterCount > 0;

    return (
        <div className="relative flex h-full w-full flex-col lg:flex-row">
            <SEO
                title={t('villas:seo.title', 'Luxury Villas for Rent in the Balkans | BalkanEstate')}
                description={t('villas:seo.description', 'Discover exclusive luxury villas for rent in the Balkans. Mountain retreats, lakeside estates, and coastal villas in Croatia, Montenegro, Albania, and more.')}
                canonical={`${window.location.origin}/villas${window.location.search}`}
                type="website"
            />

            <Toast show={toast.show} message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, show: false })} />

            {/* Page background */}
            <div className="absolute inset-0 z-0 bg-gray-50" />

            <div className={`flex h-full w-full flex-col lg:flex-row transition-all duration-300 relative ${isFiltersOpen && (isMobile || isTablet) ? 'blur-sm pointer-events-none' : ''}`}>

                {/* Left Panel: Search + Filters + Property List */}
                <div
                    className={`absolute inset-0 z-10 h-full w-full flex flex-col lg:relative lg:w-[45%] xl:w-[55%] lg:flex-shrink-0 lg:border-r lg:border-gray-200 ${showViewToggle && mobileView === 'list' ? 'translate-x-0' : showViewToggle ? '-translate-x-full' : ''} lg:translate-x-0 transition-transform duration-300`}
                    style={{ background: '#F8F9FC' }}
                >
                    {/* Spacer for floating mobile/tablet header */}
                    {(isMobile || isTablet) && <div className="h-14 flex-shrink-0" />}

                    {/* Desktop header — sticky, new 3-tier design */}
                    <div className="hidden lg:block sticky top-0 z-20">

                        {/* Tier 1: Blue brand bar — 56px, amber bottom border */}
                        <div
                            className="flex items-center justify-between px-4"
                            style={{ height: '56px', background: '#0252CD', borderBottom: '3px solid #FFA500' }}
                        >
                            {/* Left: brand + stats */}
                            <div className="flex items-center gap-3 min-w-0">
                                <span className="text-xl flex-shrink-0">🏛️</span>
                                <span className="text-white font-bold text-base tracking-tight flex-shrink-0">
                                    {t('villas:title', 'Luxury Villas')}
                                </span>
                                {listProperties.length > 0 && (
                                    <>
                                        <span className="text-blue-300/60 text-sm flex-shrink-0">·</span>
                                        <span className="text-blue-200 text-sm flex-shrink-0">
                                            {listProperties.length} {listProperties.length === 1 ? t('villas:villa', 'villa') : t('villas:villas', 'villas')}
                                        </span>
                                        {minResultPrice != null && (
                                            <>
                                                <span className="text-blue-300/60 text-sm flex-shrink-0">·</span>
                                                <span className="text-sm flex-shrink-0" style={{ color: '#FFA500' }}>
                                                    {t('villas:fromPerNight', 'from {{price}}/night', { price: `€${minResultPrice.toLocaleString()}` })}
                                                </span>
                                            </>
                                        )}
                                    </>
                                )}
                            </div>
                            {/* Right: List Your Villa CTA */}
                            <button
                                onClick={handleListVilla}
                                className="flex-shrink-0 ml-4 h-8 px-3 rounded-lg text-xs font-bold transition-opacity hover:opacity-90 active:opacity-80"
                                style={{ background: '#FFA500', color: '#0252CD' }}
                            >
                                + {t('villas:createListing', 'List Your Villa')}
                            </button>
                        </div>

                        {/* Tier 2: Search bar — 44px white */}
                        <div
                            className="flex items-center px-4"
                            style={{ height: '44px', background: '#FFFFFF', borderBottom: '1px solid rgba(0,0,0,0.07)' }}
                        >
                            <div ref={searchWrapperRef} className="relative w-full">
                                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                <input
                                    type="text"
                                    value={filters.query}
                                    onChange={(e) => handleFilterChange('query', e.target.value)}
                                    onFocus={() => setIsQueryInputFocused(true)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                                    placeholder={t('villas:filters.searchCity', 'Search by location...')}
                                    className="w-full pl-9 pr-9 py-1.5 text-sm bg-transparent border-none outline-none placeholder-gray-300 text-gray-800"
                                    aria-label={t('villas:filters.searchCity', 'Search by location...')}
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
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#FFA500] mx-auto" />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Tier 3: VillaFilters compact chip row — ~52px */}
                        <div style={{ background: '#FFFFFF', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                            <VillaFilters
                                filters={filters}
                                onFilterChange={handleFilterChange}
                                onSearch={handleSearch}
                                onReset={handleResetFilters}
                                onSaveSearch={handleSaveSearchArea}
                                isSaving={isSaving}
                                compact
                            />
                        </div>
                    </div>

                    {/* Property List */}
                    <div className="flex-1 overflow-y-auto pb-28 lg:pb-3 glass-scrollbar" data-scroll-container aria-live="polite">

                        {/* Results bar */}
                        <div className="sticky top-0 bg-white border-b border-gray-100 z-[100]">
                            <div className="px-4 py-2.5 flex items-center justify-between gap-2">
                                {/* Left: count + active filter chips */}
                                <div className="flex items-center gap-2 min-w-0 flex-wrap">
                                    <p className="text-xs font-semibold text-gray-700 flex-shrink-0">
                                        {listProperties.length}{' '}
                                        <span className="text-gray-400 font-normal">
                                            {t('villas:exclusiveVillas', 'exclusive villas')}
                                        </span>
                                    </p>
                                    {filters.query && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FFA500]/10 text-[#0252CD] text-[11px] font-medium max-w-[140px]">
                                            <MapIcon className="w-3 h-3 flex-shrink-0" />
                                            <span className="truncate">{filters.query}</span>
                                            <button
                                                onClick={() => handleFilterChange('query', '')}
                                                className="flex-shrink-0 hover:text-red-400 transition-colors"
                                                aria-label={t('common:aria.clearSearch')}
                                            >
                                                <XMarkIcon className="w-3 h-3" />
                                            </button>
                                        </span>
                                    )}
                                    {filters.country && filters.country !== 'any' && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FFA500]/10 text-[#0252CD] text-[11px] font-medium">
                                            <span>{filters.country}</span>
                                            <button
                                                onClick={() => handleFilterChange('country', 'any')}
                                                className="flex-shrink-0 hover:text-red-400 transition-colors"
                                                aria-label={t('common:aria.clearFilter', 'Clear country filter')}
                                            >
                                                <XMarkIcon className="w-3 h-3" />
                                            </button>
                                        </span>
                                    )}
                                    {minResultPrice != null && listProperties.length > 0 && (
                                        <span className="hidden sm:inline text-[11px] text-gray-400 flex-shrink-0">
                                            {t('villas:fromPerNight', 'from {{price}}/night', { price: `€${minResultPrice.toLocaleString()}` })}
                                        </span>
                                    )}
                                </div>

                                {/* Right: reset + sort */}
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    {hasActiveFilters && (
                                        <button
                                            onClick={handleResetFilters}
                                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-red-50 text-red-500 text-[11px] font-semibold hover:bg-red-100 transition-colors"
                                        >
                                            <XMarkIcon className="w-3 h-3" />
                                            {t('common:reset', 'Reset')}
                                        </button>
                                    )}
                                    <div className="relative z-[101]">
                                        <select
                                            value={filters.sortBy || 'newest'}
                                            onChange={(e) => handleSortChange(e.target.value)}
                                            aria-label={t('search:filters.sortBy', 'Sort properties by')}
                                            className="block text-xs bg-white border border-gray-200 rounded-xl text-gray-700 px-3 py-1.5 pr-7 focus:outline-none focus:border-[#0252CD]/40 focus:ring-1 focus:ring-[#0252CD]/20 transition-all appearance-none"
                                        >
                                            <option value="newest">{t('search:sort.newest')}</option>
                                            <option value="oldest">{t('search:sort.oldest')}</option>
                                            <option value="price_asc">{t('search:sort.priceAsc')}</option>
                                            <option value="price_desc">{t('search:sort.priceDesc')}</option>
                                            <option value="beds_desc">{t('search:sort.bedsDesc')}</option>
                                            <option value="sqft_desc">{t('search:sort.areaDesc')}</option>
                                            <option value="featured">{t('search:sort.featured')}</option>
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                                            <svg className="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Card grid / loading / empty states */}
                        <div className="p-3 pt-2 bg-gray-50">
                            {(isLoading || isSearchFiltering) ? (
                                /* Premium loading state */
                                <>
                                    <div className="flex flex-col items-center justify-center gap-3 py-8 mb-2">
                                        <div className="relative">
                                            <div className="w-10 h-10 rounded-full border-2 border-gray-100" />
                                            <div className="absolute inset-0 w-10 h-10 rounded-full border-2 border-t-[#0252CD] border-r-[#FFA500] animate-spin" />
                                        </div>
                                        <span className="text-xs text-gray-400 font-medium">
                                            {t('villas:discoveringVillas', 'Discovering exclusive villas...')}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {[...Array(6)].map((_, i) => <PropertyCardSkeleton key={i} index={i} />)}
                                    </div>
                                </>
                            ) : error ? (
                                <div className="text-center py-12">
                                    <p className="text-sm text-red-400 mb-2">{error}</p>
                                    <button onClick={handleSearch} className="text-sm text-[#0252CD] hover:underline">
                                        {t('common:tryAgain')}
                                    </button>
                                </div>
                            ) : listProperties.length === 0 ? (
                                /* Premium empty state with destination quick-select */
                                <div className="flex justify-center py-10 px-3">
                                    <div className="bg-white rounded-2xl shadow-sm p-8 text-center max-w-md w-full">
                                        <div className="text-5xl mb-3">🏛️</div>
                                        <h3 className="text-gray-800 font-bold text-lg mb-1">
                                            {t('villas:noProperties', 'No luxury villas found')}
                                        </h3>
                                        <p className="text-gray-400 text-sm mb-5 leading-relaxed">
                                            {t('villas:noPropertiesHint', 'Try one of our sought-after destinations below, or adjust your filters')}
                                        </p>
                                        {/* Destination quick-select */}
                                        <div className="flex flex-wrap justify-center gap-2 mb-5">
                                            {[
                                                { label: 'Bay of Kotor', query: 'Kotor' },
                                                { label: 'Lake Ohrid', query: 'Ohrid' },
                                                { label: 'Budva Riviera', query: 'Budva' },
                                                { label: 'Julian Alps', query: 'Bled' },
                                                { label: 'Dubrovnik', query: 'Dubrovnik' },
                                            ].map(dest => (
                                                <button
                                                    key={dest.query}
                                                    onClick={() => { handleFilterChange('query', dest.query); handleSearch(); }}
                                                    className="px-3 py-1.5 rounded-full text-xs font-semibold border border-[#FFA500]/40 text-[#0252CD] bg-[#FFA500]/8 hover:bg-[#FFA500]/15 hover:border-[#FFA500] transition-all"
                                                >
                                                    {dest.label}
                                                </button>
                                            ))}
                                        </div>
                                        <button
                                            onClick={handleResetFilters}
                                            className="bg-primary text-white rounded-xl px-5 py-2.5 font-semibold text-sm hover:opacity-90 transition-opacity"
                                        >
                                            {t('villas:clearFilters', 'Clear All Filters')}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <VillaCardAnimationStyles />
                                    {/* Curated destinations strip — horizontal scroll */}
                                    <div className="px-3 pt-3 pb-1">
                                        <div className="flex items-center gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' } as React.CSSProperties}>
                                            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider flex-shrink-0">Destinations</span>
                                            {[
                                                { label: '🏔️ Julian Alps', query: 'Bled' },
                                                { label: '🌊 Bay of Kotor', query: 'Kotor' },
                                                { label: '🌅 Budva Riviera', query: 'Budva' },
                                                { label: '🏞️ Lake Ohrid', query: 'Ohrid' },
                                                { label: '🏛️ Dubrovnik', query: 'Dubrovnik' },
                                                { label: '⛰️ Pirin Mountains', query: 'Bansko' },
                                            ].map(dest => {
                                                const isActive = filters.query === dest.query;
                                                return (
                                                    <button
                                                        key={dest.query}
                                                        onClick={() => {
                                                            handleFilterChange('query', isActive ? '' : dest.query);
                                                            if (!isActive) handleSearch();
                                                        }}
                                                        className={`flex-shrink-0 px-3 py-1 rounded-full text-[11px] font-semibold border transition-all ${
                                                            isActive
                                                                ? 'bg-[#FFA500]/15 text-[#0252CD] border-[#FFA500]'
                                                                : 'bg-white text-gray-500 border-gray-200 hover:border-[#FFA500]/50 hover:text-[#0252CD]'
                                                        }`}
                                                    >
                                                        {dest.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    <HighlightedPropertiesSection properties={listProperties} />
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {listProperties.slice(0, visibleCount).map((property, index) => (
                                            <AnimatedPropertyCard
                                                key={property.id}
                                                property={property}
                                                index={index}
                                                onHover={setHoveredPropertyId}
                                                animateEntrance={animateCards || animateFilteredCards}
                                            />
                                        ))}
                                    </div>
                                    {visibleCount < listProperties.length && (
                                        <div ref={loadMoreRef}>
                                            {isLoadingMore && (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                                                    {Array.from({ length: Math.min(ITEMS_PER_PAGE, listProperties.length - visibleCount) }).map((_, i) => (
                                                        <PropertyCardSkeleton key={i} index={i} />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
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

                {/* Mobile/Tablet overlays */}
                {showViewToggle && !isFiltersOpen && (
                    <>
                        {/* Mobile/Tablet floating search bar */}
                        {(isMobile || isTablet) && (
                            <div
                                className="absolute top-0 left-0 right-0 z-[100] pb-2 landscape:pb-1.5 pointer-events-none"
                                style={{
                                    paddingTop: 'max(calc(env(safe-area-inset-top, 0px) + 8px), 52px)',
                                    paddingLeft: 'calc(env(safe-area-inset-left, 0px) + 8px)',
                                    paddingRight: 'calc(env(safe-area-inset-right, 0px) + 8px)',
                                }}
                            >
                                <div ref={searchWrapperRef} className="pointer-events-auto w-full space-y-1.5">
                                    {/* Search pill bar */}
                                    <div
                                        className="w-full bg-white/60 backdrop-blur-xl rounded-full p-1 flex items-center gap-0.5 sm:gap-1 border border-white/40"
                                        style={{ boxShadow: '0 8px 32px rgba(31, 38, 135, 0.15), inset 0 0 20px rgba(255, 255, 255, 0.3)' }}
                                    >
                                        <button
                                            onClick={onToggleSidebar}
                                            className="min-h-[44px] min-w-[44px] flex items-center justify-center flex-shrink-0 rounded-full hover:bg-neutral-100 active:bg-neutral-200 transition-colors touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-secondary/50"
                                            aria-label={t('common:aria.openMenu')}
                                        >
                                            <Bars3Icon className="w-6 h-6 text-neutral-800" />
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
                                                    placeholder={t('villas:filters.searchCity', 'Search villas...')}
                                                    className="w-full pl-9 pr-8 py-2 text-sm bg-transparent border-none outline-none placeholder-gray-400"
                                                    aria-label={t('villas:filters.searchCity', 'Search villas...')}
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
                                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-secondary mx-auto" />
                                                </div>
                                            )}
                                        </div>
                                        {/* Filter button with active count badge */}
                                        <div className="relative">
                                            <button
                                                onClick={() => setIsFiltersOpen(true)}
                                                className="min-h-[44px] min-w-[44px] flex items-center justify-center flex-shrink-0 rounded-full hover:bg-neutral-100 active:bg-neutral-200 transition-colors touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-secondary/50"
                                                aria-label={t('common:aria.openFilters')}
                                            >
                                                <AdjustmentsHorizontalIcon className="w-6 h-6 text-neutral-800" />
                                            </button>
                                            {activeFilterCount > 0 && (
                                                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold leading-none px-1 pointer-events-none">
                                                    {activeFilterCount}
                                                </span>
                                            )}
                                        </div>
                                        {isAuthenticated && state.currentUser && (
                                            <button
                                                onClick={() => dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'account' })}
                                                className="min-h-[44px] min-w-[44px] flex items-center justify-center flex-shrink-0 rounded-full hover:bg-neutral-100 active:bg-neutral-200 transition-colors touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-secondary/50 mr-0.5"
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
                                    {/* Luxury label pill — improved */}
                                    <div className="flex justify-center">
                                        <span
                                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-white text-[11px] font-semibold backdrop-blur-sm shadow-sm"
                                            style={{ background: '#0252CD' }}
                                        >
                                            <span>🏛️</span>
                                            <span>{t('villas:title', 'LUXURY VILLAS')}</span>
                                            {activeFilterCount > 0 && (
                                                <span
                                                    className="ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                                                    style={{ background: '#FFA500', color: '#0252CD' }}
                                                >
                                                    {activeFilterCount}
                                                </span>
                                            )}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Floating List/Map toggle */}
                        <div
                            className="absolute bottom-24 xs:bottom-28 sm:bottom-24 md:bottom-6 landscape:bottom-14 left-0 right-0 z-[100] p-3 sm:p-4 landscape:p-2 pointer-events-none flex justify-center"
                            style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)' }}
                        >
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
                        <div
                            className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">🏛️</span>
                                    <h2 className="text-base font-bold text-gray-900">
                                        {t('villas:filters.title', 'Villa Filters')}
                                    </h2>
                                    {activeFilterCount > 0 && (
                                        <span
                                            className="px-2 py-0.5 rounded-full text-[11px] font-bold"
                                            style={{ background: '#FFA500', color: '#0252CD' }}
                                        >
                                            {activeFilterCount}
                                        </span>
                                    )}
                                </div>
                                <button
                                    onClick={() => setIsFiltersOpen(false)}
                                    className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                                    aria-label={t('common:aria.closeFilters', 'Close filters')}
                                >
                                    <XMarkIcon className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>
                            <div className="overflow-y-auto glass-scrollbar flex-1">
                                <VillaFilters
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
                </div>
            )}
        </div>
    );
};

export default VillaSearchPage;
