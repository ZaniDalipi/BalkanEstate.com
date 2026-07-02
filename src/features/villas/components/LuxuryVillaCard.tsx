import React, { useState, useCallback, useMemo, memo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Property } from '@/types';
import { useAppContext } from '@/context/AppContext';
import { generatePropertySlug } from '@/utils/slug';
import { buildLocalizedPath } from '@/src/utils/languageRouting';
import { formatPrice } from '@/utils/currency';
import PropertyImage from '@/src/components/ui/PropertyImage';
import { shouldOpenInNewTab } from '@/shared/utils/pwa';

const VIEW_TYPE: Record<string, { emoji: string; label: string }> = {
    sea:      { emoji: '🌊', label: 'Sea View'     },
    mountain: { emoji: '⛰️',  label: 'Mountain'     },
    park:     { emoji: '🌲', label: 'Lake / Forest' },
    city:     { emoji: '🏙️', label: 'City View'    },
    garden:   { emoji: '🌷', label: 'Garden View'   },
    street:   { emoji: '🏘️', label: 'Street View'   },
};

const CANCEL_LABEL: Record<string, string> = {
    flexible:         'Flexible cancellation',
    moderate:         'Moderate policy',
    strict:           'Strict policy',
    'non-refundable': 'Non-refundable',
};

interface LuxuryVillaCardProps {
    property: Property;
    priority?: boolean;
}

