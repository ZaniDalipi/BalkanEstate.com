import React from 'react';
import { useTranslation } from 'react-i18next';
import MapComponent from '@/src/features/map/components/MapComponent';
import PropertyList from './PropertyList';
import { Property, ChatMessage, AiSearchQuery } from '@/types';
import { Bars3Icon, UserCircleIcon, AdjustmentsHorizontalIcon, Squares2x2Icon, PencilIcon, XMarkIcon, MapIcon } from '@/constants';
import DefaultAvatar from '@/components/shared/DefaultAvatar';
import { LiquidGlassSwitch } from '@/src/components/ui/LiquidGlassSwitch';
import AiSearch from './AiSearch';
import Modal from '@/components/shared/Modal';
import Toast from '@/components/shared/Toast';
import { Helmet } from 'react-helmet-async';
import { SEO } from '@/src/components/seo';
import { useSearchPage } from './useSearchPage';
import { generatePropertySlug } from '@/utils/slug';
import SearchHeader from './SearchHeader';
import SearchLocationBar from './SearchLocationBar';
import SearchMobileFilters from './SearchMobileFilters';
import { AdBannerSlot } from '@/src/features/ads';

const AiChatModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    properties: Property[];
    onApplyFilters: (query: AiSearchQuery) => void;
    history: ChatMessage[];
    onHistoryChange: (history: ChatMessage[]) => void;
}> = ({ isOpen, onClose, ...aiSearchProps }) => {
    const { t } = useTranslation(['search']);
    return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" title={t('search:ai.title', 'AI Property Search')}>
        <div className="h-[70vh] flex flex-col">
            <AiSearch {...aiSearchProps} isMobile={true} />
        </div>
    </Modal>
    );
};

interface SearchPageProps {
    onToggleSidebar: () => void;
}

