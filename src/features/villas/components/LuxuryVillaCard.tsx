import React, { useState, useCallback, useMemo, memo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Property } from '@/types';
import { useAppContext } from '@/context/AppContext';
import { generatePropertySlug } from '@/utils/slug';
import { buildLocalizedPath } from '@/src/utils/languageRouting';
import { formatPrice } from '@/utils/currency';
import PropertyImage from '@/src/components/ui/PropertyImage';
import { shouldOpenInNewTab } from '@/shared/utils/pwa';
import VillaBookingModal from './VillaBookingModal';

/** View types and cancellation policies keyed to the same strings VillaFilters
 *  uses, so the card and the filter chips always read identically. */
const VIEW_TYPE: Record<string, { emoji: string; key: string; fallback: string }> = {
    sea:      { emoji: '🌊', key: 'villas:filters.sea',        fallback: 'Sea View'      },
    mountain: { emoji: '⛰️',  key: 'villas:filters.mountain',  fallback: 'Mountain'      },
    park:     { emoji: '🌲', key: 'villas:filters.lakeForest', fallback: 'Lake / Forest' },
    city:     { emoji: '🏙️', key: 'villas:filters.cityView',  fallback: 'City View'     },
    garden:   { emoji: '🌷', key: 'villas:filters.gardenView', fallback: 'Garden View'   },
    street:   { emoji: '🏘️', key: 'villas:filters.streetView', fallback: 'Street View'  },
};

const CANCEL_LABEL: Record<string, { key: string; fallback: string }> = {
    flexible:         { key: 'villas:cancellation.flexible',      fallback: 'Flexible cancellation' },
    moderate:         { key: 'villas:cancellation.moderate',      fallback: 'Moderate policy'       },
    strict:           { key: 'villas:cancellation.strict',        fallback: 'Strict policy'         },
    'non-refundable': { key: 'villas:cancellation.nonRefundable', fallback: 'Non-refundable'        },
};

interface LuxuryVillaCardProps {
    property: Property;
    priority?: boolean;
}

/** Cross-fade length for an image change, shared by the JS and the CSS below. */
const FADE_MS = 420;

/** Hard cap on the card carousel. Kept in step with the dot row: every image
 *  the arrows/swipe can reach must have a dot, or the indicator lies. */
const MAX_IMAGES = 6;

