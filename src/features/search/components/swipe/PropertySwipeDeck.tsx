/**
 * PropertySwipeDeck — the Tinder-style card deck the AI assistant hands its
 * matches to.
 *
 * Two things here are deliberate, because both were broken before:
 *
 * 1. The deck owns a *frozen* copy of the matches. The search page re-runs its
 *    query the moment the assistant produces a final query, and every favourite
 *    toggle re-renders the whole context, so the incoming `properties` array
 *    changes identity constantly. Reading straight from it snapped the deck back
 *    to the first card mid-swipe. Once a card has been swiped the deck ignores
 *    the incoming list.
 *
 * 2. A swiped card flies out as a separate throw-away layer rather than through
 *    `AnimatePresence`'s exit prop. An exiting element is a clone of the render
 *    *before* the swipe, so its exit direction was always one swipe behind —
 *    swipe right, watch the card sail off to the left. The deck advances
 *    synchronously and the fly-out is purely decorative, which also means two
 *    quick taps always advance two cards.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion';
import type { Property } from '@/types';
import { formatPrice } from '@/utils/currency';
import { optimizeCloudinaryUrl } from '@/config/cloudinaryConfig';
import {
    ArrowUturnLeftIcon,
    EyeIcon,
    HeartIcon,
    MapPinIcon,
    SparklesIcon,
    XMarkIcon,
} from '@/constants';

const SWIPE_THRESHOLD = 100;
const SWIPE_VELOCITY = 500;
const PHOTO_INTERVAL_MS = 3200;
/** How long a manual photo tap holds off the automatic carousel. */
const PHOTO_MANUAL_PAUSE_MS = 6000;
/** Cards kept mounted in the stack, including the one on top. */
const STACK_DEPTH = 3;

export type SwipeDirection = 'left' | 'right';

interface SwipeRecord {
    property: Property;
    direction: SwipeDirection;
    /** True when this swipe is what saved the property, so undo can un-save it. */
    didSave: boolean;
}

/** Main image first, then any gallery images, de-duplicated. */
export function collectCardImages(property: Property): string[] {
    const seen = new Set<string>();
    const images: string[] = [];
    const push = (url?: string | null) => {
        if (!url || seen.has(url)) return;
        seen.add(url);
        images.push(url);
    };
    push(property.imageUrl);
    if (Array.isArray(property.images)) {
        property.images.forEach(img => push(typeof img === 'string' ? img : img?.url));
    }
    return images;
}

function vibrate(pattern: number | number[]) {
    try {
        navigator.vibrate?.(pattern);
    } catch {
        /* vibration is a nicety — never let it break a swipe */
    }
}

// ============================================================================
// CARD FACE — the shared visual, used by the live card and by the fly-out ghost
// ============================================================================
const SpecChip: React.FC<{ icon: string; value: string }> = ({ icon, value }) => (
    <span
        className="flex items-center gap-1 text-xs font-semibold text-white/85 px-2.5 py-1 rounded-lg"
        style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
        <span className="text-[11px]">{icon}</span> {value}
    </span>
);

interface CardFaceProps {
    property: Property;
    images: string[];
    photoIndex: number;
    isSaved: boolean;
    /** Omitted on the ghost — it is not interactive. */
    onView?: () => void;
    onStepPhoto?: (delta: number) => void;
}