const SearchPage: React.FC<SearchPageProps> = ({ onToggleSidebar }) => {
    const {
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
    } = useSearchPage();

    // Stable callback for opening auth modal - avoids passing dispatch to PropertyList
    const handleOpenAuthModal = React.useCallback(() => {
        dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true, view: 'login' } });
    }, [dispatch]);

    // Zillow-style layout: split view only at lg+ (1024px), full-width with toggle on md tablets
    const showSplitView = !isMobile && !isTablet;
    const showViewToggle = isMobile || isTablet;

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
        onResetView: handleResetView,
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
        // Passed directly to avoid PropertyList subscribing to AppContext
        isLoadingProperties: isLoadingProperties,
        isAuthenticated: isAuthenticated,
        onOpenAuthModal: handleOpenAuthModal,
    };

    return (
        <div className={`relative flex h-full w-full flex-col lg:flex-row ${(isMobile || isTablet) && isFiltersOpen ? 'overflow-hidden' : ''}`}>
            {/* Search progress bar — shown while properties are loading */}
            {isLoadingProperties && (
                <div
                    className="fixed top-0 left-0 right-0 z-[9999] h-0.5 overflow-hidden"
                    role="progressbar"
                    aria-label="Loading properties"
                >
                    <div
                        className="h-full bg-blue-600"
                        style={{
                            animation: 'search-progress 2s ease-in-out infinite',
                        }}
                    />
                    <style>{`
                        @keyframes search-progress {
                            0%   { width: 0%;   margin-left: 0%; }
                            50%  { width: 70%;  margin-left: 15%; }
                            100% { width: 0%;   margin-left: 100%; }
                        }
                    `}</style>
                </div>
            )}
            {/* Dynamic SEO for Search Page */}
            <SEO
                title={seoTitle}
                description={seoDescription}
                canonical={`${window.location.origin}/search${window.location.search}`}
                type="website"
            />

            {/* ItemList JSON-LD schema for search results - enables rich carousel in Google */}
            {listProperties.length > 0 && (
                <Helmet>
                    <script type="application/ld+json">
                        {JSON.stringify({
                            '@context': 'https://schema.org',
                            '@type': 'ItemList',
                            name: seoTitle,
                            description: seoDescription,
                            url: `${window.location.origin}/search${window.location.search}`,
                            numberOfItems: listProperties.length,
                            itemListElement: listProperties.slice(0, 20).map((p: Property, i: number) => ({
                                '@type': 'ListItem',
                                position: i + 1,
                                url: `${window.location.origin}/property/${generatePropertySlug(p)}`,
                                name: p.title || `${p.beds ? p.beds + '-Bed ' : ''}${p.propertyType || 'Property'} in ${p.city}, ${p.country}`,
                                ...(p.imageUrl && { image: p.imageUrl }),
                                item: {
                                    '@type': 'RealEstateListing',
                                    name: p.title || `${p.beds ? p.beds + '-Bed ' : ''}${p.propertyType || 'Property'} in ${p.city}, ${p.country}`,
                                    url: `${window.location.origin}/property/${generatePropertySlug(p)}`,
                                    ...(p.imageUrl && { image: p.imageUrl }),
                                    ...(p.price && {
                                        offers: {
                                            '@type': 'Offer',
                                            price: p.price,
                                            priceCurrency: p.currency || 'EUR',
                                            availability: 'https://schema.org/InStock',
                                        },
                                    }),
                                    ...(p.beds && { numberOfBedrooms: p.beds }),
                                    ...(p.baths && { numberOfBathroomsTotal: p.baths }),
                                    ...(p.sqft && {
                                        floorSize: {
                                            '@type': 'QuantitativeValue',
                                            value: p.sqft,
                                            unitCode: 'MTK',
                                            unitText: 'm²',
                                        },
                                    }),
                                    address: {
                                        '@type': 'PostalAddress',
                                        addressLocality: p.city,
                                        addressCountry: p.country,
                                    },
                                },
                            })),
                        })}
                    </script>
                </Helmet>
            )}

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
            <div className={`flex h-full w-full flex-col lg:flex-row transition-all duration-300 relative ${(isMobile || isTablet) && isFiltersOpen ? 'blur-sm pointer-events-none' : ''}`}>
                {/* --- Left Panel: List & Filters --- */}
                {/* On mobile/tablet: full-width overlay with slide animation. On lg+: side panel in split view */}
                 <div className={`absolute inset-0 z-10 h-full w-full bg-white flex flex-col lg:relative lg:w-[45%] xl:w-[55%] lg:flex-shrink-0 lg:border-r lg:border-neutral-200 ${ showViewToggle && mobileView === 'list' ? 'translate-x-0' : showViewToggle ? '-translate-x-full' : '' } lg:translate-x-0 transition-transform duration-300`}>
                    {searchMode !== 'ai' && (
                        <SearchHeader
                            t={t as any}
                            filters={filters}
                            suggestions={suggestions}
                            isQueryInputFocused={isQueryInputFocused}
                            isSearchingLocation={isSearchingLocation}
                            searchWrapperRef={searchWrapperRef}
                            onFilterChange={handleFilterChange}
                            onSearch={() => handleSearch()}
                            onQueryInputFocusChange={setIsQueryInputFocused}
                            onSuggestionClick={handleSuggestionClick}
                        />
                    )}
                    <div className="flex-shrink-0 px-3 pt-2">
                        <AdBannerSlot placement="search-top" />
                    </div>
                    <PropertyList {...propertyListProps} />
                    {/* Persistent sidebar-style ad slot at the foot of the results panel (desktop) */}
                    <div className="hidden lg:block flex-shrink-0 px-3 py-2 border-t border-neutral-100">
                        <AdBannerSlot placement="search-sidebar" rotate />
                    </div>
                </div>


                {/* --- Right Panel: Map --- */}
                {/* On mobile/tablet: full-width behind list panel. On lg: 50% map, on xl+: 40% map */}
                <div className="h-full w-full lg:w-[55%] xl:w-[45%] lg:flex-shrink-0 relative z-0 overflow-hidden">
                    <div className="absolute inset-0 overflow-hidden">
                        <MapComponent {...mapProps} />
                    </div>

                    {/* Draw hint banner - shown when navigating from explore cities */}
                    {showDrawHint && !isDrawing && !drawnBounds && (
                        <div className="absolute top-20 lg:top-4 left-4 right-4 lg:left-auto lg:right-auto lg:left-1/2 lg:-translate-x-1/2 z-[1002] animate-fade-in">
                            <div
                                className="bg-gradient-to-r from-primary to-blue-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3"
                                style={{
                                    boxShadow: '0 8px 32px rgba(2, 82, 205, 0.35)',
                                }}
                            >
                                <div className="flex-shrink-0 w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                                    <PencilIcon className="w-5 h-5 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold">{t('search:map.drawHint.title')}</p>
                                    <p className="text-xs text-white/80">{t('search:map.drawHint.subtitle')}</p>
                                </div>
                                <button
                                    onClick={() => setShowDrawHint(false)}
                                    className="flex-shrink-0 p-1.5 hover:bg-white/20 rounded-full transition-colors"
                                    aria-label="Dismiss hint"
                                >
                                    <XMarkIcon className="w-5 h-5 text-white" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* --- Mobile/Tablet View Overlays --- */}
                {showViewToggle && !isFiltersOpen && (
                    <>
                        {/* Mobile-only: floating search bar overlay (tablet uses SearchHeader instead) */}
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
                                            aria-label="Open menu"
                                        >
                                            <Bars3Icon className="w-6 h-6 text-neutral-800"/>
                                        </button>
                                        <SearchLocationBar
                                            filters={filters}
                                            suggestions={suggestions}
                                            isQueryInputFocused={isQueryInputFocused}
                                            isSearchingLocation={isSearchingLocation}
                                            searchWrapperRef={searchWrapperRef}
                                            onFilterChange={handleFilterChange}
                                            onSearch={() => handleSearch()}
                                            onQueryInputFocusChange={setIsQueryInputFocused}
                                            onSuggestionClick={handleSuggestionClick}
                                            variant="mobile"
                                        />
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
                                                <div className="w-8 h-8 rounded-full overflow-hidden">
                                                    {currentUser.avatarUrl ? (
                                                        <img src={currentUser.avatarUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" aria-hidden="true" />
                                                    ) : (
                                                        <DefaultAvatar gender={currentUser.gender} seed={currentUser.id || currentUser.name} avatarOptions={currentUser.avatarOptions} />
                                                    )}
                                                </div>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Floating List/Map toggle - shows on both mobile and tablet (Zillow-style) */}
                        <div className="absolute bottom-28 xs:bottom-32 sm:bottom-28 md:bottom-6 landscape:bottom-16 left-0 right-0 z-[100] p-3 sm:p-4 landscape:p-2 pointer-events-none flex justify-center" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)' }}>
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

            {(isMobile || isTablet) && isFiltersOpen && (
                <div className="fixed inset-0 z-30 flex flex-col">
                    <div className="absolute inset-0 bg-black/50" onClick={() => updateSearchPageState({ isFiltersOpen: false })}></div>
                    <div className="relative w-full h-full" onClick={(e) => { e.stopPropagation(); updateSearchPageState({ isFiltersOpen: false }); }}>
                        <div className="absolute inset-0 bg-white" onClick={e => e.stopPropagation()}>
                             <SearchMobileFilters
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
