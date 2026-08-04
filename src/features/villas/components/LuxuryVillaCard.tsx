import React, { useState, useCallback, useMemo, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Property } from '@/types';
import { useAppContext } from '@/context/AppContext';
import { generatePropertySlug } from '@/utils/slug';
import { buildLocalizedPath } from '@/src/utils/languageRouting';
import { formatPrice } from '@/utils/currency';
import PropertyImage from '@/src/components/ui/PropertyImage';
import { shouldOpenInNewTab } from '@/shared/utils/pwa';
import VillaBookingModal from './VillaBookingModal';

interface LuxuryVillaCardProps {
    property: Property;
    priority?: boolean;
}

/**
 * Luxury villa card — matches the app's standard white PropertyCard language
 * (image on top, clean content below, soft shadow) with a refined gold
 * hairline ring for the premium cue, plus the villa-specific booking CTA.
 */
const LuxuryVillaCard: React.FC<LuxuryVillaCardProps> = memo(({ property, priority }) => {
    const { t } = useTranslation(['villas', 'property', 'rental', 'common']);
    const { state, dispatch, toggleSavedHome } = useAppContext();
    const [imgIndex, setImgIndex] = useState(0);
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [bookingOpen, setBookingOpen] = useState(false);

    const isFavorited = state.savedHomes.some(p => p.id === property.id);
    const isSold = property.status === 'sold';
    const isRented = property.status === 'rented';
    const isForRent = property.listingType !== 'sale';

    const allImages = useMemo(() => {
        const base = property.imageUrl ? [property.imageUrl] : [];
        const extras = (property.images || []).map(img => img.url).filter(Boolean);
        return [...base, ...extras.filter(u => !base.includes(u))].slice(0, 8);
    }, [property.imageUrl, property.images]);

    const openBooking = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setBookingOpen(true);
    }, []);

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
        if (Math.abs(diff) > 40 && allImages.length > 1) {
            setImgIndex(i => diff > 0
                ? (i + 1) % allImages.length
                : (i - 1 + allImages.length) % allImages.length
            );
        }
        setTouchStart(null);
    }, [touchStart, allImages.length]);

    const ctaLabel = isForRent
        ? t('villas:booking.requestToBook', 'Request to Book')
        : t('villas:booking.enquire', 'Request Details');

    return (
        <div
            className="group relative w-full bg-white rounded-2xl overflow-hidden flex flex-col cursor-pointer select-none border border-[#E8B820]/25 ring-1 ring-[#E8B820]/30 shadow-sm transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(184,134,11,0.18)]"
            onClick={handleClick}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            role="article"
            tabIndex={0}
            aria-label={`${property.title || 'Luxury Villa'} — ${property.city}, ${property.country}`}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(); } }}
        >
            {/* ── Image ── */}
            <div className="relative w-full aspect-[4/3] overflow-hidden bg-neutral-100">
                <div className="absolute inset-0 transition-transform duration-500 ease-out group-hover:scale-[1.04]">
                    <PropertyImage
                        src={allImages[imgIndex] ?? property.imageUrl}
                        alt={property.title || 'Luxury Villa'}
                        priority={priority}
                        widths={[400, 640, 800]}
                        sizes="(max-width: 640px) 100vw, 50vw"
                        imgClassName={`object-cover w-full h-full ${isSold || isRented ? 'grayscale opacity-80' : ''}`}
                    />
                </div>

                {/* Soft top scrim so the badges stay legible */}
                <div className="absolute inset-x-0 top-0 h-16 pointer-events-none bg-gradient-to-b from-black/25 to-transparent" />

                {/* Badges: luxury + market (left), favourite (right) */}
                <div className="absolute top-3 left-3 right-3 flex items-start justify-between z-10">
                    <div className="flex flex-col gap-1.5 items-start">
                        <span className="inline-flex items-center gap-1 px-2.5 py-[5px] rounded-full text-[10px] font-bold tracking-wide text-[#3D1F00] shadow-sm"
                              style={{ background: 'linear-gradient(135deg,#FFE9A3,#E8B820)' }}>
                            <span style={{ fontSize: '7px' }}>✦</span> {t('property:luxuryVilla', 'LUXURY VILLA')}
                        </span>
                        <span className="inline-flex items-center px-2 py-[3px] rounded-full text-[10px] font-semibold text-white bg-black/45 backdrop-blur-sm">
                            {isForRent ? t('villas:filters.forRent', 'For Rent') : t('villas:filters.forSale', 'For Sale')}
                        </span>
                        {isSold && (
                            <span className="inline-flex items-center gap-1 px-2 py-[3px] rounded-full text-[10px] font-bold bg-red-500/90 backdrop-blur-sm text-white">
                                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse inline-block" /> {t('property:sold', 'SOLD')}
                            </span>
                        )}
                        {isRented && (
                            <span className="inline-flex items-center gap-1 px-2 py-[3px] rounded-full text-[10px] font-bold bg-orange-500/90 backdrop-blur-sm text-white">
                                {t('property:rented', 'RENTED')}
                            </span>
                        )}
                    </div>
                    <button
                        onClick={handleFav}
                        aria-label={isFavorited ? t('common:aria.removeFavourite', 'Remove from favourites') : t('common:aria.saveFavourite', 'Save to favourites')}
                        aria-pressed={isFavorited}
                        className={`w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200 shadow-sm focus:outline-none active:scale-90 ${
                            isFavorited ? 'bg-red-500 text-white' : 'bg-white/85 backdrop-blur-sm text-neutral-700 hover:bg-white'
                        }`}
                    >
                        <svg className="h-4 w-4" fill={isFavorited ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isFavorited ? 0 : 1.7}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                    </button>
                </div>

                {/* Image dots */}
                {allImages.length > 1 && (
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
                        {allImages.slice(0, Math.min(allImages.length, 6)).map((_, i) => (
                            <button
                                key={i}
                                onClick={(e) => { e.stopPropagation(); setImgIndex(i); }}
                                className={`transition-all duration-200 rounded-full ${i === imgIndex ? 'w-4 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/50 hover:bg-white/80'}`}
                                aria-label={`Image ${i + 1}`}
                            />
                        ))}
                    </div>
                )}

                {/* Arrow nav (hover) */}
                {allImages.length > 1 && (
                    <>
                        <button onClick={prevImg}
                            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-7 h-7 bg-white/85 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-white focus:outline-none shadow-sm"
                            aria-label={t('common:aria.previousImage', 'Previous image')}>
                            <svg className="w-3.5 h-3.5 text-neutral-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <button onClick={nextImg}
                            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-7 h-7 bg-white/85 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-white focus:outline-none shadow-sm"
                            aria-label={t('common:aria.nextImage', 'Next image')}>
                            <svg className="w-3.5 h-3.5 text-neutral-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </>
                )}
            </div>

            {/* ── Content ── */}
            <div className="flex flex-col flex-1 p-3.5">
                <h3 className="text-[15px] font-semibold text-neutral-900 tracking-[-0.01em] line-clamp-1">
                    {property.title || `${property.beds > 0 ? property.beds + '-Bed ' : ''}Luxury Villa`}
                </h3>
                <p className="flex items-center gap-1 text-[12px] text-neutral-400 mt-0.5">
                    <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="truncate">{property.city}{property.country ? `, ${property.country}` : ''}</span>
                </p>

                {/* Stats */}
                <div className="flex items-center gap-3.5 text-[12px] text-neutral-500 mt-2">
                    {property.beds > 0 && <span className="flex items-center gap-1"><span className="text-[13px]">🛏</span>{property.beds}</span>}
                    {property.baths > 0 && <span className="flex items-center gap-1"><span className="text-[13px]">🛁</span>{property.baths}</span>}
                    {property.sqft > 0 && <span className="flex items-center gap-1"><span className="text-[11px]">📐</span>{property.sqft} m²</span>}
                </div>

                <div className="mt-3 pt-3 border-t border-black/[0.06] flex items-end justify-between gap-3">
                    <div className="min-w-0">
                        {property.isNegotiable ? (
                            <span className="text-[15px] font-semibold text-neutral-900">{t('villas:booking.byNegotiation', 'By negotiation')}</span>
                        ) : (
                            <p className="text-[18px] font-bold text-neutral-900 leading-none tracking-[-0.02em]">
                                {formatPrice(property.price, property.country)}
                                {isForRent && <span className="text-[12px] font-normal text-neutral-400"> {t('villas:booking.perNight', '/ night')}</span>}
                            </p>
                        )}
                    </div>
                    {!isSold && (
                        <button
                            type="button"
                            onClick={openBooking}
                            className="flex-shrink-0 px-3.5 py-2 rounded-xl text-[13px] font-semibold text-white transition-transform active:scale-95"
                            style={{ background: '#1d1d1f', boxShadow: '0 1px 2px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.12)' }}
                            aria-label={ctaLabel}
                        >
                            {ctaLabel}
                        </button>
                    )}
                </div>
            </div>

            {bookingOpen && (
                <VillaBookingModal
                    property={property}
                    isOpen={bookingOpen}
                    onClose={() => setBookingOpen(false)}
                    defaultName={state.currentUser?.name ?? ''}
                    defaultEmail={state.currentUser?.email ?? ''}
                    defaultPhone={state.currentUser?.phone ?? ''}
                />
            )}
        </div>
    );
});

LuxuryVillaCard.displayName = 'LuxuryVillaCard';
export default LuxuryVillaCard;