const LuxuryVillaCard: React.FC<LuxuryVillaCardProps> = memo(({ property, priority }) => {
    const { t } = useTranslation(['villas', 'property', 'rental', 'common']);
    const { state, dispatch, toggleSavedHome } = useAppContext();
    const [imgIndex, setImgIndex] = useState(0);
    const [bookingOpen, setBookingOpen] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);
    const touchRef = useRef<{ x: number; y: number } | null>(null);
    // A swipe ends in a synthetic click on most mobile browsers; without this
    // guard flicking through the gallery navigated to the property page.
    const swipedRef = useRef(false);

    // Every image the user has landed on, oldest first. Doubles as the paint
    // order: the incoming image is always stacked directly on top of the one
    // that was on screen a moment ago, so the fade never reveals a third image
    // (or the backdrop) in between.
    const orderRef = useRef<number[]>([0]);
    if (orderRef.current[orderRef.current.length - 1] !== imgIndex) {
        orderRef.current = [...orderRef.current.filter(i => i !== imgIndex), imgIndex];
    }
    const layerZ = (i: number) => orderRef.current.indexOf(i) + 1; // 0 = never visited
    const visited = (i: number) => orderRef.current.includes(i);

    // Recycled cards (pagination, filter changes) must not keep showing image 4
    // of the listing that used to live in this slot.
    const [renderedId, setRenderedId] = useState(property.id);
    if (renderedId !== property.id) {
        setRenderedId(property.id);
        setImgIndex(0);
        orderRef.current = [0];
    }

    // Inner controls stop click bubbling; without the same guard on keydown a
    // keyboard Enter on the heart/arrows also triggered the card's navigation.
    const stopKeys = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') e.stopPropagation();
    }, []);

    const openBooking = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setBookingOpen(true);
    }, []);

    const isFavorited = state.savedHomes.some(p => p.id === property.id);

    const allImages = useMemo(() => {
        const base = property.imageUrl ? [property.imageUrl] : [];
        const extras = (property.images || []).map(img => img.url).filter(Boolean);
        return [...base, ...extras.filter(u => !base.includes(u))].slice(0, MAX_IMAGES);
    }, [property.imageUrl, property.images]);

    // Always at least one layer so the card renders PropertyImage's placeholder
    // state rather than an empty black box when a listing has no photo.
    const layers: (string | undefined)[] = allImages.length ? allImages : [property.imageUrl];

    const handleClick = useCallback(() => {
        if (swipedRef.current) return;
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

    // Every index computation below is guarded on a non-empty gallery: with no
    // images `% 0` yields NaN, and an opacity keyed off NaN renders nothing.
    const step = useCallback((dir: 1 | -1) => {
        if (allImages.length < 2) return;
        setImgIndex(i => (i + dir + allImages.length) % allImages.length);
    }, [allImages.length]);

    const prevImg = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        step(-1);
    }, [step]);

    const nextImg = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        step(1);
    }, [step]);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        const t = e.touches[0];
        touchRef.current = { x: t.clientX, y: t.clientY };
        // Cleared here rather than only in handleClick: browsers that suppress
        // the synthetic click after a swipe would otherwise leave the flag set
        // and eat the *next* genuine tap on the card.
        swipedRef.current = false;
    }, []);

    const handleTouchEnd = useCallback((e: React.TouchEvent) => {
        const start = touchRef.current;
        touchRef.current = null;
        if (!start || allImages.length < 2) return;
        const t = e.changedTouches[0];
        const dx = start.x - t.clientX;
        const dy = start.y - t.clientY;
        // A mostly-vertical drag is the page scrolling past the card, not a
        // swipe — it used to flip the image on every scroll that grazed a card.
        if (Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
        swipedRef.current = true;
        step(dx > 0 ? 1 : -1);
    }, [allImages.length, step]);

    const handleTouchCancel = useCallback(() => { touchRef.current = null; }, []);

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
    const amenities: unknown[] = (property.amenities as unknown[]) || [];
    // Amenity entries are user-supplied and occasionally null/numeric, so
    // coerce before matching rather than calling toLowerCase on them.
    const hasAmenity = (needle: string) =>
        amenities.some(a => typeof a === 'string' && a.toLowerCase().includes(needle));
    const chips = [
        property.hasPool           && { emoji: '🏊', label: t('villas:filters.pool', 'Pool') },
        property.hasGarden         && { emoji: '🌿', label: t('villas:filters.garden', 'Garden') },
        hasAmenity('sauna')        && { emoji: '🧖', label: t('villas:filters.sauna', 'Sauna') },
        hasAmenity('wine')         && { emoji: '🍷', label: t('villas:filters.wineCellar', 'Wine Cellar') },
        hasAmenity('panoramic')    && { emoji: '🏔️', label: t('villas:filters.panoramic', 'Panoramic') },
        property.breakfastIncluded && { emoji: '🍳', label: t('villas:amenities.breakfast', 'Breakfast') },
        property.towelsIncluded    && { emoji: '🛁', label: t('villas:amenities.towels', 'Towels') },
        property.parkingIncluded   && { emoji: '🚗', label: t('villas:amenities.parking', 'Parking') },
    ].filter(Boolean).slice(0, 5) as { emoji: string; label: string }[];

    const viewType  = property.viewType ? VIEW_TYPE[property.viewType] : null;
    const isSold    = property.status === 'sold';
    const isRented  = property.status === 'rented';
    const isForRent = property.listingType !== 'sale';
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
            onTouchCancel={handleTouchCancel}
            role="link"
            tabIndex={0}
            aria-label={`${property.title || t('villas:card.defaultTitle', 'Luxury Villa')} — ${property.city}, ${property.country}`}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(); } }}
        >
            {/* ── Gold SVG border traces around the card on hover ──
                Inset by a pixel and drawn with a percentage-free rect: the old
                0.5%/99% box scaled with the card's width, so on a phone the
                trace sat several pixels off the actual rounded edge. */}
            <svg
                className="absolute inset-[1px] z-50 pointer-events-none"
                style={{ width: 'calc(100% - 2px)', height: 'calc(100% - 2px)' }}
                aria-hidden="true"
            >
                <defs>
                    <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%"   stopColor="#FFF0A0" />
                        <stop offset="30%"  stopColor="var(--color-villa-gold-bright)" />
                        <stop offset="60%"  stopColor="var(--color-villa-gold)" />
                        <stop offset="100%" stopColor="#FFF0A0" />
                    </linearGradient>
                </defs>
                <rect
                    x="0" y="0"
                    width="100%" height="100%"
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

            {/* ── Image hero ──
                villa-img-clip re-clips the media with clip-path: the card's
                own overflow-hidden is not honoured by WebKit for transformed
                descendants, so the parallax layer (and PropertyImage's
                scale-150 blur backdrop) used to spill outside the card. */}
            <div className="villa-img-clip relative w-full aspect-[3/2] overflow-hidden bg-neutral-900">

                {/* Parallax wrapper (hover zoom/shift). Images are stacked; the
                    incoming one fades in ON TOP of the outgoing one, which is
                    only dropped once that fade has finished. A symmetric
                    cross-fade left both layers half-transparent mid-way and
                    the dark backdrop showed through as a flicker. */}
                <div className="villa-img-wrap absolute inset-0">
                    {layers.map((src, i) => {
                        const active = i === imgIndex;
                        // Mount the current image, everything already visited, and
                        // the immediate neighbours, so arrows/swipes fade into an
                        // image that is already decoded. The wrapper itself always
                        // renders: the fade needs an element that was painted at
                        // opacity 0 to animate from, otherwise a jump straight to a
                        // far-away dot would pop instead of fade.
                        const neighbour = Math.abs(i - imgIndex) <= 1
                            || (imgIndex === 0 && i === layers.length - 1)
                            || (imgIndex === layers.length - 1 && i === 0);
                        const mounted = active || visited(i) || neighbour;
                        return (
                            <div
                                key={`${src ?? 'placeholder'}-${i}`}
                                className="villa-img-layer absolute inset-0"
                                style={{
                                    opacity: active ? 1 : 0,
                                    zIndex: layerZ(i),
                                    // Outgoing layers hold full opacity for the length
                                    // of the fade and then cut out underneath the
                                    // image that has just covered them.
                                    transition: active
                                        ? `opacity ${FADE_MS}ms ease-out`
                                        : `opacity 0s linear ${FADE_MS}ms`,
                                }}
                                aria-hidden={!active}
                            >
                                {mounted && (
                                    <PropertyImage
                                        src={src ?? property.imageUrl}
                                        alt={property.title || t('villas:card.defaultTitle', 'Luxury Villa')}
                                        priority={priority && i === 0}
                                        widths={[400, 640, 800]}
                                        sizes="(max-width: 640px) 100vw, 50vw"
                                        imgClassName={`object-cover w-full h-full ${isSold || isRented ? 'grayscale opacity-70' : ''}`}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Cinematic gradient stack */}
                <div className="absolute inset-0 pointer-events-none"
                     style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.35) 40%, rgba(0,0,0,0.05) 70%, transparent 100%)' }} />
                <div className="absolute inset-0 pointer-events-none"
                     style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, transparent 35%)' }} />

                {/* ── Top row: luxury badge + status + view + fav ── */}
                <div className="absolute top-3 left-3 right-3 flex items-start justify-between z-20">
                    <div className="flex flex-col gap-1.5">
                        {/* Crown badge — signature tier, colour matches the map pin (gold = rent, emerald = sale) */}
                        <div
                            className="inline-flex items-center gap-1.5 pl-1 pr-2.5 py-[3px] rounded-full text-[10px] font-black tracking-wider shadow-lg"
                            style={isForRent
                                ? { background: 'linear-gradient(135deg, #FFF0A0 0%, #FFA500 45%, #E8850A 100%)', color: '#3D1F00', boxShadow: '0 2px 12px rgba(255,165,0,0.35)' }
                                : { background: 'linear-gradient(135deg, #D7F5E8 0%, #34D399 55%, #047857 100%)', color: '#04301F', boxShadow: '0 2px 12px rgba(16,185,129,0.35)' }}
                        >
                            <img
                                src={isForRent ? '/icons/luxury_crown_villa_rent_gold.svg' : '/icons/luxury_crown_villa_sale_green.svg'}
                                alt="" aria-hidden="true" width={18} height={18} loading="lazy"
                                className="flex-shrink-0"
                            />
                            {t('villas:badges.signature', 'LUXURY VILLA')}
                        </div>
                        {/* Star badge — featured / actively promoted listings */}
                        {property.isPromoted && (
                            <div className="inline-flex items-center gap-1.5 pl-1 pr-2.5 py-[3px] rounded-full text-[10px] font-bold shadow w-fit bg-black/45 backdrop-blur-sm text-white border border-white/15">
                                <img
                                    src={isForRent ? '/icons/luxury_star_villa_rent_gold.svg' : '/icons/luxury_star_villa_sale_green.svg'}
                                    alt="" aria-hidden="true" width={16} height={16} loading="lazy"
                                    className="flex-shrink-0"
                                />
                                {t('villas:badges.featured', 'Featured')}
                            </div>
                        )}
                        {/* Market chip — colour matches the map pin (gold = rent, emerald = sale) */}
                        <div
                            className="inline-flex items-center gap-1 px-2 py-[3px] rounded-full text-[10px] font-bold shadow w-fit"
                            style={isForRent
                                ? { background: 'linear-gradient(135deg,#FFE9A3,#E8B820)', color: '#2C1A00' }
                                : { background: 'linear-gradient(135deg,#34D399,#059669)', color: '#FFFFFF' }}
                        >
                            {isForRent ? t('villas:filters.forRent', 'For Rent') : t('villas:filters.forSale', 'For Sale')}
                        </div>
                        {isSold && (
                            <div className="inline-flex items-center gap-1 px-2 py-[3px] rounded-full text-[10px] font-bold bg-red-500/85 backdrop-blur-sm text-white shadow">
                                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse inline-block" /> {t('property:sold', 'Sold')}
                            </div>
                        )}
                        {isRented && (
                            <div className="inline-flex items-center gap-1 px-2 py-[3px] rounded-full text-[10px] font-bold bg-orange-500/85 backdrop-blur-sm text-white shadow">
                                <span className="w-1.5 h-1.5 bg-white rounded-full inline-block" /> {t('property:rented', 'Rented')}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5">
                        {property.viewType === 'sea' ? (
                            /* Palm badge — beachfront villas get the branded icon instead of the emoji chip */
                            <span className="inline-flex items-center gap-1 pl-1 pr-2 py-[3px] rounded-full text-[10px] font-semibold text-white/90 bg-black/35 backdrop-blur-sm border border-white/10">
                                <img
                                    src={isForRent ? '/icons/luxury_palm_villa_rent_gold.svg' : '/icons/luxury_palm_villa_sale_green.svg'}
                                    alt="" aria-hidden="true" width={15} height={15} loading="lazy"
                                    className="flex-shrink-0"
                                />
                                {t('villas:badges.beachfront', 'Beachfront')}
                            </span>
                        ) : viewType && (
                            <span className="px-2 py-[5px] rounded-full text-[10px] font-semibold text-white/90 bg-black/35 backdrop-blur-sm border border-white/10">
                                <span aria-hidden="true">{viewType.emoji}</span> {t(viewType.key, viewType.fallback)}
                            </span>
                        )}
                        <button
                            type="button"
                            onClick={handleFav}
                            onKeyDown={stopKeys}
                            aria-label={isFavorited
                                ? t('common:removeFromFavorites', 'Remove from favourites')
                                : t('common:addToFavorites', 'Add to favourites')}
                            aria-pressed={isFavorited}
                            className={`villa-fav-btn w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-full transition-all duration-200 shadow-lg focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none active:scale-90 ${
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

                {/* Image dots — one per reachable image.
                    The dot is a child span rather than the button box itself:
                    index.html gives every <button> a 44px min-height on coarse
                    pointers, which stretched the bare dots into tall white bars
                    on phones. .villa-dots (see VillaSearchPage) sizes the hit
                    box back down; the span keeps the dot the size it looks. */}
                {layers.length > 1 && (
                    <div className="villa-dots absolute top-1.5 left-1/2 -translate-x-1/2 flex items-center gap-1 z-20">
                        {layers.map((_, i) => (
                            <button
                                key={i}
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setImgIndex(i); }}
                                className="h-6 px-1 flex items-center justify-center focus-visible:outline-none"
                                onKeyDown={stopKeys}
                                aria-label={t('villas:card.goToImage', 'Go to image {{n}}', { n: i + 1 })}
                                aria-current={i === imgIndex}
                            >
                                <span
                                    className={`block h-1.5 rounded-full transition-all duration-300 ease-out ${
                                        i === imgIndex
                                            ? 'w-5 bg-white shadow-sm'
                                            : 'w-1.5 bg-white/45 hover:bg-white/75'
                                    }`}
                                />
                            </button>
                        ))}
                    </div>
                )}

                {/* Arrow nav. Revealed on hover for pointer devices; touch has no
                    hover, so villa-nav-arrow (see VillaSearchPage) keeps them
                    permanently visible and thumb-sized there — otherwise a phone
                    was left with only the dots and a swipe to move through the
                    gallery, and the arrows sat invisible over the image eating
                    taps meant for the card. */}
                {layers.length > 1 && (
                    <>
                        <button type="button" onClick={prevImg}
                            className="villa-nav-arrow villa-nav-arrow-prev absolute left-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-black/60 focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none"
                            onKeyDown={stopKeys}
                            aria-label={t('property:imageViewer.previous', 'Previous image')}>
                            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <button type="button" onClick={nextImg}
                            className="villa-nav-arrow villa-nav-arrow-next absolute right-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-black/60 focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none"
                            onKeyDown={stopKeys}
                            aria-label={t('property:imageViewer.next', 'Next image')}>
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
                                <span aria-hidden="true">{chip.emoji}</span> {chip.label}
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
                                {property.title || (property.beds > 0
                                    ? t('villas:card.bedTitle', '{{beds}}-Bed Luxury Villa', { beds: property.beds })
                                    : t('villas:card.defaultTitle', 'Luxury Villa'))}
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
                                    style={{ color: 'var(--color-villa-gold-bright)', background: 'rgba(255,165,0,0.15)', border: '1px solid rgba(255,165,0,0.25)' }}
                                >
                                    {t('property:byNegotiation', 'By Negotiation')}
                                </span>
                            ) : (
                                <div className="villa-price-tag inline-block px-3 py-1.5 rounded-xl">
                                    <div className="text-white font-extrabold text-lg leading-none tracking-tight"
                                         style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
                                        {formatPrice(property.price, property.country)}
                                    </div>
                                    {isForRent && (
                                        <div className="text-[10px] font-bold text-center mt-0.5" style={{ color: 'var(--color-villa-gold-bright)' }}>
                                            {t('villas:booking.perNight', '/ night')}
                                        </div>
                                    )}
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
                                <span>· {t('villas:card.cleaningFee', '+{{price}} cleaning', {
                                    price: formatPrice(property.cleaningFee as number, property.country),
                                })}</span>
                            )}
                            {property.cancellationPolicy && (
                                <span>· {CANCEL_LABEL[property.cancellationPolicy]
                                    ? t(CANCEL_LABEL[property.cancellationPolicy].key, CANCEL_LABEL[property.cancellationPolicy].fallback)
                                    : property.cancellationPolicy}</span>
                            )}
                        </div>
                    )}
                </div>

                {/* ── CTA — emerges on hover; booking (rent) or enquiry (sale) ── */}
                {!isSold && (
                    <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
                        <button
                            type="button"
                            onClick={openBooking}
                            onKeyDown={stopKeys}
                            className="villa-cta-btn pointer-events-auto px-6 py-2.5 rounded-full text-sm font-bold text-white border border-white/35 backdrop-blur-sm shadow-2xl hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none"
                            aria-label={isForRent ? t('villas:booking.requestToBook', 'Request to Book') : t('villas:booking.enquire', 'Request Details')}
                        >
                            {isForRent ? t('villas:booking.requestToBook', 'Request to Book') : t('villas:booking.enquire', 'Request Details')} &rarr;
                        </button>
                    </div>
                )}
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
