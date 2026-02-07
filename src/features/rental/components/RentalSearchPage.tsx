import React from 'react';
import { useTranslation } from 'react-i18next';
import MapComponent from '@/src/features/map/components/MapComponent';
import PropertyCard from '@/src/features/property-details/components/PropertyCard';
import PropertyCardSkeleton from '@/src/features/property-details/components/PropertyCardSkeleton';
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

            <div className="absolute inset-0 z-0 bg-neutral-50" />

            <div className={`flex h-full w-full flex-col lg:flex-row transition-all duration-300 relative ${isFiltersOpen && (isMobile || isTablet) ? 'blur-sm pointer-events-none' : ''}`}>
                {/* Left Panel: Search + Filters + Property List */}
                <div className={`absolute inset-0 z-10 h-full w-full bg-white lg:relative lg:w-[45%] xl:w-[55%] lg:flex-shrink-0 lg:border-r lg:border-neutral-200 lg:flex lg:flex-col ${showViewToggle && mobileView === 'list' ? 'translate-x-0' : showViewToggle ? '-translate-x-full' : ''} lg:translate-x-0 transition-transform duration-300`}>
                    {/* Header with city search */}
                    <div className="sticky top-0 z-20 bg-white border-b border-neutral-200">
                        <div className="px-4 py-3 flex items-center justify-between gap-3">
                            <div>
                                <h1 className="text-lg font-bold text-neutral-800">{t('rental:title')}</h1>
                                <p className="text-xs text-neutral-500">
                                    {listProperties.length} {t('rental:propertiesFound')}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleCreateRental}
                                    className="text-xs bg-secondary text-white font-semibold px-3 py-1.5 rounded-lg hover:bg-opacity-90 transition-colors"
                                >
                                    + {t('rental:createListing')}
                                </button>
                                <button
                                    onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                                    className="lg:hidden p-2 rounded-lg hover:bg-neutral-100 transition-colors"
                                    aria-label="Toggle filters"
                                >
                                    <AdjustmentsHorizontalIcon className="w-5 h-5 text-neutral-600" />
                                </button>
                            </div>
                        </div>

                        {/* City Search Bar */}
                        <div className="px-4 pb-3">
                            <div ref={searchWrapperRef} className="relative">
                                <div className="relative">
                                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                                    <input
                                        type="text"
                                        value={filters.query}
                                        onChange={(e) => handleFilterChange('query', e.target.value)}
                                        onFocus={() => setIsQueryInputFocused(true)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                                        placeholder={t('rental:filters.searchCity', 'Search by city or location...')}
                                        className="w-full pl-9 pr-9 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                                    />
                                    {filters.query && (
                                        <button
                                            onClick={() => handleFilterChange('query', '')}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                                        >
                                            <XMarkIcon className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>

                                {/* Location Suggestions Dropdown */}
                                {isQueryInputFocused && suggestions.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                                        {suggestions.map((suggestion: NominatimResult, index: number) => (
                                            <button
                                                key={index}
                                                onClick={() => handleSuggestionClick(suggestion)}
                                                className="w-full text-left px-3 py-2.5 text-sm hover:bg-neutral-50 transition-colors flex items-center gap-2 border-b border-neutral-100 last:border-b-0"
                                            >
                                                <MapIcon className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                                                <span className="truncate text-neutral-700">{suggestion.display_name}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                                {isSearchingLocation && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg z-50 p-3 text-center">
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary mx-auto" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Desktop Filters */}
                    <div className="hidden lg:block border-b border-neutral-200">
                        <RentalFilters
                            filters={filters}
                            onFilterChange={handleFilterChange}
                            onSearch={handleSearch}
                            onReset={handleResetFilters}
                            compact
                        />
                    </div>

                    {/* Property List - Using same PropertyCard as the Buy page */}
                    <div className="flex-1 overflow-y-auto p-3" data-scroll-container>
                        {isLoading ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {[...Array(6)].map((_, i) => (
                                    <PropertyCardSkeleton key={i} />
                                ))}
                            </div>
                        ) : error ? (
                            <div className="text-center py-12">
                                <p className="text-sm text-red-500 mb-2">{error}</p>
                                <button onClick={handleSearch} className="text-sm text-primary hover:underline">
                                    {t('common:tryAgain')}
                                </button>
                            </div>
                        ) : listProperties.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="text-4xl mb-3">🏠</div>
                                <h3 className="text-lg font-semibold text-neutral-700 mb-1">{t('rental:noProperties')}</h3>
                                <p className="text-sm text-neutral-500 mb-4">{t('rental:noPropertiesHint')}</p>
                                <button
                                    onClick={handleResetFilters}
                                    className="text-sm text-primary font-medium hover:underline"
                                >
                                    {t('rental:filters.reset')}
                                </button>
                            </div>
                        ) : (
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
                                    { value: 'list', label: t('search:list'), icon: <Squares2x2Icon className="w-full h-full" /> },
                                    { value: 'map', label: t('search:map.title'), icon: <MapIcon className="w-full h-full" /> },
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
                    <div className="absolute inset-0 bg-black/50" onClick={() => setIsFiltersOpen(false)} />
                    <div className="relative w-full h-full flex items-end sm:items-center justify-center p-0 sm:p-4">
                        <div className="relative bg-white w-full sm:max-w-md sm:rounded-xl rounded-t-xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                            <div className="sticky top-0 bg-white border-b border-neutral-200 px-4 py-3 flex items-center justify-between z-10">
                                <h2 className="text-lg font-bold text-neutral-800">{t('rental:filters.title')}</h2>
                                <button onClick={() => setIsFiltersOpen(false)} className="p-1 rounded-lg hover:bg-neutral-100">
                                    <XMarkIcon className="w-5 h-5 text-neutral-600" />
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
