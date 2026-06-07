import React, { useState, useCallback, useMemo, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Property } from '@/types';
import { useAppContext } from '@/context/AppContext';
import { generatePropertySlug } from '@/utils/slug';
import { buildLocalizedPath } from '@/src/utils/languageRouting';
import { formatPrice } from '@/utils/currency';
import PropertyImage from '@/src/components/ui/PropertyImage';
import { shouldOpenInNewTab } from '@/shared/utils/pwa';

const VIEW_TYPE: Record<string, { emoji: string; label: string }> = {
    sea:      { emoji: '🌊', label: 'Sea View'    },
    mountain: { emoji: '⛰️', label: 'Mountain'    },
    park:     { emoji: '🌲', label: 'Lake / Forest' },
    city:     { emoji: '🏙️', label: 'City View'   },
    garden:   { emoji: '🌷', label: 'Garden View'  },
    street:   { emoji: '🏘️', label: 'Street View'  },
};

const CANCEL_LABEL: Record<string, string> = {
    flexible:       'Flexible',
    moderate:       'Moderate',
    strict:         'Strict',
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

    // Amenity chips (max 4 on card)
    const amenities: string[] = (property.amenities as string[]) || [];
    const chips = [
        property.hasPool                                          && { emoji: '🏊', label: 'Pool' },
        property.hasGarden                                        && { emoji: '🌿', label: 'Garden' },
        amenities.some(a => a.toLowerCase().includes('sauna'))    && { emoji: '🧖', label: 'Sauna' },
        amenities.some(a => a.toLowerCase().includes('wine'))     && { emoji: '🍷', label: 'Wine Cellar' },
        amenities.some(a => a.toLowerCase().includes('panoramic'))&& { emoji: '🏔️', label: 'Panoramic' },
        property.breakfastIncluded                                && { emoji: '🍳', label: 'Breakfast' },
        property.towelsIncluded                                   && { emoji: '🛁', label: 'Towels' },
        property.parkingIncluded                                  && { emoji: '🚗', label: 'Parking' },
    ].filter(Boolean).slice(0, 4) as { emoji: string; label: string }[];

    const viewType = property.viewType ? VIEW_TYPE[property.viewType] : null;
    const isSold = property.status === 'sold';
    const isRented = property.status === 'rented';

    return (
        <div
            className="luxury-villa-card group relative w-full rounded-2xl overflow-hidden cursor-pointer select-none"
            onClick={handleClick}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            role="article"
            tabIndex={0}
            aria-label={`${property.title || 'Luxury Villa'} — ${property.city}, ${property.country}`}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(); } }}
        >
            {/* ── Image hero ── */}
            <div className="relative w-full aspect-[3/2] overflow-hidden bg-neutral-900">
                {/* Zooming image */}
                <div className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-[1.06]">
                    <PropertyImage
                        src={allImages[imgIndex] ?? property.imageUrl}
                        alt={property.title || 'Luxury Villa'}
                        priority={priority}
                        widths={[400, 640, 800]}
                        sizes="(max-width: 640px) 100vw, 50vw"
                        imgClassName={`object-cover w-full h-full ${isSold || isRented ? 'grayscale' : ''}`}
                    />
                </div>

                {/* Multi-layer gradient overlay for depth */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/10 pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent pointer-events-none" />

                {/* ── Top badges row ── */}
                <div className="absolute top-3 left-3 right-3 flex items-start justify-between z-20">
                    {/* Left: luxury badge + status */}
                    <div className="flex flex-col gap-1.5">
                        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold text-white shadow-lg"
                            style={{ background: 'linear-gradient(135deg, #FFA500, #E8850A)' }}
                        >
                            <span className="text-[8px]">✦</span> LUXURY VILLA
                        </div>
                        {isSold && (
                            <div className="inline-flex items-center gap-1 px-2 py-[3px] rounded-full text-[10px] font-bold bg-red-500/80 backdrop-blur-sm text-white">
                                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> SOLD
                            </div>
                        )}
                        {isRented && (
                            <div className="inline-flex items-center gap-1 px-2 py-[3px] rounded-full text-[10px] font-bold bg-orange-500/80 backdrop-blur-sm text-white">
                                <span className="w-1.5 h-1.5 bg-white rounded-full" /> RENTED
                            </div>
                        )}
                    </div>
                    {/* Right: view type + favorite */}
                    <div className="flex items-center gap-1.5">
                        {viewType && (
                            <span className="px-2 py-1 rounded-full text-[10px] font-semibold text-white bg-black/40 backdrop-blur-sm">
                                {viewType.emoji} {viewType.label}
                            </span>
                        )}
                        <button
                            onClick={handleFav}
                            aria-label={isFavorited ? 'Remove from favourites' : 'Save to favourites'}
                            aria-pressed={isFavorited}
                            className={`w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200 shadow focus:outline-none active:scale-90 ${
                                isFavorited ? 'bg-red-500 text-white' : 'bg-black/30 backdrop-blur-sm text-white border border-white/25'
                            }`}
                        >
                            <svg className={`h-4 w-4 ${isFavorited ? 'fill-current' : ''}`} fill={isFavorited ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isFavorited ? 0 : 1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* ── Image dot indicators ── */}
                {allImages.length > 1 && (
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 flex gap-1 z-20 pointer-events-none">
                        {allImages.slice(0, Math.min(allImages.length, 5)).map((_, i) => (
                            <button
                                key={i}
                                onClick={(e) => { e.stopPropagation(); setImgIndex(i); }}
                                className={`pointer-events-auto transition-all duration-200 rounded-full ${
                                    i === imgIndex ? 'w-4 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/50 hover:bg-white/80'
                                }`}
                                aria-label={`Image ${i + 1}`}
                            />
                        ))}
                        {allImages.length > 5 && (
                            <span className="pointer-events-none text-white/60 text-[10px] leading-1.5">+{allImages.length - 5}</span>
                        )}
                    </div>
                )}

                {/* ── Nav arrows ── */}
                {allImages.length > 1 && (
                    <>
                        <button
                            onClick={prevImg}
                            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 focus:outline-none"
                            aria-label="Previous image"
                        >
                            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <button
                            onClick={nextImg}
                            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 focus:outline-none"
                            aria-label="Next image"
                        >
                            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </>
                )}

                {/* ── Amenity chips — slide up on hover ── */}
                {chips.length > 0 && (
                    <div className="absolute z-20 flex flex-wrap gap-1 px-3"
                        style={{ bottom: '80px', opacity: 0, transform: 'translateY(8px)', transition: 'opacity 0.35s ease, transform 0.35s ease' }}
                        ref={(el) => {
                            if (!el) return;
                            el.style.setProperty('--chip-opacity', '0');
                            el.style.setProperty('--chip-translate', '8px');
                        }}
                    >
                        {chips.map(chip => (
                            <span key={chip.label}
                                className="luxury-chip bg-black/50 backdrop-blur-sm text-white text-[10px] font-semibold px-2 py-[3px] rounded-full border border-white/15"
                            >
                                {chip.emoji} {chip.label}
                            </span>
                        ))}
                    </div>
                )}

                {/* ── Bottom content overlay ── */}
                <div className="absolute bottom-0 left-0 right-0 px-3.5 pb-3.5 pt-6 z-20">
                    <div className="flex items-end justify-between gap-3">
                        {/* Left: title + location + stats */}
                        <div className="min-w-0 flex-1">
                            <h3 className="text-white font-bold text-sm sm:text-base leading-tight mb-0.5 drop-shadow line-clamp-1">
                                {property.title || `${property.beds > 0 ? property.beds + '-Bed ' : ''}Luxury Villa`}
                            </h3>
                            <p className="text-white/65 text-xs flex items-center gap-1 mb-1.5">
                                <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                {property.city}, {property.country}
                            </p>
                            <div className="flex items-center gap-2.5 text-white/50 text-[11px]">
                                {property.beds > 0 && <span>🛏️ {property.beds} {property.beds === 1 ? 'bed' : 'beds'}</span>}
                                {property.baths > 0 && <span>🛁 {property.baths} {property.baths === 1 ? 'bath' : 'baths'}</span>}
                                {property.sqft > 0 && <span>📐 {property.sqft} m²</span>}
                            </div>
                        </div>
                        {/* Right: price */}
                        <div className="text-right flex-shrink-0">
                            {property.isNegotiable ? (
                                <span className="text-xs font-bold px-2 py-1 rounded-lg"
                                    style={{ color: '#FFA500', background: 'rgba(255,165,0,0.15)' }}
                                >
                                    By Negotiation
                                </span>
                            ) : (
                                <>
                                    <div className="text-white font-extrabold text-lg leading-none"
                                        style={{ textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}
                                    >
                                        {formatPrice(property.price, property.country)}
                                    </div>
                                    <div className="text-[11px] font-bold mt-0.5" style={{ color: '#FFA500' }}>
                                        / night
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Check-in/out + cleaning fee + cancellation micro-strip */}
                    {(property.checkInTime || (property.cleaningFee ?? 0) > 0 || property.cancellationPolicy) && (
                        <div className="mt-2 flex items-center flex-wrap gap-x-2 gap-y-0.5 text-white/40 text-[10px]">
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

                {/* ── "View Villa →" ghost CTA ── fades + scales in on hover */}
                <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="px-5 py-2 rounded-full text-sm font-bold text-white border border-white/40 bg-white/10 backdrop-blur-sm shadow-lg transform scale-95 group-hover:scale-100 transition-transform duration-300">
                        View Villa →
                    </div>
                </div>
            </div>
        </div>
    );
});

LuxuryVillaCard.displayName = 'LuxuryVillaCard';
export default LuxuryVillaCard;
