import React, { useState, useEffect, useRef, memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import MapComponent from '@/src/features/map/components/MapComponent';
import PropertyCardSkeleton from '@/src/features/property-details/components/PropertyCardSkeleton';
import HighlightedPropertiesSection from '@/src/features/property-details/components/HighlightedPropertiesSection';
import { interleaveInFeedAds } from '@/features/ads';
import VillaFilters from './VillaFilters';
import VillaListingModeToggle from './VillaListingModeToggle';
import LuxuryVillaCard from './LuxuryVillaCard';
import Toast from '@/components/shared/Toast';
import { useVillaSearch } from '../hooks/useVillaSearch';
import { MapIcon, AdjustmentsHorizontalIcon, XMarkIcon, MagnifyingGlassIcon, Bars3Icon, Squares2x2Icon } from '@/constants';
import DefaultAvatar from '@/components/shared/DefaultAvatar';
import { LiquidGlassSwitch } from '@/src/components/ui/LiquidGlassSwitch';
import { SEO } from '@/src/components/seo';
import Footer from '@/components/shared/Footer';
import { useLocalizedNavigation } from '@/src/hooks/useLocalizedNavigation';
import { NominatimResult, Property } from '@/types';
import { VILLA_DESTINATIONS } from '@/src/features/home/data/villaDestinations';

const ITEMS_PER_PAGE = 20;

/* ── Global animation keyframes ── */
const VillaAnimationStyles = () => (
    <style>{`
    /* ── Card entrance ── */
    @keyframes villaSlideUp {
      0%   { opacity: 0; transform: translateY(30px) scale(0.96); }
      100% { opacity: 1; transform: translateY(0)    scale(1);    }
    }
    .villa-card-fly {
      opacity: 0;
      animation: villaSlideUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards;
      animation-delay: var(--card-delay, 0ms);
    }

    /* ── 3D magnetic tilt card with a persistent gilded-glow border ── */
    .villa-tilt-card {
      transform: perspective(900px) rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg));
      transition: transform 0.14s ease-out, box-shadow 0.4s ease;
      will-change: transform;
      /* resting state: fine gold hairline + soft warm glow */
      box-shadow:
        0 0 0 1px rgba(232,184,32,0.55),
        0 10px 28px rgba(0,0,0,0.20),
        0 0 22px rgba(232,184,32,0.16);
    }
    @keyframes villaGoldBreath {
      0%, 100% { box-shadow: 0 0 0 1px rgba(232,184,32,0.50), 0 10px 28px rgba(0,0,0,0.20), 0 0 20px rgba(232,184,32,0.14); }
      50%      { box-shadow: 0 0 0 1px rgba(232,184,32,0.70), 0 10px 30px rgba(0,0,0,0.22), 0 0 30px rgba(232,184,32,0.26); }
    }
    .villa-tilt-card { animation: villaGoldBreath 4.2s ease-in-out infinite; }
    .luxury-villa-card:hover.villa-tilt-card,
    .luxury-villa-card:hover .villa-tilt-card {
      animation: none;
      box-shadow:
        0 30px 60px rgba(0,0,0,0.40),
        0 0 0 1.5px rgba(232,184,32,0.95),
        0 0 44px rgba(232,184,32,0.42),
        0 0 80px rgba(232,184,32,0.22);
    }

    /* ── Parallax image layer ── */
    .villa-img-wrap {
      transform: translate(var(--imgX,0px), var(--imgY,0px)) scale(1.0);
      transition: transform 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    }
    .luxury-villa-card:hover .villa-img-wrap {
      transform: translate(var(--imgX,0px), var(--imgY,0px)) scale(1.09);
    }

    /* ── Cursor specular highlight ── */
    .villa-specular {
      background: radial-gradient(
        ellipse 55% 55% at var(--mx,50%) var(--my,50%),
        rgba(255,215,80,0.13) 0%,
        rgba(255,165,0,0.05) 40%,
        transparent 65%
      );
      transition: background 0.08s linear;
      mix-blend-mode: screen;
    }

    /* ── SVG gold border trace ── */
    @keyframes borderTrace {
      0%   { stroke-dashoffset: 1; opacity: 0; }
      8%   { opacity: 1; }
      100% { stroke-dashoffset: 0; opacity: 1; }
    }
    .villa-border-trace {
      stroke-dasharray: 1;
      stroke-dashoffset: 1;
      opacity: 0;
      transition: opacity 0.3s ease;
    }
    .luxury-villa-card:hover .villa-border-trace {
      animation: borderTrace 1.1s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
    }

    /* ── Price tag ── */
    .villa-price-tag {
      background: rgba(0,0,0,0.45);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(255,165,0,0.2);
    }

    /* ── "Reserve" CTA — solid & high-contrast so the label is always legible ── */
    .villa-cta-btn {
      background: rgba(20,16,9,0.9) !important;
      color: #ffffff;
      border-color: rgba(255,231,166,0.65) !important;
      text-shadow: 0 1px 2px rgba(0,0,0,0.6);
      box-shadow: 0 6px 20px rgba(0,0,0,0.45);
      transition: opacity 0.3s ease, transform 0.3s cubic-bezier(0.34,1.56,0.64,1), background 0.2s ease;
    }
    .villa-cta-btn:hover {
      background: rgba(20,16,9,0.98) !important;
    }

    /* ── Chip reveal ── */
    .luxury-chip {
      transition: opacity 0.32s ease, transform 0.32s cubic-bezier(0.34,1.56,0.64,1);
    }

    /* The CTA and chips are hidden until hover only where hovering is possible.
       On touch there is no hover, so they must be visible and tappable — they
       used to be opacity:0 forever, making "Request to Book" unreachable. */
    @media (hover: hover) and (pointer: fine) {
      .villa-cta-btn {
        opacity: 0;
        transform: translateY(6px) scale(0.95);
      }
      .luxury-villa-card:hover .villa-cta-btn,
      .luxury-villa-card:focus-within .villa-cta-btn {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
      .luxury-chip {
        opacity: 0;
        transform: translateY(8px);
      }
      .luxury-villa-card:hover .luxury-chip,
      .luxury-villa-card:focus-within .luxury-chip {
        opacity: 1;
        transform: translateY(0);
      }
    }


    /* ── Respect the OS "reduce motion" setting ──
       The card carries a permanent breathing glow plus parallax, specular and
       fly-in animations; all of them are decorative. */
    @media (prefers-reduced-motion: reduce) {
      .villa-card-fly,
      .villa-tilt-card,
      .villa-border-trace,
      .villa-img-wrap,
      .villa-cta-btn,
      .luxury-chip {
        animation: none !important;
        transition: none !important;
      }
      .villa-card-fly { opacity: 1; }
      .villa-tilt-card { transform: none; }
      .luxury-villa-card:hover .villa-img-wrap { transform: none; }
      .villa-specular { display: none; }
    }
  `}</style>
);

/* ── Destination quick-jumps for the hero ── */

/**
 * Derived from the one destination list rather than hand-written here.
 *
 * This used to be its own array of six, which drifted: it still pointed at
 * `destinations.julianAlps` and `destinations.pirinMountains` after both were
 * dropped from the shared list, and Julian Alps searched Bled — in Slovenia,
 * which is not one of the ten countries the platform covers. Deriving means a
 * destination added or renamed in one place cannot leave a dead chip here.
 *
 * One per country, in list order, so the row stays a spread of the region
 * instead of six neighbouring towns — and stays a sensible length now that the
 * shared list runs to dozens of entries.
 */
const DESTINATIONS = (() => {
    const seen = new Set<string>();
    return VILLA_DESTINATIONS.filter(d => {
        if (seen.has(d.country)) return false;
        seen.add(d.country);
        return true;
    }).map(d => ({
        labelKey: `destinations.${d.id}` as const,
        fallback: d.fallback,
        query: d.query,
        center: d.center as [number, number],
        zoom: d.zoom,
    }));
})();

/* ── Count-up hook for hero ── */
/**
 * Counts up from 0 to `target`.
 *
 * Must stay idempotent: React 18 StrictMode mounts effects twice (run →
 * cleanup → run). A "have I already animated this value?" ref guard breaks
 * that — the first run starts the interval, the cleanup clears it, and the
 * second run early-returns, leaving the number frozen at 0. So the effect
 * derives everything from `target` alone and is safe to re-run.
 */
const useCountUp = (target: number): number => {
    const safeTarget = Number.isFinite(target) && target > 0 ? Math.floor(target) : 0;
    const [val, setVal] = React.useState(safeTarget);

    useEffect(() => {
        if (safeTarget === 0) { setVal(0); return; }

        // Reduced motion: land on the final number without the animation.
        const reduceMotion = typeof window !== 'undefined'
            && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        if (reduceMotion) { setVal(safeTarget); return; }

        let current = 0;
        setVal(0);
        const step = Math.max(1, Math.ceil(safeTarget / 28));
        const id = setInterval(() => {
            current = Math.min(current + step, safeTarget);
            setVal(current);
            if (current >= safeTarget) clearInterval(id);
        }, 22);
        // If the animation is cut short, still show the true total.
        return () => { clearInterval(id); setVal(safeTarget); };
    }, [safeTarget]);

    return val;
};

/* ── Trust strip below hero ── */
const TrustStrip: React.FC = () => {
    const { t } = useTranslation(['villas']);
    const items = [
        { icon: '🏛️', title: t('villas:trust.handpicked', 'Handpicked Estates'), desc: t('villas:trust.handpickedDesc', 'Every villa personally vetted for exceptional quality') },
        { icon: '🎩', title: t('villas:trust.concierge', 'Dedicated Concierge'),  desc: t('villas:trust.conciergeDesc', 'White-glove support from inquiry to checkout')  },
        { icon: '💎', title: t('villas:trust.bestPrice', 'Best-Price Promise'),  desc: t('villas:trust.bestPriceDesc', 'No hidden fees — ever. Book with total confidence')  },
        { icon: '🔒', title: t('villas:trust.privacy', 'Complete Privacy'),    desc: t('villas:trust.privacyDesc', 'Your stay, your retreat — absolute discretion guaranteed')    },
    ];
    return (
        // Wraps into a 2x2 grid on a phone rather than scrolling sideways.
        // As a 170px-wide horizontal strip it showed two and a bit items on a
        // 390px screen, with the third sliced down the middle and no visible
        // affordance saying it could be scrolled — it read as broken layout
        // rather than as more content.
        <div className="border-b border-black/[0.06] bg-white">
            <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-black/[0.05]">
                {items.map((item, i) => (
                    <div key={i} className="flex items-start gap-2.5 px-3 py-3 sm:px-4">
                        <span className="text-base flex-shrink-0 mt-0.5">{item.icon}</span>
                        <div className="min-w-0">
                            <p className="text-[11px] font-semibold text-neutral-700 leading-tight">{item.title}</p>
                            <p className="text-[10px] text-neutral-400 leading-snug mt-0.5">{item.desc}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

interface LuxuryHeroProps {
    count: number;
    minPrice: number | null;
    /** Only rentals are priced per night; sale villas must not say "/night". */
    isNightly: boolean;
    activeQuery: string;
    onDestinationClick: (dest: typeof DESTINATIONS[number]) => void;
}

const LuxuryHero: React.FC<LuxuryHeroProps> = ({ count, minPrice, isNightly, activeQuery, onDestinationClick }) => {
    const { t } = useTranslation(['villas']);
    const displayCount = useCountUp(count);
    return (
        <div
            className="relative -mx-3 -mt-2 mb-0 border-b border-black/[0.06]"
            style={{ background: 'linear-gradient(180deg, #fbfbfd 0%, #f4f6f9 100%)' }}
        >
            <div className="relative px-5 pt-6 pb-5 text-center max-w-3xl mx-auto">
                {/* Eyebrow */}
                <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-neutral-400 mb-2">
                    {t('villas:hero.tagline2', 'Curated collection')}
                </p>

                {/* Title */}
                <h2 className="font-semibold tracking-[-0.02em] text-neutral-900 leading-tight mb-1.5" style={{ fontSize: 'clamp(24px,4vw,32px)' }}>
                    {t('villas:hero.title1', 'Luxury')}{' '}
                    <span style={{ color: 'var(--color-villa-gold-deep)' }}>{t('villas:hero.title2', 'Villas')}</span>
                </h2>

                <p className="text-neutral-400 text-[12px] mb-4">
                    {t('villas:hero.privateEstates', 'Private estates · Extraordinary settings · The Balkans')}
                </p>

                {/* Live count */}
                {count > 0 && (
                    <p className="text-[12px] text-neutral-500 mb-4">
                        <span className="font-semibold text-neutral-800">{displayCount}</span>
                        {' '}{count === 1 ? t('villas:hero.villaAvailable', 'villa available') : t('villas:hero.villasAvailable', 'villas available')}
                        {minPrice != null ? (
                            <span className="text-neutral-400"> · {t('villas:hero.from', 'from')} <span className="font-medium" style={{ color: 'var(--color-villa-gold-deep)' }}>€{minPrice.toLocaleString()}</span>{isNightly ? t('villas:perNightSuffix', '/night') : ''}</span>
                        ) : null}
                    </p>
                )}
                {count === 0 && <div className="mb-4" />}

                {/* Destination quick-jumps — clean soft chips */}
                <div className="flex flex-wrap justify-center gap-2">
                    {DESTINATIONS.map(dest => {
                        const isActive = activeQuery === dest.query;
                        return (
                            <button
                                key={dest.query}
                                onClick={() => onDestinationClick(dest)}
                                // 44px tall on touch so the destination row is
                                // tappable without aiming; unchanged on desktop.
                                // lg, not sm — tablets are touch devices here too.
                                className={`min-h-[44px] lg:min-h-0 px-4 lg:px-3 py-2.5 lg:py-1.5 rounded-full text-[13px] lg:text-[12px] font-medium border transition-all touch-manipulation focus-visible:ring-2 focus-visible:ring-[var(--color-villa-gold-calm)]/60 focus:outline-none ${
                                    isActive
                                        ? 'bg-primary/10 text-primary border-primary/40'
                                        : 'bg-white text-neutral-600 border-black/[0.08] hover:border-primary/30 hover:text-primary'
                                }`}
                            >
                                {t(`villas:${dest.labelKey}`, dest.fallback)}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

/* ── Animated luxury card with staggered entrance ── */
const AnimatedVillaCard = memo<{
    property: Property;
    index: number;
    onHover?: (id: string | null) => void;
    animateEntrance?: boolean;
}>(({ property, index, onHover, animateEntrance }) => {
    const delay = animateEntrance ? Math.min(index * 70, 1400) : 0;
    return (
        <div
            className={animateEntrance ? 'villa-card-fly' : undefined}
            style={animateEntrance ? { '--card-delay': `${delay}ms` } as React.CSSProperties : undefined}
            onMouseEnter={() => onHover?.(property.id)}
            onMouseLeave={() => onHover?.(null)}
        >
            <LuxuryVillaCard property={property} priority={index < 4} />
        </div>
    );
});

interface VillaSearchPageProps {
    onToggleSidebar: () => void;
}

const VillaSearchPage: React.FC<VillaSearchPageProps> = ({ onToggleSidebar }) => {
    const { t } = useTranslation(['villas', 'search', 'common']);
    const { getLocalizedPath } = useLocalizedNavigation();

    /*
     * The floating mobile header sits above the list rather than in it, so the
     * list needs a spacer of exactly its height. That spacer used to be a
     * hardcoded 56px and was never revisited when the header grew a 52px top
     * inset and a "Luxury Villas" pill beneath the search bar — about 142px in
     * total. The result was that the header covered the top ~86px of the list,
     * which is where the All / For Rent / For Sale control and the sort
     * dropdown live: they were not merely clipped, they were unclickable,
     * because the header sits above them in the stacking order.
     *
     * Measured rather than re-hardcoded, since the height moves with the
     * safe-area inset, the pill's filter badge and text length in other
     * languages.
     */
    const floatingHeaderRef = useRef<HTMLDivElement>(null);
    const [headerHeight, setHeaderHeight] = useState(56);

    useEffect(() => {
        const el = floatingHeaderRef.current;
        if (!el) return;
        const measure = () => setHeaderHeight(el.getBoundingClientRect().height);
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        return () => ro.disconnect();
    });

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
        villaProperties,
        totalVillaCount,
        baseFilteredProperties,
        listProperties,
        listingMode,
        handleListingModeChange,
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
        flyTo,
    } = useVillaSearch();

    const [isFiltersOpen, setIsFiltersOpen] = React.useState(false);

    /* Entrance animation: animate cards when villa data first loads */
    const [animateCards, setAnimateCards] = useState(true);
    // The entrance plays once, on the first load. It used to `return` before
    // updating the ref, so the flag stayed true and every realtime refetch
    // replayed the 2.5s staggered fly-in over cards already on screen.
    const hasPlayedEntranceRef = useRef(false);
    useEffect(() => {
        if (isLoading || hasPlayedEntranceRef.current) return;
        hasPlayedEntranceRef.current = true;
        setAnimateCards(true);
        const timer = setTimeout(() => setAnimateCards(false), 2500);
        return () => clearTimeout(timer);
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
        let pageTimer: ReturnType<typeof setTimeout> | null = null;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && !isLoadingMore && visibleCount < listProperties.length) {
                    setIsLoadingMore(true);
                    pageTimer = setTimeout(() => {
                        setVisibleCount(prev => Math.min(prev + ITEMS_PER_PAGE, listProperties.length));
                        setIsLoadingMore(false);
                    }, 400);
                }
            },
            { rootMargin: '200px', threshold: 0 }
        );
        observer.observe(loadMoreRef.current);
        return () => {
            observer.disconnect();
            if (pageTimer) clearTimeout(pageTimer);
        };
    }, [visibleCount, listProperties.length, isLoadingMore]);

    /* Active filter count for badge */
    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (filters.query && filters.query.trim()) count++;
        if (filters.country && filters.country !== 'any') count++;
        if (filters.minPrice != null) count++;
        if (filters.maxPrice != null) count++;
        if (filters.beds != null) count++;
        if (filters.baths != null) count++;
        if (filters.viewType && filters.viewType !== 'any') count++;
        if ((filters as any).hasPool === true) count++;
        if ((filters as any).hasGarden === true) count++;
        if (filters.furnishing && filters.furnishing !== 'any') count++;
        // Reset also clears the market toggle, so it has to count here —
        // otherwise "For Sale" hid the Reset button that would undo it.
        if (listingMode !== 'any') count++;
        const amenities = (filters.amenities as string[] | undefined) ?? [];
        count += amenities.length;
        return count;
    }, [filters, listingMode]);

    /* Min price from the filtered results ("from €X/night" in the results bar) */
    const minResultPrice = useMemo(() => {
        if (listProperties.length === 0) return null;
        const prices = listProperties.map(p => p.price).filter(Boolean);
        return prices.length > 0 ? Math.min(...prices) : null;
    }, [listProperties]);

    /* Hero shows the size of the whole collection, taken from the API's own
       countDocuments rather than the length of the page we happened to fetch.
       The filtered count lives in the results bar. */
    const collectionCount = totalVillaCount || villaProperties.length;
    const collectionMinPrice = useMemo(() => {
        const prices = villaProperties.map(p => p.price).filter((n): n is number => typeof n === 'number' && n > 0);
        return prices.length > 0 ? Math.min(...prices) : null;
    }, [villaProperties]);

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
                    {/* Spacer matching the floating mobile/tablet header, so
                        the list starts below it instead of underneath it. */}
                    {(isMobile || isTablet) && (
                        <div className="flex-shrink-0" style={{ height: headerHeight }} aria-hidden />
                    )}

                    {/* Desktop header — sticky, new 3-tier design */}
                    <div className="hidden lg:block sticky top-0 z-20">

                        {/* Tier 1: Soft liquid-glass brand bar — frosted white, hairline edge */}
                        <div
                            className="relative flex items-center justify-between px-4 border-b border-black/[0.06]"
                            style={{ height: '56px', background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)' }}
                        >
                            {/* Left: brand + stats */}
                            <div className="flex items-center gap-2.5 min-w-0">
                                <span className="text-lg flex-shrink-0">🏛️</span>
                                <span className="text-neutral-900 font-semibold text-base tracking-[-0.01em] flex-shrink-0">
                                    {t('villas:title', 'Luxury Villas')}
                                </span>
                                {listProperties.length > 0 && (
                                    <>
                                        <span className="text-neutral-300 text-sm flex-shrink-0">·</span>
                                        <span className="text-neutral-500 text-sm flex-shrink-0">
                                            {listProperties.length} {listProperties.length === 1 ? t('villas:villa', 'villa') : t('villas:villas', 'villas')}
                                        </span>
                                        {minResultPrice != null && (
                                            <>
                                                <span className="text-neutral-300 text-sm flex-shrink-0">·</span>
                                                <span className="text-sm flex-shrink-0 font-medium" style={{ color: 'var(--color-villa-gold-deep)' }}>
                                                    {listingMode === 'rent'
                                                        ? t('villas:fromPerNight', 'from {{price}}/night', { price: `€${minResultPrice.toLocaleString()}` })
                                                        : t('villas:fromPrice', 'from {{price}}', { price: `€${minResultPrice.toLocaleString()}` })}
                                                </span>
                                            </>
                                        )}
                                    </>
                                )}
                            </div>
                            {/* Right: List Your Villa CTA */}
                            <button
                                onClick={handleListVilla}
                                className="flex-shrink-0 ml-4 h-8 px-3.5 rounded-xl text-xs font-semibold text-white bg-primary hover:bg-primary-dark transition-colors active:scale-95 shadow-sm"
                            >
                                + {t('villas:createListing', 'List Your Villa')}
                            </button>
                        </div>

                        {/* Tier 2: Search bar — 44px */}
                        <div
                            className="flex items-center px-4"
                            style={{ height: '44px', background: 'rgba(255,255,255,0.9)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}
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
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[var(--color-villa-gold-bright)] mx-auto" />
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
                    {/* pb-44: the floating list/map switch sits 96px up from
                        the bottom and is ~56px tall, so 112px of padding left
                        the last card — and the empty state's own button —
                        sitting underneath it. */}
                    <div className="flex-1 overflow-y-auto pb-44 lg:pb-3 glass-scrollbar" data-scroll-container>

                        {/* Results bar */}
                        <div className="sticky top-0 bg-white border-b border-gray-100 z-[100]">
                            {/* flex-wrap, and the market toggle takes a row of
                                its own below 1024px. Once the toggle grew to a
                                44px touch target it no longer fitted beside the
                                count and the sort dropdown on a 390px screen —
                                it kept its width (the labels cannot wrap) and
                                slid underneath the sort control. */}
                            <div className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
                                {/* Left: count + active filter chips */}
                                <div className="flex items-center gap-2 min-w-0 flex-wrap">
                                    {/* The live region is this short count, not
                                        the whole list — announcing every card on
                                        each filter change is unusable. */}
                                    <p className="text-xs font-semibold text-gray-700 flex-shrink-0" role="status" aria-live="polite" aria-atomic="true">
                                        {listProperties.length}{' '}
                                        <span className="text-gray-400 font-normal">
                                            {t('villas:exclusiveVillas', 'exclusive villas')}
                                        </span>
                                    </p>
                                    {filters.query && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--color-villa-gold-bright)]/10 text-[var(--color-primary)] text-[11px] font-medium max-w-[140px]">
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
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--color-villa-gold-bright)]/10 text-[var(--color-primary)] text-[11px] font-medium">
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
                                    {minResultPrice != null && listProperties.length > 0 && listingMode === 'rent' && (
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
                                            className="block text-xs bg-white border border-gray-200 rounded-xl text-gray-700 px-3 py-1.5 pr-7 focus:outline-none focus:border-[var(--color-primary)]/40 focus:ring-1 focus:ring-[var(--color-primary)]/20 transition-all appearance-none"
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

                                {/* Market toggle — its own full-width row on
                                    touch, inline on desktop. */}
                                <div className="w-full lg:w-auto lg:order-none">
                                    <VillaListingModeToggle
                                        mode={listingMode}
                                        onChange={handleListingModeChange}
                                        className="w-full lg:w-auto"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Card grid / loading / empty states */}
                        <div className="p-3 pt-0 bg-gray-50">
                            {(isLoading || isSearchFiltering) ? (
                                /* Cinematic loading state */
                                <>
                                    <div className="relative -mx-3 -mt-2 mb-4 border-b border-black/[0.06]"
                                        style={{ background: 'linear-gradient(180deg, #fbfbfd 0%, #f4f6f9 100%)' }}
                                    >
                                        <div className="relative px-5 py-8 text-center">
                                            <div className="mx-auto w-8 h-8 mb-3 rounded-full border-2 border-neutral-200 border-t-primary animate-spin" />
                                            <p className="text-neutral-500 text-xs font-medium">
                                                {t('villas:discoveringVillas', 'Curating your exclusive collection...')}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        {[...Array(6)].map((_, i) => <PropertyCardSkeleton key={i} index={i} />)}
                                    </div>
                                </>
                            ) : error ? (
                                <div className="text-center py-12">
                                    <p className="text-sm text-red-400 mb-2">{error}</p>
                                    <button onClick={handleSearch} className="text-sm text-[var(--color-primary)] hover:underline">
                                        {t('common:tryAgain')}
                                    </button>
                                </div>
                            ) : listProperties.length === 0 ? (
                                /* Cinematic empty state */
                                <>
                                    <LuxuryHero
                                        count={collectionCount}
                                        minPrice={collectionMinPrice}
                                        isNightly={listingMode === 'rent'}
                                        activeQuery={filters.query ?? ''}
                                        onDestinationClick={(dest) => {
                                            handleFilterChange('query', dest.query);
                                            handleSearch();
                                            flyTo(dest.center, dest.zoom);
                                        }}
                                    />
                                    <TrustStrip />
                                    <div className="flex justify-center py-8 px-3">
                                        <div className="bg-white rounded-2xl shadow-sm p-8 text-center max-w-md w-full border border-[var(--color-villa-gold-bright)]/10">
                                            <div className="text-5xl mb-3">🏛️</div>
                                            <h3 className="text-gray-800 font-bold text-lg mb-1">
                                                {t('villas:noProperties', 'No luxury villas found')}
                                            </h3>
                                            <p className="text-gray-400 text-sm mb-5 leading-relaxed">
                                                {t('villas:noPropertiesHint', 'Try a destination above or adjust your filters')}
                                            </p>
                                            <button
                                                onClick={handleResetFilters}
                                                className="bg-primary text-white rounded-xl px-5 py-2.5 font-semibold text-sm hover:opacity-90 transition-opacity"
                                            >
                                                {t('villas:clearFilters', 'Clear All Filters')}
                                            </button>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <VillaAnimationStyles />
                                    {/* Cinematic hero banner — scrolls away */}
                                    <LuxuryHero
                                        count={collectionCount}
                                        minPrice={collectionMinPrice}
                                        isNightly={listingMode === 'rent'}
                                        activeQuery={filters.query ?? ''}
                                        onDestinationClick={(dest) => {
                                            const isActive = (filters.query ?? '') === dest.query;
                                            handleFilterChange('query', isActive ? '' : dest.query);
                                            if (!isActive) {
                                                handleSearch();
                                                flyTo(dest.center, dest.zoom);
                                            }
                                        }}
                                    />
                                    <TrustStrip />
                                    <HighlightedPropertiesSection properties={listProperties} />
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-4">
                                        {interleaveInFeedAds(
                                            listProperties.slice(0, visibleCount).map((property, index) => (
                                                <AnimatedVillaCard
                                                    key={property.id}
                                                    property={property}
                                                    index={index}
                                                    onHover={setHoveredPropertyId}
                                                    animateEntrance={animateCards || animateFilteredCards}
                                                />
                                            )),
                                            'villas',
                                        )}
                                    </div>
                                    {visibleCount < listProperties.length && (
                                        <div ref={loadMoreRef}>
                                            {isLoadingMore && (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-4">
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
                    {/* Pin colour key — gold = for rent, emerald = for sale */}
                    {listProperties.length > 0 && (
                        <div className="absolute bottom-4 left-4 z-[500] pointer-events-none">
                            <div
                                className="flex items-center gap-3 rounded-full px-3 py-1.5 text-[11px] font-semibold text-neutral-700 border border-black/[0.06] shadow-sm"
                                style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px) saturate(160%)', WebkitBackdropFilter: 'blur(12px) saturate(160%)' }}
                            >
                                {/* Only the key(s) that can actually appear for
                                    the current market — a "For Sale" legend on a
                                    rentals-only map explains nothing. */}
                                {listingMode !== 'sale' && (
                                    <span className="flex items-center gap-1.5">
                                        <span className="w-2.5 h-2.5 rounded-full ring-1 ring-white shadow-sm" style={{ background: 'var(--color-villa-gold)' }} />
                                        {t('villas:filters.forRent', 'For Rent')}
                                    </span>
                                )}
                                {listingMode !== 'rent' && (
                                    <span className="flex items-center gap-1.5">
                                        <span className="w-2.5 h-2.5 rounded-full ring-1 ring-white shadow-sm" style={{ background: '#10B981' }} />
                                        {t('villas:filters.forSale', 'For Sale')}
                                    </span>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Mobile/Tablet overlays */}
                {showViewToggle && !isFiltersOpen && (
                    <>
                        {/* Mobile/Tablet floating search bar */}
                        {(isMobile || isTablet) && (
                            <div
                                ref={floatingHeaderRef}
                                className="absolute top-0 left-0 right-0 z-[100] pb-2 landscape:pb-1.5 pointer-events-none"
                                style={{
                                    // The same token the buy and rent pages
                                    // use. The map's own controls sit at
                                    // `calc(var(--floating-search-top-pad) +
                                    // 60px)`, i.e. exactly under a one-row
                                    // search bar — so anything that does not
                                    // start at this token, or that adds a
                                    // second row, lands on top of them. This
                                    // page had both problems: a hardcoded 52px
                                    // top and a pill below the bar.
                                    paddingTop: 'var(--floating-search-top-pad)',
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
                                                    placeholder={t('villas:filters.searchCity', 'Search by location...')}
                                                    className="w-full pl-9 pr-8 py-2 text-sm bg-transparent border-none outline-none placeholder-gray-400"
                                                    aria-label={t('villas:filters.searchCity', 'Search by location...')}
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
                                    {/* Luxury label pill — list view only.
                                        In map view it was a second row under
                                        the search bar, sitting exactly where
                                        the map puts Satellite / Reset / Locate
                                        / Draw, and covering them. The buy and
                                        rent pages float the search bar alone
                                        for that reason. Nothing is lost: the
                                        filter button in the bar already
                                        carries the active-filter count, and
                                        the page title is in the hero above the
                                        list. */}
                                    <div className={`justify-center ${mobileView === 'map' ? 'hidden' : 'flex'}`}>
                                        <span
                                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-white text-[11px] font-semibold backdrop-blur-sm shadow-sm"
                                            style={{ background: 'var(--color-primary)' }}
                                        >
                                            <span>🏛️</span>
                                            <span>{t('villas:title', 'Luxury Villas')}</span>
                                            {activeFilterCount > 0 && (
                                                <span
                                                    className="ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                                                    style={{ background: 'var(--color-villa-gold-bright)', color: 'var(--color-primary)' }}
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
                                            style={{ background: 'var(--color-villa-gold-bright)', color: 'var(--color-primary)' }}
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
