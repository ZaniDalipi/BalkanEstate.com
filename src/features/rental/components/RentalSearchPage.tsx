import React from 'react';
import { useTranslation } from 'react-i18next';
import MapComponent from '@/src/features/map/components/MapComponent';
import PropertyCard from '@/src/features/property-details/components/PropertyCard';
import PropertyCardSkeleton from '@/src/features/property-details/components/PropertyCardSkeleton';
import HighlightedPropertiesSection from '@/src/features/property-details/components/HighlightedPropertiesSection';
import RentalFilters from './RentalFilters';
import { useRentalSearch } from '../hooks/useRentalSearch';
import { Squares2x2Icon, MapIcon, AdjustmentsHorizontalIcon, XMarkIcon, MagnifyingGlassIcon } from '@/constants';
import { LiquidGlassSwitch } from '@/src/components/ui/LiquidGlassSwitch';
import { SEO } from '@/src/components/seo';
import { useLocalizedNavigation } from '@/src/hooks/useLocalizedNavigation';
import { NominatimResult } from '@/types';

const RentalSearchPage: React.FC = () => {
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
        onFlyComplete,
        // City search
        suggestions,
        searchWrapperRef,
        isSearchingLocation,
        isQueryInputFocused,
        setIsQueryInputFocused,
        handleSuggestionClick,
    } = useRentalSearch();

    const [isFiltersOpen, setIsFiltersOpen] = React.useState(false);

    const showSplitView = !isMobile && !isTablet;
    const showViewToggle = isMobile || isTablet;

    const mapProps = {
        properties: baseFilteredProperties,
        onMapMove: handleMapMove,
        userLocation,
        isSaving: false,
        isAuthenticated,
        mapBounds,
        drawnBounds,
        onDrawComplete: handleDrawComplete,
        isDrawing,
        onDrawStart: toggleDrawing,
        flyToTarget,
        onFlyComplete,
        onRecenter: handleRecenterOnUser,
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
                canonical={`${window.location.origin}/rentals`}
                type="website"
            />

            {/* Dark gradient background for the left panel */}
            <div className="absolute inset-0 z-0" style={{ background: 'linear-gradient(135deg, #0c1220 0%, #1a1040 50%, #0d1f3c 100%)' }} />

            <div className={`flex h-full w-full flex-col lg:flex-row transition-all duration-300 relative ${isFiltersOpen && (isMobile || isTablet) ? 'blur-sm pointer-events-none' : ''}`}>
                {/* Left Panel: Search + Filters + Property List */}
                <div className={`absolute inset-0 z-10 h-full w-full flex flex-col lg:relative lg:w-[45%] xl:w-[55%] lg:flex-shrink-0 lg:border-r lg:border-white/5 ${showViewToggle && mobileView === 'list' ? 'translate-x-0' : showViewToggle ? '-translate-x-full' : ''} lg:translate-x-0 transition-transform duration-300`} style={{ background: 'linear-gradient(180deg, rgba(12,18,32,0.98) 0%, rgba(26,16,64,0.95) 100%)' }}>
                    {/* Header with city search */}
                    <div className="sticky top-0 z-20" style={{ background: 'rgba(12,18,32,0.9)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <div className="px-4 py-3 flex items-center justify-between gap-3">
                            <div>
                                <h1 className="text-lg font-bold text-white/90 text-glow">{t('rental:title')}</h1>
                                <p className="text-xs text-white/40">
                                    {listProperties.length} {t('rental:propertiesFound')}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleCreateRental}
                                    className="glass-btn-accent text-xs font-semibold px-3 py-1.5"
                                >
                                    + {t('rental:createListing')}
                                </button>
                                <button
                                    onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                                    className="lg:hidden glass-btn p-2"
                                    aria-label="Toggle filters"
                                >
                                    <AdjustmentsHorizontalIcon className="w-5 h-5 text-white/60" />
                                </button>
                            </div>
                        </div>

                        {/* City Search Bar */}
                        <div className="px-4 pb-3">
                            <div ref={searchWrapperRef} className="relative">
                                <div className="relative">
                                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                                    <input
                                        type="text"
                                        value={filters.query}
                                        onChange={(e) => handleFilterChange('query', e.target.value)}
                                        onFocus={() => setIsQueryInputFocused(true)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                                        placeholder={t('rental:filters.searchCity', 'Search by city or location...')}
                                        className="glass-input w-full pl-9 pr-9 py-2 text-sm"
                                    />
                                    {filters.query && (
                                        <button
                                            onClick={() => handleFilterChange('query', '')}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
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
                                                className="w-full text-left px-3 py-2.5 text-sm hover:bg-white/10 transition-colors flex items-center gap-2 border-b border-white/5 last:border-b-0"
                                            >
                                                <MapIcon className="w-4 h-4 text-white/30 flex-shrink-0" />
                                                <span className="truncate text-white/70">{suggestion.display_name}</span>
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
                    <div className="hidden lg:block" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <RentalFilters
                            filters={filters}
                            onFilterChange={handleFilterChange}
                            onSearch={handleSearch}
                            onReset={handleResetFilters}
                            compact
                        />
                    </div>

                    {/* Property List */}
                    <div className="flex-1 overflow-y-auto p-3 pb-28 lg:pb-3 glass-scrollbar" data-scroll-container>
                        {isLoading ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {[...Array(6)].map((_, i) => (
                                    <PropertyCardSkeleton key={i} />
                                ))}
                            </div>
                        ) : error ? (
                            <div className="text-center py-12">
                                <p className="text-sm text-red-400 mb-2">{error}</p>
                                <button onClick={handleSearch} className="text-sm text-blue-400 hover:underline">
                                    {t('common:tryAgain')}
                                </button>
                            </div>
                        ) : listProperties.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="text-4xl mb-3 opacity-60">🏠</div>
                                <h3 className="text-lg font-semibold text-white/70 mb-1">{t('rental:noProperties')}</h3>
                                <p className="text-sm text-white/40 mb-4">{t('rental:noPropertiesHint')}</p>
                                <button
                                    onClick={handleResetFilters}
                                    className="text-sm text-blue-400 font-medium hover:underline"
                                >
                                    {t('rental:filters.reset')}
                                </button>
                            </div>
                        ) : (
                            <>
                                <HighlightedPropertiesSection properties={listProperties} />
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {listProperties.map(property => (
                                        <div
                                            key={property.id}
                                            onMouseEnter={() => setHoveredPropertyId(property.id)}
                                            onMouseLeave={() => setHoveredPropertyId(null)}
                                        >
                                            <PropertyCard
                                                property={property}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Right Panel: Map */}
                <div className="h-full w-full lg:w-[55%] xl:w-[45%] lg:flex-shrink-0 relative z-0 overflow-hidden">
                    <div className="absolute inset-0 overflow-hidden">
                        <MapComponent {...mapProps} />
                    </div>
                </div>

                {/* Mobile/Tablet View Toggle */}
                {showViewToggle && !isFiltersOpen && (
                    <div className="absolute bottom-20 xs:bottom-24 sm:bottom-20 md:bottom-6 left-0 right-0 z-[100] p-3 sm:p-4 pointer-events-none flex justify-center" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 8px)' }}>
                        <div className="pointer-events-auto mx-auto w-fit" role="tablist" aria-label="View toggle">
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
                )}
            </div>

            {/* Mobile Filters Modal */}
            {(isMobile || isTablet) && isFiltersOpen && (
                <div className="fixed inset-0 z-30 flex flex-col">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsFiltersOpen(false)} />
                    <div className="relative w-full h-full flex items-end sm:items-center justify-center p-0 sm:p-4">
                        <div className="relative w-full sm:max-w-md sm:rounded-xl rounded-t-xl max-h-[85vh] overflow-y-auto glass-scrollbar glass-panel" onClick={e => e.stopPropagation()}>
                            <div className="sticky top-0 z-10 px-4 py-3 flex items-center justify-between" style={{ background: 'rgba(12,18,32,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                                <h2 className="text-lg font-bold text-white/90">{t('rental:filters.title')}</h2>
                                <button onClick={() => setIsFiltersOpen(false)} className="glass-btn p-1">
                                    <XMarkIcon className="w-5 h-5 text-white/60" />
                                </button>
                            </div>
                            <RentalFilters
                                filters={filters}
                                onFilterChange={handleFilterChange}
                                onSearch={() => { handleSearch(); setIsFiltersOpen(false); }}
                                onReset={handleResetFilters}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RentalSearchPage;