const CardFace: React.FC<CardFaceProps> = ({ property, images, photoIndex, isSaved, onView, onStepPhoto }) => {
    const { t } = useTranslation(['search', 'property']);
    const priceLabel = property.isNegotiable
        ? t('property:byNegotiation', 'By Negotiation')
        : formatPrice(property.price, property.country);

    return (
        <>
            <AnimatePresence initial={false}>
                <motion.img
                    key={`${property.id}-${photoIndex}`}
                    src={optimizeCloudinaryUrl(images[photoIndex] || property.imageUrl, { width: 800, quality: 'auto' })}
                    alt={property.title || `${property.propertyType} in ${property.city}`}
                    className="absolute inset-0 w-full h-full object-cover"
                    draggable={false}
                    initial={{ opacity: 0, scale: 1.04 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6 }}
                />
            </AnimatePresence>

            <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.42) 35%, rgba(0,0,0,0.05) 62%, transparent 100%)' }}
            />

            {/* Photo tap zones — left/right thirds, kept clear of the info panel. */}
            {onStepPhoto && images.length > 1 && (
                <>
                    <button
                        type="button"
                        aria-label={t('search:ai.previousPhoto', 'Previous photo')}
                        onClick={event => { event.stopPropagation(); onStepPhoto(-1); }}
                        className="absolute left-0 top-0 bottom-36 w-1/3 z-[5] bg-transparent"
                    />
                    <button
                        type="button"
                        aria-label={t('search:ai.nextPhoto', 'Next photo')}
                        onClick={event => { event.stopPropagation(); onStepPhoto(1); }}
                        className="absolute right-0 top-0 bottom-36 w-1/3 z-[5] bg-transparent"
                    />
                </>
            )}

            {images.length > 1 && (
                <div className="absolute top-4 left-4 right-4 flex gap-1.5 z-10 pointer-events-none">
                    {images.map((_, i) => (
                        <div key={i} className="flex-1 h-[3px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.18)' }}>
                            <div className={`h-full rounded-full transition-all duration-500 ${i <= photoIndex ? 'w-full bg-white' : 'w-0'}`} />
                        </div>
                    ))}
                </div>
            )}

            {isSaved && (
                <div
                    className="absolute top-9 right-4 z-10 flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold text-white pointer-events-none"
                    style={{ background: 'rgba(34,197,94,0.35)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.25)' }}
                >
                    <HeartIcon className="w-3 h-3" />
                    {t('search:ai.alreadySaved', 'In favourites')}
                </div>
            )}

            <div className="absolute bottom-0 left-0 right-0 z-10 p-4 pointer-events-none">
                <div
                    className="rounded-2xl p-4 overflow-hidden relative"
                    style={{
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.05) 100%)',
                        backdropFilter: 'blur(20px) saturate(1.8)',
                        WebkitBackdropFilter: 'blur(20px) saturate(1.8)',
                        border: '1px solid rgba(255,255,255,0.18)',
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), 0 8px 32px rgba(0,0,0,0.2)',
                    }}
                >
                    <div className="flex items-start justify-between gap-3 mb-2">
                        <span className="text-white font-black text-xl tracking-tight drop-shadow-sm">{priceLabel}</span>
                        {property.propertyType && (
                            <span
                                className="text-[10px] font-bold uppercase tracking-wider text-white/70 px-2.5 py-1 rounded-full"
                                style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.12)' }}
                            >
                                {property.propertyType}
                            </span>
                        )}
                    </div>
                    {property.title && <p className="text-white/90 font-semibold text-sm line-clamp-1 mb-1.5">{property.title}</p>}
                    <div className="flex items-center gap-1.5 text-white/60 mb-3">
                        <MapPinIcon className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="text-xs font-medium">{[property.city, property.country].filter(Boolean).join(', ')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {property.beds > 0 && <SpecChip icon="🛏️" value={String(property.beds)} />}
                        {property.baths > 0 && <SpecChip icon="🛁" value={String(property.baths)} />}
                        {property.sqft > 0 && <SpecChip icon="📐" value={`${property.sqft}m²`} />}
                    </div>
                    {onView && (
                        <button
                            type="button"
                            onClick={event => { event.stopPropagation(); onView(); }}
                            className="pointer-events-auto mt-3 w-full py-2 rounded-xl text-white text-xs font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
                            style={{ background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.2)' }}
                        >
                            <EyeIcon className="w-4 h-4" />
                            {t('search:ai.viewDetails', 'View details')}
                        </button>
                    )}
                </div>
            </div>
        </>
    );
};

const CARD_SHELL = 'absolute inset-0 rounded-[28px] overflow-hidden select-none';

// ============================================================================
// LIVE CARD
// ============================================================================
interface SwipeCardProps {
    property: Property;
    isTop: boolean;
    depth: number;
    isSaved: boolean;
    onSwipe: (direction: SwipeDirection, photoIndex: number) => void;
    onView: () => void;
}