const LuxuryVillaCard: React.FC<LuxuryVillaCardProps> = memo(({ property, priority }) => {
    const { t } = useTranslation(['property', 'rental', 'common']);
    const { state, dispatch, toggleSavedHome } = useAppContext();
    const [imgIndex, setImgIndex] = useState(0);
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const cardRef = useRef<HTMLDivElement>(null);

    const isFavorited = state.savedHomes.some(p => p.id === property.id);

    const allImages = useMemo(() => {
        const base = property.imageUrl ? [property.imageUrl] : [];
        const extras = (property.images || []).map(img => img.url).filter(Boolean);
        return [...base, ...extras.filter(u => !base.includes(u))].slice(0, 8);
    }, [property.imageUrl, property.images]);

    const handleClick = useCallback(() => {
        const url = buildLocalizedPath(`/property/${generatePropertySlug(property)}`);
        if (shouldOpenInNewTab()) {
            window.open(url, '_blank', 'noopener,noreferrer');
        } else {
            dispatch({ type: 'SET_SELECTED_PROPERTY_OBJECT', payload: property });
            window.history.pushState({}, '', url);
        }
    }, [dispatch, property]);

    const handleFav = useCallback(async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!state.isAuthenticated) {
            dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true } });
        } else {
            await toggleSavedHome(property);
        }
    }, [state.isAuthenticated, dispatch, toggleSavedHome, property]);

    const prevImg = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setImgIndex(i => (i - 1 + allImages.length) % allImages.length);
    }, [allImages.length]);

    const nextImg = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setImgIndex(i => (i + 1) % allImages.length);
    }, [allImages.length]);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        setTouchStart(e.touches[0].clientX);
    }, []);

    const handleTouchEnd = useCallback((e: React.TouchEvent) => {
        if (touchStart === null) return;
        const diff = touchStart - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 40) {
            setImgIndex(i => diff > 0
                ? (i + 1) % allImages.length
                : (i - 1 + allImages.length) % allImages.length
            );
        }
        setTouchStart(null);
    }, [touchStart, allImages.length]);

    // 3D magnetic tilt — updates CSS custom props directly, zero re-renders
    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const el = cardRef.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;   // 0–1
        const y = (e.clientY - r.top)  / r.height;  // 0–1
        el.style.setProperty('--rx',   `${(y - 0.5) * -16}deg`);
        el.style.setProperty('--ry',   `${(x - 0.5) *  16}deg`);
        el.style.setProperty('--mx',   `${x * 100}%`);
        el.style.setProperty('--my',   `${y * 100}%`);
        el.style.setProperty('--imgX', `${(x - 0.5) * -10}px`);
        el.style.setProperty('--imgY', `${(y - 0.5) * -10}px`);
    }, []);

    const handleMouseLeave = useCallback(() => {
        const el = cardRef.current;
        if (!el) return;
        el.style.setProperty('--rx',   '0deg');
        el.style.setProperty('--ry',   '0deg');
        el.style.setProperty('--mx',   '50%');
        el.style.setProperty('--my',   '50%');
        el.style.setProperty('--imgX', '0px');
        el.style.setProperty('--imgY', '0px');
    }, []);

    // Amenity chips (up to 5 shown on the card)
    const amenities: string[] = (property.amenities as string[]) || [];
    const chips = [
        property.hasPool                                           && { emoji: '🏊', label: 'Pool'       },
        property.hasGarden                                         && { emoji: '🌿', label: 'Garden'     },
        amenities.some(a => a.toLowerCase().includes('sauna'))     && { emoji: '🧖', label: 'Sauna'      },
        amenities.some(a => a.toLowerCase().includes('wine'))      && { emoji: '🍷', label: 'Wine Cellar' },
        amenities.some(a => a.toLowerCase().includes('panoramic')) && { emoji: '🏔️', label: 'Panoramic'  },
        property.breakfastIncluded                                 && { emoji: '🍳', label: 'Breakfast'  },
        property.towelsIncluded                                    && { emoji: '🛁', label: 'Towels'     },
        property.parkingIncluded                                   && { emoji: '🚗', label: 'Parking'    },
    ].filter(Boolean).slice(0, 5) as { emoji: string; label: string }[];

    const viewType  = property.viewType ? VIEW_TYPE[property.viewType] : null;
    const isSold    = property.status === 'sold';
    const isRented  = property.status === 'rented';
    const gradId    = `vbg_${String(property.id || '').slice(-8)}`;

    return (
        <div
            ref={cardRef}
            className="luxury-villa-card villa-tilt-card group relative w-full rounded-2xl overflow-hidden cursor-pointer select-none"
            onClick={handleClick}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            role="article"
            tabIndex={0}
            aria-label={`${property.title || 'Luxury Villa'} — ${property.city}, ${property.country}`}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(); } }}
        >
            {/* ── Gold SVG border traces around the card on hover ── */}
            <svg
                className="absolute inset-0 z-50 pointer-events-none rounded-2xl"
                width="100%" height="100%"
                style={{ overflow: 'visible' }}
            >
                <defs>
                    <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%"   stopColor="#FFF0A0" />
                        <stop offset="30%"  stopColor="#FFA500" />
                        <stop offset="60%"  stopColor="#E8B820" />
                        <stop offset="100%" stopColor="#FFF0A0" />
                    </linearGradient>
                </defs>
                <rect
                    x="0.5%" y="0.5%"
                    width="99%" height="99%"
                    rx="15" ry="15"
                    fill="none"
                    stroke={`url(#${gradId})`}
                    strokeWidth="1.5"
                    pathLength={1}
                    className="villa-border-trace"
                />
            </svg>

            {/* ── Specular highlight follows cursor ── */}
            <div className="villa-specular absolute inset-0 z-40 pointer-events-none rounded-2xl" />

            {/* ── Image hero ── */}
            <div className="relative w-full aspect-[3/2] overflow-hidden bg-neutral-900">

                {/* Parallax image (zoom + shift driven by CSS custom props) */}
                <div className="villa-img-wrap absolute inset-0">
                    <PropertyImage
                        src={allImages[imgIndex] ?? property.imageUrl}
                        alt={property.title || 'Luxury Villa'}
                        priority={priority}
                        widths={[400, 640, 800]}
                        sizes="(max-width: 640px) 100vw, 50vw"
                        imgClassName={`object-cover w-full h-full ${isSold || isRented ? 'grayscale opacity-70' : ''}`}
                    />
                </div>

                {/* Cinematic gradient stack */}
                <div className="absolute inset-0 pointer-events-none"
                     style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.35) 40%, rgba(0,0,0,0.05) 70%, transparent 100%)' }} />
                <div className="absolute inset-0 pointer-events-none"
                     style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, transparent 35%)' }} />

                {/* ── Top row: luxury badge + status + view + fav ── */}
                <div className="absolute top-3 left-3 right-3 flex items-start justify-between z-20">
                    <div className="flex flex-col gap-1.5">
                        {/* Animated gold badge */}
                        <div className="villa-luxury-badge inline-flex items-center gap-1 px-2.5 py-[5px] rounded-full text-[10px] font-black tracking-wider shadow-lg">
                            <span style={{ fontSize: '7px' }}>✦</span> LUXURY VILLA
                        </div>
                        {isSold && (
                            <div className="inline-flex items-center gap-1 px-2 py-[3px] rounded-full text-[10px] font-bold bg-red-500/85 backdrop-blur-sm text-white shadow">
                                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse inline-block" /> SOLD
                            </div>
                        )}
                        {isRented && (
                            <div className="inline-flex items-center gap-1 px-2 py-[3px] rounded-full text-[10px] font-bold bg-orange-500/85 backdrop-blur-sm text-white shadow">
                                <span className="w-1.5 h-1.5 bg-white rounded-full inline-block" /> RENTED
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5">
                        {viewType && (
                            <span className="px-2 py-[5px] rounded-full text-[10px] font-semibold text-white/90 bg-black/35 backdrop-blur-sm border border-white/10">
                                {viewType.emoji} {viewType.label}
                            </span>
                        )}
                        <button
                            onClick={handleFav}
                            aria-label={isFavorited ? 'Remove from favourites' : 'Save to favourites'}
                            aria-pressed={isFavorited}
                            className={`w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200 shadow-lg focus:outline-none active:scale-90 ${
                                isFavorited
                                    ? 'bg-red-500 text-white shadow-red-500/30'
                                    : 'bg-black/30 backdrop-blur-sm text-white border border-white/20 hover:border-white/40'
                            }`}
                        >
                            <svg className="h-4 w-4" fill={isFavorited ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isFavorited ? 0 : 1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Image dots */}
                {allImages.length > 1 && (
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 flex gap-1 z-20">
                        {allImages.slice(0, Math.min(allImages.length, 6)).map((_, i) => (
                            <button
                                key={i}
                                onClick={(e) => { e.stopPropagation(); setImgIndex(i); }}
                                className={`transition-all duration-200 rounded-full ${
                                    i === imgIndex ? 'w-5 h-1.5 bg-white shadow-sm' : 'w-1.5 h-1.5 bg-white/40 hover:bg-white/70'
                                }`}
                                aria-label={`Image ${i + 1}`}
                            />
                        ))}
                    </div>
                )}

                {/* Arrow nav */}
                {allImages.length > 1 && (
                    <>
                        <button onClick={prevImg}
                            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-black/60 focus:outline-none"
                            aria-label="Previous image">
                            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <button onClick={nextImg}
                            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-black/60 focus:outline-none"
                            aria-label="Next image">
                            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </>
                )}

                {/* Amenity chips — slide up from below on hover */}
                {chips.length > 0 && (
                    <div className="absolute z-20 flex flex-wrap gap-1 px-3.5" style={{ bottom: '78px' }}>
                        {chips.map((chip, ci) => (
                            <span key={chip.label}
                                className="luxury-chip bg-black/55 backdrop-blur-sm text-white text-[10px] font-semibold px-2 py-[4px] rounded-full border border-white/12"
                                style={{ transitionDelay: `${ci * 35}ms` }}
                            >
                                {chip.emoji} {chip.label}
                            </span>
                        ))}
                    </div>
                )}

                {/* ── Bottom content overlay ── */}
                <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 pt-8 z-20">
                    <div className="flex items-end justify-between gap-3">
                        {/* Left: title + location + stats */}
                        <div className="min-w-0 flex-1">
                            <h3 className="text-white font-bold text-sm sm:text-[15px] leading-snug mb-0.5 drop-shadow-md line-clamp-1">
                                {property.title || `${property.beds > 0 ? property.beds + '-Bed ' : ''}Luxury Villa`}
                            </h3>
                            <p className="flex items-center gap-1 text-white/60 text-[11px] mb-2">
                                <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                {property.city}{property.country ? `, ${property.country}` : ''}
                            </p>
                            {/* Stat dots */}
                            <div className="flex items-center gap-3 text-white/50 text-[11px]">
                                {property.beds  > 0 && (
                                    <span className="flex items-center gap-1">
                                        <span className="text-[13px]">🛏</span>
                                        <span>{property.beds}</span>
                                    </span>
                                )}
                                {property.baths > 0 && (
                                    <span className="flex items-center gap-1">
                                        <span className="text-[13px]">🛁</span>
                                        <span>{property.baths}</span>
                                    </span>
                                )}
                                {property.sqft  > 0 && (
                                    <span className="flex items-center gap-1">
                                        <span className="text-[11px]">📐</span>
                                        <span>{property.sqft} m²</span>
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Right: price tag */}
                        <div className="flex-shrink-0 text-right">
                            {property.isNegotiable ? (
                                <span className="text-xs font-bold px-2.5 py-1.5 rounded-xl"
                                    style={{ color: '#FFA500', background: 'rgba(255,165,0,0.15)', border: '1px solid rgba(255,165,0,0.25)' }}
                                >
                                    By Negotiation
                                </span>
                            ) : (
                                <div className="villa-price-tag inline-block px-3 py-1.5 rounded-xl">
                                    <div className="text-white font-extrabold text-lg leading-none tracking-tight"
                                         style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
                                        {formatPrice(property.price, property.country)}
                                    </div>
                                    <div className="text-[10px] font-bold text-center mt-0.5" style={{ color: '#FFA500' }}>
                                        / night
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Micro-strip: check-in / cleaning / policy */}
                    {(property.checkInTime || (property.cleaningFee ?? 0) > 0 || property.cancellationPolicy) && (
                        <div className="mt-1.5 flex items-center flex-wrap gap-x-2 text-white/35 text-[10px]">
                            {property.checkInTime && (
                                <span>⏰ {property.checkInTime}{property.checkOutTime ? `–${property.checkOutTime}` : ''}</span>
                            )}
                            {(property.cleaningFee ?? 0) > 0 && (
                                <span>· +€{property.cleaningFee} cleaning</span>
                            )}
                            {property.cancellationPolicy && (
                                <span>· {CANCEL_LABEL[property.cancellationPolicy] ?? property.cancellationPolicy}</span>
                            )}
                        </div>
                    )}
                </div>

                {/* ── "Reserve" CTA — emerges on hover ── */}
                <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
                    <div className="villa-cta-btn px-6 py-2.5 rounded-full text-sm font-bold text-white border border-white/35 backdrop-blur-sm shadow-2xl">
                        Reserve &rarr;
                    </div>
                </div>
            </div>
        </div>
    );
});

LuxuryVillaCard.displayName = 'LuxuryVillaCard';
export default LuxuryVillaCard;
