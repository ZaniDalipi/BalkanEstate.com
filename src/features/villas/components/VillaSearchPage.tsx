import React, { useState, useEffect, useRef, memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import MapComponent from '@/src/features/map/components/MapComponent';
import PropertyCardSkeleton from '@/src/features/property-details/components/PropertyCardSkeleton';
import HighlightedPropertiesSection from '@/src/features/property-details/components/HighlightedPropertiesSection';
import VillaFilters from './VillaFilters';
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

    /* ── Gold shimmer bar ── */
    @keyframes goldShimmer {
      0%   { background-position: -200% center; }
      100% { background-position:  200% center; }
    }
    .gold-shimmer {
      background: linear-gradient(90deg,
        transparent 0%,
        rgba(255,165,0,0.28) 38%,
        rgba(255,210,60,0.50) 50%,
        rgba(255,165,0,0.28) 62%,
        transparent 100%
      );
      background-size: 200% auto;
      animation: goldShimmer 2.5s linear infinite;
    }

    /* ── 3D magnetic tilt card ── */
    .villa-tilt-card {
      transform: perspective(900px) rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg));
      transition: transform 0.14s ease-out, box-shadow 0.35s ease;
      will-change: transform;
    }
    .luxury-villa-card:hover.villa-tilt-card,
    .luxury-villa-card:hover .villa-tilt-card {
      box-shadow:
        0 32px 60px rgba(0,0,0,0.38),
        0 0 0 1px rgba(255,165,0,0.12),
        0 0 50px rgba(255,165,0,0.06);
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
    @keyframes borderFade {
      0%   { stroke-dashoffset: 0; opacity: 1; }
      100% { stroke-dashoffset: 1; opacity: 0; }
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

    /* ── Luxury badge on card ── */
    .villa-luxury-badge {
      background: linear-gradient(135deg, #FFF0A0 0%, #FFA500 45%, #E8850A 100%);
      color: #3D1F00;
      box-shadow: 0 2px 12px rgba(255,165,0,0.35);
    }

    /* ── Price tag ── */
    .villa-price-tag {
      background: rgba(0,0,0,0.45);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(255,165,0,0.2);
    }

    /* ── "Reserve" CTA ── */
    .villa-cta-btn {
      background: rgba(255,255,255,0.10);
      opacity: 0;
      transform: translateY(6px) scale(0.95);
      transition: opacity 0.3s ease, transform 0.3s cubic-bezier(0.34,1.56,0.64,1);
    }
    .luxury-villa-card:hover .villa-cta-btn {
      opacity: 1;
      transform: translateY(0) scale(1);
    }

    /* ── Chip reveal ── */
    .luxury-chip {
      opacity: 0;
      transform: translateY(8px);
      transition: opacity 0.32s ease, transform 0.32s cubic-bezier(0.34,1.56,0.64,1);
    }
    .luxury-villa-card:hover .luxury-chip {
      opacity: 1;
      transform: translateY(0);
    }

    /* ── Aurora blobs in hero ── */
    @keyframes aurora1 {
      0%   { transform: translate(0%,0%) scale(1);    }
      25%  { transform: translate(8%,-6%) scale(1.1); }
      50%  { transform: translate(2%,9%) scale(0.94); }
      75%  { transform: translate(-7%,-2%) scale(1.06);}
      100% { transform: translate(0%,0%) scale(1);    }
    }
    @keyframes aurora2 {
      0%   { transform: translate(0%,0%) scale(1.08); }
      33%  { transform: translate(-12%,7%) scale(0.88);}
      66%  { transform: translate(6%,-9%) scale(1.18); }
      100% { transform: translate(0%,0%) scale(1.08); }
    }
    @keyframes aurora3 {
      0%   { transform: translate(0%,0%) scale(0.92); }
      40%  { transform: translate(11%,-11%) scale(1.12);}
      70%  { transform: translate(-4%,6%) scale(1.0);  }
      100% { transform: translate(0%,0%) scale(0.92); }
    }
    .aurora-1 { animation: aurora1 22s ease-in-out infinite; }
    .aurora-2 { animation: aurora2 28s ease-in-out infinite 3s; }
    .aurora-3 { animation: aurora3 18s ease-in-out infinite 6s; }
    .aurora-4 { animation: aurora1 14s ease-in-out infinite 1s; }

    /* ── Star twinkle ── */
    @keyframes starTwinkle {
      0%,100% { opacity: var(--so,0.25); }
      50%      { opacity: var(--sp,0.85); }
    }
    .star-dot {
      position: absolute;
      border-radius: 50%;
      background: white;
      animation: starTwinkle var(--dur,2.5s) ease-in-out infinite;
      animation-delay: var(--delay,0s);
    }

    /* ── Destination pill landscape reveal ── */
    .villa-dest-landscape {
      max-height: 0;
      overflow: hidden;
      opacity: 0;
      transition: max-height 0.35s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease;
    }
    .villa-dest-pill:hover .villa-dest-landscape,
    .villa-dest-pill.active .villa-dest-landscape {
      max-height: 22px;
      opacity: 1;
    }
    .villa-dest-pill {
      transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1), background 0.2s ease, border-color 0.2s ease;
    }
    .villa-dest-pill:hover { transform: scale(1.06) translateY(-1px); }
    .villa-dest-pill.active { transform: scale(1.04); }

    /* ── Hero title word reveal ── */
    @keyframes wordDrop {
      0%   { opacity: 0; transform: translateY(-20px) scale(0.9); }
      100% { opacity: 1; transform: translateY(0) scale(1); }
    }
    .hero-word {
      display: inline-block;
      opacity: 0;
      animation: wordDrop 0.65s cubic-bezier(0.34,1.56,0.64,1) forwards;
      animation-delay: var(--wd, 0ms);
    }

    /* ── Floating gold motes in hero ── */
    @keyframes moteFloat {
      0%   { transform: translateY(0px) translateX(0px); opacity: 0; }
      15%  { opacity: var(--mo, 0.6); }
      85%  { opacity: var(--mo, 0.4); }
      100% { transform: translateY(var(--my,-60px)) translateX(var(--mx,8px)); opacity: 0; }
    }
    .gold-mote {
      position: absolute;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(255,200,50,0.9) 0%, rgba(255,140,0,0.4) 70%, transparent 100%);
      animation: moteFloat var(--dur,4s) ease-out infinite;
      animation-delay: var(--delay,0s);
      pointer-events: none;
    }
  `}</style>
);

/* ── Deterministic star positions (index-based, not random) ── */
const STARS = Array.from({ length: 48 }, (_, i) => ({
    left:  `${((i * 73 + 17) % 100)}%`,
    top:   `${((i * 41 + 31) % 100)}%`,
    size:  (i % 3 === 0) ? 2 : (i % 3 === 1) ? 1.5 : 1,
    dur:   `${2.2 + (i % 7) * 0.45}s`,
    delay: `${(i * 0.23) % 4}s`,
    so:    0.18 + (i % 5) * 0.1,
    sp:    0.6  + (i % 4) * 0.1,
}));

/* ── Floating gold motes ── */
const MOTES = Array.from({ length: 14 }, (_, i) => ({
    left:  `${((i * 61 + 9) % 92) + 4}%`,
    top:   `${((i * 37 + 23) % 60) + 20}%`,
    size:  (i % 3 === 0) ? 4 : (i % 3 === 1) ? 3 : 2,
    dur:   `${3.5 + (i % 6) * 0.7}s`,
    delay: `${(i * 0.55) % 5}s`,
    mx:    `${((i % 5) - 2) * 6}px`,
    my:    `-${40 + (i % 4) * 15}px`,
    mo:    0.4 + (i % 3) * 0.15,
}));

/* ── Destinations with landscape SVG silhouettes ── */
const DESTINATIONS = [
    {
        labelKey: 'destinations.julianAlps' as const,
        fallback: '⛰️ Julian Alps',
        query: 'Bled',
        center: [46.3683, 14.1146] as [number, number],
        zoom: 11,
        landscape: 'M0 20 L6 8 L10 13 L16 3 L22 9 L27 2 L33 8 L38 5 L43 12 L48 6 L53 13 L57 7 L60 15 L60 20 Z',
    },
    {
        labelKey: 'destinations.kotorBay' as const,
        fallback: '🌊 Bay of Kotor',
        query: 'Kotor',
        center: [42.4247, 18.7712] as [number, number],
        zoom: 12,
        landscape: 'M0 20 L0 11 C8 7 16 14 24 8 C32 3 40 13 48 7 C52 5 56 10 60 8 L60 20 Z',
    },
    {
        labelKey: 'destinations.budvaRiviera' as const,
        fallback: '🌅 Budva Riviera',
        query: 'Budva',
        center: [42.2864, 18.8400] as [number, number],
        zoom: 12,
        landscape: 'M0 20 L0 13 C12 9 22 16 36 9 C46 4 53 12 60 9 L60 20 Z',
    },
    {
        labelKey: 'destinations.lakeOhrid' as const,
        fallback: '🏞️ Lake Ohrid',
        query: 'Ohrid',
        center: [41.1172, 20.8016] as [number, number],
        zoom: 11,
        landscape: 'M0 20 L0 14 C16 11 30 16 44 12 C51 10 56 13 60 12 L60 20 Z',
    },
    {
        labelKey: 'destinations.dubrovnik' as const,
        fallback: '🏛️ Dubrovnik',
        query: 'Dubrovnik',
        center: [42.6507, 18.0944] as [number, number],
        zoom: 13,
        landscape: 'M0 20 L0 11 L4 11 L4 8 L7 8 L7 5 L10 5 L10 8 L14 8 L14 6 L18 6 L18 9 L22 9 L26 13 L30 13 L34 8 L38 7 L42 10 L46 13 L50 10 L54 8 L57 11 L60 12 L60 20 Z',
    },
    {
        labelKey: 'destinations.pirinMountains' as const,
        fallback: '🌲 Pirin Mountains',
        query: 'Bansko',
        center: [41.8374, 23.4882] as [number, number],
        zoom: 12,
        landscape: 'M0 20 L4 9 L8 14 L13 4 L19 10 L24 2 L29 8 L33 5 L38 12 L43 7 L48 11 L53 6 L57 13 L60 17 L60 20 Z',
    },
];

/* ── Count-up hook for hero ── */
const useCountUp = (target: number): number => {
    const [val, setVal] = React.useState(0);
    const prev = useRef(0);
    useEffect(() => {
        if (target === prev.current) return;
        prev.current = target;
        if (target === 0) { setVal(0); return; }
        let current = 0;
        const step = Math.max(1, Math.ceil(target / 28));
        const id = setInterval(() => {
            current = Math.min(current + step, target);
            setVal(current);
            if (current >= target) clearInterval(id);
        }, 22);
        return () => clearInterval(id);
    }, [target]);
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
        <div
            className="overflow-x-auto border-b border-[#FFA500]/10"
            style={{ background: 'linear-gradient(135deg, #fffdf5 0%, #fffbee 100%)', scrollbarWidth: 'none' }}
        >
            <div className="flex min-w-max lg:min-w-0 lg:grid lg:grid-cols-4 divide-x divide-[#FFA500]/10">
                {items.map((item, i) => (
                    <div key={i} className="flex items-start gap-2.5 px-4 py-3 min-w-[170px] lg:min-w-0">
                        <span className="text-base flex-shrink-0 mt-0.5">{item.icon}</span>
                        <div className="min-w-0">
                            <p className="text-[11px] font-bold text-gray-800 leading-tight truncate">{item.title}</p>
                            <p className="text-[10px] text-gray-400 leading-snug mt-0.5">{item.desc}</p>
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
    activeQuery: string;
    onDestinationClick: (dest: typeof DESTINATIONS[number]) => void;
}

const LuxuryHero: React.FC<LuxuryHeroProps> = ({ count, minPrice, activeQuery, onDestinationClick }) => {
    const { t } = useTranslation(['villas']);
    const displayCount = useCountUp(count);
    return (
        <div
            className="relative overflow-hidden -mx-3 -mt-2 mb-0"
            style={{ background: 'linear-gradient(160deg, #020818 0%, #06112e 30%, #0a1d4a 60%, #040c22 100%)', minHeight: '220px' }}
        >
            {/* ── Aurora nebula blobs ── */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="aurora-1 absolute rounded-full"
                     style={{ width: '75%', height: '200%', left: '-18%', top: '-60%',
                              background: 'radial-gradient(ellipse, rgba(15,50,210,0.55) 0%, rgba(8,25,120,0.18) 50%, transparent 70%)',
                              filter: 'blur(52px)' }} />
                <div className="aurora-2 absolute rounded-full"
                     style={{ width: '65%', height: '160%', right: '-12%', top: '-25%',
                              background: 'radial-gradient(ellipse, rgba(110,20,220,0.42) 0%, rgba(60,8,130,0.12) 50%, transparent 70%)',
                              filter: 'blur(58px)' }} />
                <div className="aurora-3 absolute rounded-full"
                     style={{ width: '58%', height: '140%', left: '18%', top: '5%',
                              background: 'radial-gradient(ellipse, rgba(0,130,200,0.32) 0%, rgba(0,70,110,0.08) 50%, transparent 70%)',
                              filter: 'blur(48px)' }} />
                <div className="aurora-4 absolute rounded-full"
                     style={{ width: '40%', height: '80%', left: '30%', top: '-20%',
                              background: 'radial-gradient(ellipse, rgba(200,130,0,0.22) 0%, transparent 65%)',
                              filter: 'blur(44px)' }} />
            </div>

            {/* ── Star field ── */}
            <div className="absolute inset-0 pointer-events-none">
                {STARS.map((s, i) => (
                    <div
                        key={i}
                        className="star-dot"
                        style={{
                            left: s.left, top: s.top,
                            width: `${s.size}px`, height: `${s.size}px`,
                            '--dur': s.dur, '--delay': s.delay,
                            '--so': s.so, '--sp': s.sp,
                            opacity: s.so,
                        } as React.CSSProperties}
                    />
                ))}
            </div>

            {/* ── Floating gold motes ── */}
            <div className="absolute inset-0 pointer-events-none">
                {MOTES.map((m, i) => (
                    <div
                        key={i}
                        className="gold-mote"
                        style={{
                            left: m.left, top: m.top,
                            width: `${m.size}px`, height: `${m.size}px`,
                            '--dur': m.dur, '--delay': m.delay,
                            '--mx': m.mx, '--my': m.my, '--mo': m.mo,
                        } as React.CSSProperties}
                    />
                ))}
            </div>

            {/* ── Gold shimmer at top ── */}
            <div className="absolute top-0 left-0 right-0 h-[2px] gold-shimmer" />

            {/* ── Content ── */}
            <div className="relative px-5 pt-8 pb-7 text-center">
                {/* Eyebrow */}
                <p className="text-[9px] font-black tracking-[0.45em] uppercase mb-3"
                   style={{ color: '#FFA500', letterSpacing: '0.4em', textShadow: '0 0 20px rgba(255,165,0,0.6)' }}>
                    {t('villas:hero.tagline', '✦ EXCLUSIVE COLLECTION ✦')}
                </p>

                {/* Animated title */}
                <h2 className="font-black leading-none mb-2" style={{ fontSize: 'clamp(26px,5vw,38px)' }}>
                    <span className="hero-word text-white" style={{ '--wd': '80ms' } as React.CSSProperties}>{t('villas:hero.title1', 'Luxury')}&nbsp;</span>
                    <span className="hero-word" style={{ '--wd': '220ms', color: '#FFC740', textShadow: '0 0 30px rgba(255,180,0,0.45)' } as React.CSSProperties}>{t('villas:hero.title2', 'Villas')}</span>
                </h2>

                <p className="text-white/35 text-[11px] tracking-wide mb-1">
                    {t('villas:hero.privateEstates', 'Private estates · Extraordinary settings · The Balkans')}
                </p>

                {/* Live count */}
                {count > 0 && (
                    <p className="text-[11px] font-semibold mb-5" style={{ color: 'rgba(255,185,0,0.8)' }}>
                        <span className="font-black text-[13px]" style={{ color: '#FFA500' }}>{displayCount}</span>
                        {' '}{count === 1 ? t('villas:hero.villaAvailable', 'villa available') : t('villas:hero.villasAvailable', 'villas available')}
                        {minPrice != null ? (
                            <span className="text-white/40"> · {t('villas:hero.from', 'from')} <span style={{ color: 'rgba(255,185,0,0.75)' }}>€{minPrice.toLocaleString()}</span>/night</span>
                        ) : null}
                    </p>
                )}
                {count === 0 && <div className="mb-5" />}

                {/* ── Destination pills with landscape SVG reveal ── */}
                <div className="flex flex-wrap justify-center gap-2">
                    {DESTINATIONS.map(dest => {
                        const isActive = activeQuery === dest.query;
                        return (
                            <button
                                key={dest.query}
                                onClick={() => onDestinationClick(dest)}
                                className={`villa-dest-pill flex flex-col items-center px-3 pt-[6px] pb-[5px] rounded-xl text-[11px] font-semibold border focus:outline-none ${isActive ? 'active' : ''}`}
                                style={isActive ? {
                                    background: 'rgba(255,165,0,0.20)',
                                    borderColor: 'rgba(255,165,0,0.7)',
                                    color: '#FFC740',
                                    boxShadow: '0 0 16px rgba(255,165,0,0.2)',
                                } : {
                                    background: 'rgba(255,255,255,0.05)',
                                    borderColor: 'rgba(255,255,255,0.12)',
                                    color: 'rgba(255,255,255,0.62)',
                                }}
                            >
                                <span>{t(`villas:${dest.labelKey}`, dest.fallback)}</span>
                                {/* Landscape silhouette — slides down on hover/active */}
                                <div className="villa-dest-landscape w-full mt-1">
                                    <svg viewBox="0 0 60 20" width="60" height="16" style={{ display: 'block', margin: '0 auto' }}>
                                        <defs>
                                            <linearGradient id={`lg_${dest.query}`} x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor={isActive ? '#FFA500' : 'rgba(255,255,255,0.5)'} />
                                                <stop offset="100%" stopColor={isActive ? 'rgba(255,165,0,0.2)' : 'rgba(255,255,255,0.1)'} />
                                            </linearGradient>
                                        </defs>
                                        <path d={dest.landscape} fill={`url(#lg_${dest.query})`} />
                                    </svg>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Gold shimmer at bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-[1px] gold-shimmer" />
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
        flyTo,
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
        if (filters.baths != null) count++;
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

                        {/* Tier 1: Blue brand bar — 56px, animated gold bottom border */}
                        <div
                            className="relative flex items-center justify-between px-4 overflow-hidden"
                            style={{ height: '56px', background: 'linear-gradient(135deg, #0252CD 0%, #0640a8 100%)' }}
                        >
                            {/* Subtle shimmer overlay */}
                            <div className="absolute inset-0 opacity-10 gold-shimmer pointer-events-none" />
                            {/* Gold animated border at bottom */}
                            <div className="absolute bottom-0 left-0 right-0 h-[2px] gold-shimmer" />
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
                        <div className="p-3 pt-0 bg-gray-50">
                            {(isLoading || isSearchFiltering) ? (
                                /* Cinematic loading state */
                                <>
                                    <VillaAnimationStyles />
                                    <div className="relative overflow-hidden -mx-3 -mt-2 mb-4"
                                        style={{ background: 'linear-gradient(135deg, #050d1f 0%, #0a1a3a 50%, #080f1f 100%)' }}
                                    >
                                        <div className="absolute inset-0 pointer-events-none overflow-hidden">
                                            {STARS.slice(0, 18).map((s, i) => (
                                                <div key={i} className="star-dot"
                                                    style={{ left: s.left, top: s.top, width: `${s.size}px`, height: `${s.size}px`, '--dur': s.dur, '--delay': s.delay, '--so': s.so, '--sp': s.sp, opacity: s.so } as React.CSSProperties}
                                                />
                                            ))}
                                        </div>
                                        <div className="absolute top-0 left-0 right-0 h-[2px] gold-shimmer" />
                                        <div className="relative px-5 py-10 text-center">
                                            <p className="text-[10px] font-bold tracking-[0.3em] mb-3" style={{ color: '#FFA500' }}>
                                                {t('villas:hero.tagline', '✦ EXCLUSIVE COLLECTION ✦')}
                                            </p>
                                            <div className="relative mx-auto w-12 h-12 mb-3">
                                                <div className="absolute inset-0 rounded-full border-2 border-white/10" />
                                                <div className="absolute inset-0 rounded-full border-2 border-t-[#FFA500] border-r-[#0252CD] animate-spin" />
                                                <span className="absolute inset-0 flex items-center justify-center text-xl">✦</span>
                                            </div>
                                            <p className="text-white/60 text-xs font-medium">
                                                {t('villas:discoveringVillas', 'Curating your exclusive collection...')}
                                            </p>
                                        </div>
                                        <div className="absolute bottom-0 inset-x-0 h-6"
                                            style={{ background: 'linear-gradient(to bottom, transparent, #F8F9FC)' }}
                                        />
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
                                /* Cinematic empty state */
                                <>
                                    <LuxuryHero
                                        count={0}
                                        minPrice={null}
                                        activeQuery={filters.query ?? ''}
                                        onDestinationClick={(dest) => {
                                            handleFilterChange('query', dest.query);
                                            handleSearch();
                                            flyTo(dest.center, dest.zoom);
                                        }}
                                    />
                                    <TrustStrip />
                                    <div className="flex justify-center py-8 px-3">
                                        <div className="bg-white rounded-2xl shadow-sm p-8 text-center max-w-md w-full border border-[#FFA500]/10">
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
                                        count={listProperties.length}
                                        minPrice={minResultPrice}
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
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                                        {listProperties.slice(0, visibleCount).map((property, index) => (
                                            <AnimatedVillaCard
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