const SwipeCard: React.FC<SwipeCardProps> = ({ property, isTop, depth, isSaved, onSwipe, onView }) => {
    const { t } = useTranslation(['search']);
    const [photoIndex, setPhotoIndex] = useState(0);
    const [pausedUntil, setPausedUntil] = useState(0);
    const draggedRef = useRef(false);
    const photoIndexRef = useRef(0);
    photoIndexRef.current = photoIndex;

    // Drag offset drives the tilt and the SAVE/SKIP stamps without re-rendering.
    const dragX = useMotionValue(0);
    const rotate = useTransform(dragX, [-300, 0, 300], [-16, 0, 16]);
    const saveOpacity = useTransform(dragX, [30, 140], [0, 1]);
    const skipOpacity = useTransform(dragX, [-140, -30], [1, 0]);

    const images = useMemo(() => collectCardImages(property), [property]);

    useEffect(() => {
        setPhotoIndex(0);
        setPausedUntil(0);
        dragX.set(0);
    }, [property.id, dragX]);

    // Auto-advance the photos on the top card only, and only while the viewer
    // has not taken manual control.
    useEffect(() => {
        if (!isTop || images.length <= 1) return;
        const remaining = pausedUntil - Date.now();
        if (remaining > 0) {
            const resume = setTimeout(() => setPausedUntil(0), remaining);
            return () => clearTimeout(resume);
        }
        const interval = setInterval(() => {
            setPhotoIndex(prev => (prev + 1) % images.length);
        }, PHOTO_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [isTop, images.length, pausedUntil]);

    // Warm the next photo so the crossfade never lands on a blank frame.
    useEffect(() => {
        if (!isTop || images.length <= 1 || typeof Image === 'undefined') return;
        const next = images[(photoIndex + 1) % images.length];
        if (!next) return;
        const preload = new Image();
        preload.src = optimizeCloudinaryUrl(next, { width: 800, quality: 'auto' });
    }, [isTop, images, photoIndex]);

    const stepPhoto = useCallback((delta: number) => {
        if (draggedRef.current) { draggedRef.current = false; return; }
        if (images.length <= 1) return;
        setPhotoIndex(prev => (prev + delta + images.length) % images.length);
        setPausedUntil(Date.now() + PHOTO_MANUAL_PAUSE_MS);
    }, [images.length]);

    const handleDragStart = () => { draggedRef.current = false; };

    const handleDrag = (_: unknown, info: PanInfo) => {
        if (Math.abs(info.offset.x) > 6 || Math.abs(info.offset.y) > 6) draggedRef.current = true;
        dragX.set(info.offset.x);
    };

    const handleDragEnd = (_: unknown, info: PanInfo) => {
        const right = info.offset.x > SWIPE_THRESHOLD || info.velocity.x > SWIPE_VELOCITY;
        const left = info.offset.x < -SWIPE_THRESHOLD || info.velocity.x < -SWIPE_VELOCITY;
        if (right || left) {
            onSwipe(right ? 'right' : 'left', photoIndexRef.current);
        }
        dragX.set(0);
    };

    return (
        <motion.div
            data-testid="swipe-card"
            data-property-id={property.id}
            aria-hidden={!isTop}
            className={CARD_SHELL}
            style={{
                rotate,
                touchAction: 'none',
                cursor: isTop ? 'grab' : 'default',
                zIndex: STACK_DEPTH - depth,
                boxShadow: isTop
                    ? '0 25px 60px -12px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.1), inset 0 1px 0 rgba(255,255,255,0.15)'
                    : '0 10px 30px -8px rgba(0,0,0,0.3)',
            }}
            drag={isTop ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.75}
            onDragStart={handleDragStart}
            onDrag={handleDrag}
            onDragEnd={handleDragEnd}
            initial={{ scale: 0.88, opacity: 0, y: 30 }}
            animate={{ scale: 1 - depth * 0.05, opacity: 1, y: depth * 14 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
        >
            <CardFace
                property={property}
                images={images}
                photoIndex={photoIndex}
                isSaved={isSaved}
                onView={isTop ? onView : undefined}
                onStepPhoto={isTop ? stepPhoto : undefined}
            />

            {isTop && (
                <>
                    <motion.div style={{ opacity: saveOpacity }} className="absolute inset-0 rounded-[28px] flex items-center justify-center pointer-events-none z-20">
                        <div className="absolute inset-0 rounded-[28px]" style={{ background: 'rgba(34,197,94,0.1)', border: '3px solid rgba(34,197,94,0.55)' }} />
                        <div
                            className="px-8 py-3 rounded-2xl font-black text-2xl text-green-300 rotate-[-12deg] relative"
                            style={{
                                background: 'rgba(34,197,94,0.18)',
                                backdropFilter: 'blur(12px)',
                                border: '2px solid rgba(34,197,94,0.45)',
                                boxShadow: '0 0 40px rgba(34,197,94,0.35)',
                            }}
                        >
                            {t('search:ai.stampSave', 'SAVE')}
                        </div>
                    </motion.div>
                    <motion.div style={{ opacity: skipOpacity }} className="absolute inset-0 rounded-[28px] flex items-center justify-center pointer-events-none z-20">
                        <div className="absolute inset-0 rounded-[28px]" style={{ background: 'rgba(239,68,68,0.1)', border: '3px solid rgba(239,68,68,0.55)' }} />
                        <div
                            className="px-8 py-3 rounded-2xl font-black text-2xl text-red-300 rotate-[12deg] relative"
                            style={{
                                background: 'rgba(239,68,68,0.18)',
                                backdropFilter: 'blur(12px)',
                                border: '2px solid rgba(239,68,68,0.45)',
                                boxShadow: '0 0 40px rgba(239,68,68,0.35)',
                            }}
                        >
                            {t('search:ai.stampSkip', 'SKIP')}
                        </div>
                    </motion.div>
                </>
            )}
        </motion.div>
    );
};

// ============================================================================
// FLY-OUT GHOST
// ============================================================================
interface FlyOut {
    key: number;
    property: Property;
    direction: SwipeDirection;
    photoIndex: number;
}

const FlyingCard: React.FC<{ flyOut: FlyOut; onDone: (key: number) => void }> = ({ flyOut, onDone }) => {
    const images = useMemo(() => collectCardImages(flyOut.property), [flyOut.property]);
    const sign = flyOut.direction === 'right' ? 1 : -1;

    // Belt and braces: if the animation never reports completion (a hidden tab,
    // reduced motion, a test environment) the ghost still cleans itself up.
    useEffect(() => {
        const timer = setTimeout(() => onDone(flyOut.key), 700);
        return () => clearTimeout(timer);
    }, [flyOut.key, onDone]);

    return (
        <motion.div
            data-testid="swipe-card-flyout"
            data-direction={flyOut.direction}
            aria-hidden="true"
            className={`${CARD_SHELL} pointer-events-none`}
            style={{ zIndex: STACK_DEPTH + 1 }}
            initial={{ x: sign * 40, rotate: sign * 4, opacity: 1 }}
            animate={{ x: sign * 640, rotate: sign * 22, opacity: 0 }}
            transition={{ duration: 0.42, ease: [0.36, 0, 0.66, -0.2] }}
            onAnimationComplete={() => onDone(flyOut.key)}
        >
            <CardFace property={flyOut.property} images={images} photoIndex={flyOut.photoIndex} isSaved={false} />
            <div
                className="absolute inset-0 rounded-[28px] flex items-center justify-center pointer-events-none z-20"
                style={{
                    background: sign > 0 ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                    border: `3px solid ${sign > 0 ? 'rgba(34,197,94,0.55)' : 'rgba(239,68,68,0.55)'}`,
                }}
            />
        </motion.div>
    );
};

// ============================================================================
// DECK
// ============================================================================
export interface PropertySwipeDeckProps {
    isOpen: boolean;
    properties: Property[];
    onClose: () => void;
    onGoToFavorites: () => void;
    onViewProperty: (property: Property) => void;
    isSaved: (property: Property) => boolean;
    onToggleSave: (property: Property, shouldSave: boolean) => void;
    /** False for signed-out visitors — a right swipe then asks them to sign in. */
    canSave?: boolean;
    onRequireAuth?: () => void;
}

const PropertySwipeDeck: React.FC<PropertySwipeDeckProps> = ({
    isOpen,
    properties,
    onClose,
    onGoToFavorites,
    onViewProperty,
    isSaved,
    onToggleSave,
    canSave = true,
    onRequireAuth,
}) => {
    const { t } = useTranslation(['search', 'property']);
    const [deck, setDeck] = useState<Property[]>([]);
    const [cursor, setCursor] = useState(0);
    const [swipes, setSwipes] = useState<SwipeRecord[]>([]);
    const [flyOuts, setFlyOuts] = useState<FlyOut[]>([]);
    // The cursor is also held in a ref so two quick taps advance two cards
    // instead of both reading the same stale index.
    const cursorRef = useRef(0);
    const adoptedSignatureRef = useRef<string | null>(null);
    const flyKeyRef = useRef(0);
    const swipesRef = useRef<SwipeRecord[]>([]);
    swipesRef.current = swipes;

    const signature = useMemo(() => properties.map(p => p.id).join('|'), [properties]);

    // Adopt the incoming matches on open, and again while the deck is still
    // untouched (the search page refreshes its results a beat after the
    // assistant answers). Once a card has been swiped the deck is frozen.
    useEffect(() => {
        if (!isOpen) {
            adoptedSignatureRef.current = null;
            return;
        }
        if (adoptedSignatureRef.current === signature) return;
        if (adoptedSignatureRef.current !== null && cursorRef.current > 0) return;
        adoptedSignatureRef.current = signature;
        cursorRef.current = 0;
        setDeck(properties);
        setCursor(0);
        setSwipes([]);
        setFlyOuts([]);
    }, [isOpen, signature, properties]);

    const savedProperties = useMemo(() => swipes.filter(s => s.direction === 'right').map(s => s.property), [swipes]);
    const savedCount = savedProperties.length;
    const done = deck.length > 0 && cursor >= deck.length;

    const dismissFlyOut = useCallback((key: number) => {
        setFlyOuts(prev => (prev.some(f => f.key === key) ? prev.filter(f => f.key !== key) : prev));
    }, []);

    const handleSwipe = useCallback((direction: SwipeDirection, photoIndex = 0) => {
        const index = cursorRef.current;
        const property = deck[index];
        if (!property) return;

        if (direction === 'right' && !canSave) {
            onRequireAuth?.();
            return;
        }

        let didSave = false;
        if (direction === 'right' && !isSaved(property)) {
            onToggleSave(property, true);
            didSave = true;
        }

        cursorRef.current = index + 1;
        setCursor(index + 1);
        setSwipes(prev => [...prev, { property, direction, didSave }]);
        flyKeyRef.current += 1;
        setFlyOuts(prev => [...prev, { key: flyKeyRef.current, property, direction, photoIndex }]);
        vibrate(direction === 'right' ? [12, 30, 12] : 10);
    }, [deck, canSave, onRequireAuth, isSaved, onToggleSave]);

    const handleUndo = useCallback(() => {
        const index = cursorRef.current;
        if (index === 0) return;
        const last = swipesRef.current[swipesRef.current.length - 1];
        cursorRef.current = index - 1;
        setCursor(index - 1);
        setFlyOuts([]);
        setSwipes(prev => prev.slice(0, -1));
        if (last?.didSave) onToggleSave(last.property, false);
        vibrate(8);
    }, [onToggleSave]);

    const handleView = useCallback(() => {
        const property = deck[cursorRef.current];
        if (property) onViewProperty(property);
    }, [deck, onViewProperty]);

    const handleRestart = useCallback(() => {
        cursorRef.current = 0;
        setCursor(0);
        setSwipes([]);
        setFlyOuts([]);
    }, []);

    // Keyboard driving — the deck is as usable on a laptop as on a phone.
    useEffect(() => {
        if (!isOpen) return;
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') { onClose(); return; }
            if (done) return;
            switch (event.key) {
                case 'ArrowLeft': event.preventDefault(); handleSwipe('left'); break;
                case 'ArrowRight': event.preventDefault(); handleSwipe('right'); break;
                case 'ArrowUp': event.preventDefault(); handleView(); break;
                case 'Backspace': event.preventDefault(); handleUndo(); break;
                default: break;
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isOpen, done, onClose, handleSwipe, handleView, handleUndo]);

    // Hold the page still behind the full-screen deck.
    useEffect(() => {
        if (!isOpen) return;
        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = previous; };
    }, [isOpen]);

    if (typeof document === 'undefined') return null;

    const visible = deck.slice(cursor, cursor + STACK_DEPTH);

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    key="swipe-deck"
                    role="dialog"
                    aria-modal="true"
                    aria-label={t('search:ai.swipeTitle', 'Your Matches')}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="fixed inset-0 z-[9999] flex items-center justify-center"
                >
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />

                    <motion.div
                        initial={{ scale: 0.92, opacity: 0, y: 26 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.92, opacity: 0, y: 26 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        className="relative z-10 flex flex-col items-center w-full max-w-md mx-4 max-h-[92vh]"
                    >
                        {done ? (
                            <div className="flex flex-col items-center text-center px-6 py-10">
                                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center mb-5 shadow-xl shadow-green-500/30">
                                    <HeartIcon className="w-10 h-10 text-white" />
                                </div>
                                <h3 className="text-xl font-extrabold text-white mb-2">
                                    {savedCount > 0
                                        ? t('search:ai.swipeDone', { count: savedCount, defaultValue: '{{count}} properties saved!' })
                                        : t('search:ai.swipeNoneSaved', 'No properties saved')}
                                </h3>
                                <p className="text-sm text-white/70 mb-5">
                                    {savedCount > 0
                                        ? t('search:ai.swipeCheckFavorites', 'Check your favorites to compare them')
                                        : t('search:ai.swipeTryAgain', 'Try a different search to find your dream property')}
                                </p>

                                {savedProperties.length > 0 && (
                                    <div className="flex flex-wrap justify-center gap-2 mb-6">
                                        {savedProperties.slice(0, 6).map(property => (
                                            <img
                                                key={property.id}
                                                src={optimizeCloudinaryUrl(property.imageUrl, { width: 120, quality: 'auto' })}
                                                alt={property.title || property.city}
                                                className="w-14 h-14 rounded-xl object-cover border border-white/25"
                                            />
                                        ))}
                                    </div>
                                )}

                                <div className="flex flex-wrap justify-center gap-3">
                                    {savedCount > 0 && (
                                        <button
                                            onClick={onGoToFavorites}
                                            className="px-6 py-3 bg-gradient-to-r from-primary to-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-primary/30 hover:shadow-xl active:scale-[0.97] transition-all text-sm"
                                        >
                                            {t('search:ai.goToFavorites', 'Go to Favorites')}
                                        </button>
                                    )}
                                    <button
                                        onClick={handleRestart}
                                        className="px-6 py-3 bg-white/15 backdrop-blur-sm text-white font-bold rounded-2xl hover:bg-white/25 active:scale-[0.97] transition-all text-sm border border-white/20"
                                    >
                                        {t('search:ai.swipeAgain', 'Swipe again')}
                                    </button>
                                    <button
                                        onClick={onClose}
                                        className="px-6 py-3 bg-white/15 backdrop-blur-sm text-white font-bold rounded-2xl hover:bg-white/25 active:scale-[0.97] transition-all text-sm border border-white/20"
                                    >
                                        {t('search:ai.backToChat', 'Back to Chat')}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div
                                    className="flex items-center justify-between w-full mb-4 rounded-2xl"
                                    style={{
                                        background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.03) 100%)',
                                        backdropFilter: 'blur(16px)',
                                        border: '1px solid rgba(255,255,255,0.12)',
                                        padding: '10px 14px',
                                    }}
                                >
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 via-primary to-violet-500 flex items-center justify-center">
                                            <SparklesIcon className="w-4 h-4 text-white" />
                                        </div>
                                        <div>
                                            <span className="text-sm font-bold text-white">{t('search:ai.swipeTitle', 'Your Matches')}</span>
                                            <p className="text-[10px] text-white/50 font-medium" data-testid="swipe-progress">
                                                {Math.min(cursor + 1, deck.length)} / {deck.length}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2.5">
                                        <span
                                            className="text-[11px] font-bold text-green-300 px-3 py-1 rounded-full"
                                            data-testid="swipe-saved-count"
                                            style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)' }}
                                        >
                                            {savedCount} {t('search:ai.saved', 'saved')}
                                        </span>
                                        <button
                                            onClick={onClose}
                                            aria-label={t('search:ai.closeSwipe', 'Close matches')}
                                            className="w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-all hover:scale-110"
                                            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
                                        >
                                            <XMarkIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="relative w-full aspect-[3/4] max-h-[58vh]">
                                    {visible.map((property, depth) => (
                                        <SwipeCard
                                            key={property.id}
                                            property={property}
                                            depth={depth}
                                            isTop={depth === 0}
                                            isSaved={isSaved(property)}
                                            onSwipe={handleSwipe}
                                            onView={handleView}
                                        />
                                    ))}
                                    <AnimatePresence>
                                        {flyOuts.map(flyOut => (
                                            <FlyingCard key={flyOut.key} flyOut={flyOut} onDone={dismissFlyOut} />
                                        ))}
                                    </AnimatePresence>
                                </div>

                                <div className="flex items-center justify-center gap-4 mt-5">
                                    <RoundButton
                                        label={t('search:ai.undo', 'Undo last swipe')}
                                        onClick={handleUndo}
                                        disabled={cursor === 0}
                                        tone="neutral"
                                        size="sm"
                                    >
                                        <ArrowUturnLeftIcon className="w-4 h-4" />
                                    </RoundButton>
                                    <RoundButton label={t('search:ai.skip', 'Skip')} onClick={() => handleSwipe('left')} tone="red" size="lg">
                                        <XMarkIcon className="w-6 h-6" />
                                    </RoundButton>
                                    <RoundButton label={t('search:ai.save', 'Save')} onClick={() => handleSwipe('right')} tone="green" size="lg">
                                        <HeartIcon className="w-6 h-6" />
                                    </RoundButton>
                                </div>

                                <p className="text-[11px] text-white/40 mt-3 text-center font-medium tracking-wide">
                                    {t('search:ai.swipeHint', 'Swipe right to save, left to skip')}
                                </p>
                                <p className="hidden sm:block text-[10px] text-white/25 mt-1 text-center">
                                    {t('search:ai.swipeKeyboardHint', '← skip · → save · ↑ details · Backspace undo')}
                                </p>
                            </>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
};

const TONES = {
    red: { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.35)', glow: 'rgba(239,68,68,0.18)', text: 'text-red-300' },
    green: { bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.35)', glow: 'rgba(34,197,94,0.18)', text: 'text-green-300' },
    blue: { bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.35)', glow: 'rgba(59,130,246,0.18)', text: 'text-blue-300' },
    neutral: { bg: 'rgba(255,255,255,0.08)', border: 'rgba(255,255,255,0.18)', glow: 'rgba(255,255,255,0.08)', text: 'text-white/70' },
} as const;

const RoundButton: React.FC<{
    label: string;
    onClick: () => void;
    tone: keyof typeof TONES;
    size: 'sm' | 'md' | 'lg';
    disabled?: boolean;
    children: React.ReactNode;
}> = ({ label, onClick, tone, size, disabled, children }) => {
    const dimensions = { sm: 'w-10 h-10', md: 'w-12 h-12', lg: 'w-14 h-14' }[size];
    const style = TONES[tone];
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
            title={label}
            className={`${dimensions} ${style.text} rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-90 disabled:opacity-30 disabled:hover:scale-100`}
            style={{
                background: style.bg,
                backdropFilter: 'blur(12px)',
                border: `2px solid ${style.border}`,
                boxShadow: `0 0 20px ${style.glow}, inset 0 1px 0 rgba(255,255,255,0.1)`,
            }}
        >
            {children}
        </button>
    );
};

export default PropertySwipeDeck;
