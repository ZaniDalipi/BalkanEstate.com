import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    XMarkIcon,
    MagnifyingGlassPlusIcon,
    MagnifyingGlassMinusIcon,
    ArrowPathIcon,
} from '@/constants';
import { FloorPlanAnnotation } from '@/types';

// ── Icons for annotation types ──────────────────────────────────────────────
const ANNOTATION_ICONS: Record<string, string> = {
    bedroom: '🛏',
    bathroom: '🚿',
    kitchen: '🍳',
    living: '🛋',
    dining: '🍽',
    garage: '🚗',
    garden: '🌿',
    office: '💼',
    storage: '📦',
    balcony: '🌅',
};

// ── Style filter presets ─────────────────────────────────────────────────────
type PlanStyle = 'normal' | 'blueprint' | 'sketch' | 'vintage';

const STYLE_FILTERS: Record<PlanStyle, string> = {
    normal: 'none',
    blueprint:
        'invert(1) sepia(1) saturate(5) hue-rotate(180deg) brightness(0.9) contrast(1.2)',
    sketch:
        'grayscale(1) contrast(1.6) brightness(1.1)',
    vintage:
        'sepia(0.7) contrast(1.1) brightness(0.95) saturate(0.8)',
};

const STYLE_LABELS: Record<PlanStyle, string> = {
    normal: 'Normal',
    blueprint: 'Blueprint',
    sketch: 'Sketch',
    vintage: 'Vintage',
};

// ── Props ────────────────────────────────────────────────────────────────────
interface FloorPlanViewerModalProps {
    imageUrl: string;
    onClose: () => void;
    annotations?: FloorPlanAnnotation[];
}

// ── Component ────────────────────────────────────────────────────────────────
const FloorPlanViewerModal: React.FC<FloorPlanViewerModalProps> = ({
    imageUrl,
    onClose,
    annotations = [],
}) => {
    const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });
    const [planStyle, setPlanStyle] = useState<PlanStyle>('normal');
    const [activePin, setActivePin] = useState<string | null>(null);
    const [isEntered, setIsEntered] = useState(false);
    const [isTouring, setIsTouring] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Touch / pinch state
    const lastPinchDistance = useRef<number | null>(null);

    const imageContainerRef = useRef<HTMLDivElement>(null);
    const tourTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ── Animated entrance ──────────────────────────────────────────────────
    useEffect(() => {
        const id = requestAnimationFrame(() => setIsEntered(true));
        return () => cancelAnimationFrame(id);
    }, []);

    // ── Keyboard: Escape → close ───────────────────────────────────────────
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (activePin) setActivePin(null);
                else onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose, activePin]);

    // ── Fullscreen API ─────────────────────────────────────────────────────
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () =>
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const toggleFullscreen = useCallback(() => {
        const el = imageContainerRef.current?.closest('.fp-modal-root') as HTMLElement | null;
        if (!el) return;
        if (!document.fullscreenElement) {
            el.requestFullscreen().catch(() => {});
        } else {
            document.exitFullscreen().catch(() => {});
        }
    }, []);

    // ── Zoom ───────────────────────────────────────────────────────────────
    const resetTransform = useCallback(() => {
        setTransform({ scale: 1, x: 0, y: 0 });
    }, []);

    const zoom = useCallback(
        (direction: 'in' | 'out', clientX?: number, clientY?: number) => {
            const scaleFactor = 1.2;
            setTransform((prev) => {
                const newScale =
                    direction === 'in'
                        ? prev.scale * scaleFactor
                        : prev.scale / scaleFactor;
                if (newScale < 0.5 || newScale > 10) return prev;

                const container = imageContainerRef.current;
                if (!container) return { ...prev, scale: newScale };

                const rect = container.getBoundingClientRect();
                const pivotX =
                    clientX !== undefined ? clientX - rect.left : rect.width / 2;
                const pivotY =
                    clientY !== undefined ? clientY - rect.top : rect.height / 2;

                return {
                    scale: newScale,
                    x: pivotX - (pivotX - prev.x) * (newScale / prev.scale),
                    y: pivotY - (pivotY - prev.y) * (newScale / prev.scale),
                };
            });
        },
        []
    );

    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        zoom(e.deltaY < 0 ? 'in' : 'out', e.clientX, e.clientY);
    };

    // ── Mouse pan ──────────────────────────────────────────────────────────
    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0) return;
        e.preventDefault();
        setIsPanning(true);
        setPanStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isPanning) return;
        e.preventDefault();
        setTransform((prev) => ({
            ...prev,
            x: e.clientX - panStart.x,
            y: e.clientY - panStart.y,
        }));
    };

    const handleMouseUp = () => setIsPanning(false);

    // ── Touch pinch-to-zoom ────────────────────────────────────────────────
    const getTouchDistance = (t: React.TouchList) =>
        Math.hypot(
            t[0].clientX - t[1].clientX,
            t[0].clientY - t[1].clientY
        );

    const handleTouchStart = (e: React.TouchEvent) => {
        if (e.touches.length === 2) {
            lastPinchDistance.current = getTouchDistance(e.touches);
        } else if (e.touches.length === 1) {
            setIsPanning(true);
            setPanStart({
                x: e.touches[0].clientX - transform.x,
                y: e.touches[0].clientY - transform.y,
            });
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        e.preventDefault();
        if (e.touches.length === 2 && lastPinchDistance.current !== null) {
            const newDist = getTouchDistance(e.touches);
            const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
            if (newDist > lastPinchDistance.current * 1.03) zoom('in', midX, midY);
            else if (newDist < lastPinchDistance.current * 0.97) zoom('out', midX, midY);
            lastPinchDistance.current = newDist;
        } else if (e.touches.length === 1 && isPanning) {
            setTransform((prev) => ({
                ...prev,
                x: e.touches[0].clientX - panStart.x,
                y: e.touches[0].clientY - panStart.y,
            }));
        }
    };

    const handleTouchEnd = () => {
        setIsPanning(false);
        lastPinchDistance.current = null;
    };

    // ── Auto room tour ─────────────────────────────────────────────────────
    const stopTour = useCallback(() => {
        if (tourTimerRef.current) clearTimeout(tourTimerRef.current);
        setIsTouring(false);
        setActivePin(null);
    }, []);

    const startTour = useCallback(() => {
        if (annotations.length === 0) return;
        setIsTouring(true);

        const container = imageContainerRef.current;
        let idx = 0;

        const visitNext = () => {
            if (idx >= annotations.length) {
                setIsTouring(false);
                setActivePin(null);
                return;
            }
            const pin = annotations[idx];
            setActivePin(pin.id);

            if (container) {
                const rect = container.getBoundingClientRect();
                const targetScale = 2.5;
                const targetX = rect.width / 2 - (pin.x / 100) * rect.width * targetScale;
                const targetY = rect.height / 2 - (pin.y / 100) * rect.height * targetScale;
                setTransform({ scale: targetScale, x: targetX, y: targetY });
            }

            idx++;
            tourTimerRef.current = setTimeout(visitNext, 2200);
        };

        visitNext();
    }, [annotations]);

    // cleanup tour on unmount
    useEffect(() => () => { if (tourTimerRef.current) clearTimeout(tourTimerRef.current); }, []);

    // ── Render ─────────────────────────────────────────────────────────────
    return (
        <div
            className="fp-modal-root fixed inset-0 z-[6000] flex flex-col"
            style={{
                background: 'rgba(0,0,0,0.88)',
                opacity: isEntered ? 1 : 0,
                transition: 'opacity 0.3s ease',
            }}
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            {/* ── Top toolbar ─────────────────────────────────────────────── */}
            <div
                className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-3"
                style={{
                    background: 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)',
                    opacity: isEntered ? 1 : 0,
                    transform: isEntered ? 'translateY(0)' : 'translateY(-12px)',
                    transition: 'opacity 0.4s ease 0.1s, transform 0.4s ease 0.1s',
                }}
            >
                {/* Style filter pills */}
                <div className="flex items-center gap-1 bg-neutral-900/60 backdrop-blur-sm rounded-xl p-1">
                    {(Object.keys(STYLE_LABELS) as PlanStyle[]).map((s) => (
                        <button
                            key={s}
                            onClick={() => setPlanStyle(s)}
                            className="px-3 py-1 text-xs font-semibold rounded-lg transition-all duration-200"
                            style={{
                                background: planStyle === s ? 'rgba(255,255,255,0.15)' : 'transparent',
                                color: planStyle === s ? '#fff' : 'rgba(255,255,255,0.5)',
                                border: planStyle === s ? '1px solid rgba(255,255,255,0.25)' : '1px solid transparent',
                            }}
                        >
                            {STYLE_LABELS[s]}
                        </button>
                    ))}
                </div>

                {/* Right controls */}
                <div className="flex items-center gap-2">
                    {/* Zoom controls */}
                    <div className="flex items-center gap-1 bg-neutral-900/60 backdrop-blur-sm p-1 rounded-xl">
                        <button
                            onClick={() => zoom('out')}
                            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                            aria-label="Zoom out"
                        >
                            <MagnifyingGlassMinusIcon className="w-5 h-5" />
                        </button>
                        <button
                            onClick={resetTransform}
                            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                            aria-label="Reset view"
                        >
                            <ArrowPathIcon className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => zoom('in')}
                            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                            aria-label="Zoom in"
                        >
                            <MagnifyingGlassPlusIcon className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Fullscreen */}
                    <button
                        onClick={toggleFullscreen}
                        className="p-2 bg-neutral-900/60 backdrop-blur-sm text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                        aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                        title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                    >
                        {isFullscreen ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9 3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5 5.25 5.25" />
                            </svg>
                        ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                            </svg>
                        )}
                    </button>

                    {/* Close */}
                    <button
                        onClick={onClose}
                        className="p-2 bg-neutral-900/60 backdrop-blur-sm text-white/70 hover:text-white hover:bg-red-500/60 rounded-xl transition-colors"
                        aria-label="Close"
                    >
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* ── Image canvas ─────────────────────────────────────────────── */}
            <div
                ref={imageContainerRef}
                className="flex-1 overflow-hidden relative"
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                style={{ touchAction: 'none' }}
            >
                {/* Animated inner content */}
                <div
                    className={isPanning ? 'cursor-grabbing' : 'cursor-grab'}
                    style={{
                        width: '100%',
                        height: '100%',
                        transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                        transition: isPanning || isTouring ? (isTouring ? 'transform 0.9s cubic-bezier(0.4,0,0.2,1)' : 'none') : 'transform 0.08s ease-out',
                        transformOrigin: '0 0',
                        opacity: isEntered ? 1 : 0,
                        scale: isEntered ? '1' : '0.92',
                        // @ts-ignore
                        transitionProperty: isPanning ? 'none' : 'transform, opacity, scale',
                        transitionDuration: isTouring ? '0.9s' : isEntered ? '0.08s, 0.4s, 0.4s' : '0s',
                    }}
                >
                    {/* The floor plan image */}
                    <img
                        src={imageUrl}
                        alt="Floor Plan"
                        className="max-w-full max-h-full h-full w-auto object-contain mx-auto select-none"
                        style={{
                            filter: STYLE_FILTERS[planStyle],
                            transition: 'filter 0.4s ease',
                            imageRendering: 'pixelated',
                            display: 'block',
                        }}
                        onDragStart={(e) => e.preventDefault()}
                    />

                    {/* ── Annotation pins ──────────────────────────────────── */}
                    {annotations.map((pin) => (
                        <button
                            key={pin.id}
                            onClick={(e) => {
                                e.stopPropagation();
                                setActivePin(activePin === pin.id ? null : pin.id);
                            }}
                            style={{
                                position: 'absolute',
                                left: `${pin.x}%`,
                                top: `${pin.y}%`,
                                transform: 'translate(-50%, -50%)',
                                zIndex: 10,
                            }}
                            aria-label={pin.label}
                        >
                            {/* Pulsing ring */}
                            <span
                                className="absolute inset-0 rounded-full"
                                style={{
                                    background: activePin === pin.id
                                        ? 'rgba(99,102,241,0.3)'
                                        : 'rgba(255,255,255,0.2)',
                                    animation: 'fp-ping 1.6s cubic-bezier(0,0,0.2,1) infinite',
                                    borderRadius: '50%',
                                    width: '2.5rem',
                                    height: '2.5rem',
                                    top: '-0.5rem',
                                    left: '-0.5rem',
                                }}
                            />
                            {/* Pin bubble */}
                            <span
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '1.5rem',
                                    height: '1.5rem',
                                    borderRadius: '50%',
                                    background: activePin === pin.id
                                        ? 'rgba(99,102,241,1)'
                                        : 'rgba(255,255,255,0.95)',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                                    border: `2px solid ${activePin === pin.id ? 'rgba(165,180,252,0.8)' : 'rgba(255,255,255,0.6)'}`,
                                    transition: 'background 0.2s, border 0.2s, transform 0.2s',
                                    transform: activePin === pin.id ? 'scale(1.2)' : 'scale(1)',
                                    fontSize: '0.75rem',
                                    position: 'relative',
                                    zIndex: 2,
                                }}
                            >
                                {ANNOTATION_ICONS[pin.icon] ?? '📍'}
                            </span>

                            {/* Info popup */}
                            {activePin === pin.id && (
                                <div
                                    style={{
                                        position: 'absolute',
                                        bottom: '110%',
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        background: 'rgba(15,15,25,0.92)',
                                        backdropFilter: 'blur(12px)',
                                        border: '1px solid rgba(99,102,241,0.4)',
                                        borderRadius: '0.75rem',
                                        padding: '0.5rem 0.75rem',
                                        minWidth: '120px',
                                        textAlign: 'center',
                                        animation: 'fp-popup 0.2s ease',
                                        zIndex: 20,
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    <p style={{ color: '#fff', fontWeight: 600, fontSize: '0.8rem', margin: 0 }}>
                                        {ANNOTATION_ICONS[pin.icon]} {pin.label}
                                    </p>
                                    {pin.size && (
                                        <p style={{ color: 'rgba(165,180,252,0.9)', fontSize: '0.7rem', margin: '2px 0 0' }}>
                                            {pin.size}
                                        </p>
                                    )}
                                    {/* Arrow */}
                                    <span
                                        style={{
                                            position: 'absolute',
                                            bottom: '-6px',
                                            left: '50%',
                                            transform: 'translateX(-50%)',
                                            width: 0,
                                            height: 0,
                                            borderLeft: '6px solid transparent',
                                            borderRight: '6px solid transparent',
                                            borderTop: '6px solid rgba(99,102,241,0.4)',
                                        }}
                                    />
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Bottom bar: room tour ────────────────────────────────────── */}
            {annotations.length > 0 && (
                <div
                    style={{
                        position: 'absolute',
                        bottom: '1rem',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 20,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        background: 'rgba(0,0,0,0.6)',
                        backdropFilter: 'blur(12px)',
                        borderRadius: '2rem',
                        padding: '0.4rem 1rem',
                        opacity: isEntered ? 1 : 0,
                        transition: 'opacity 0.4s ease 0.3s',
                    }}
                >
                    {isTouring ? (
                        <button
                            onClick={stopTour}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                color: '#a5b4fc',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '0.2rem 0.4rem',
                            }}
                        >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            Stop Tour
                        </button>
                    ) : (
                        <button
                            onClick={startTour}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                color: '#fff',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '0.2rem 0.4rem',
                            }}
                        >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                            </svg>
                            Room Tour
                        </button>
                    )}
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>
                        {annotations.length} room{annotations.length !== 1 ? 's' : ''}
                    </span>
                    {/* Room dot indicators */}
                    <div style={{ display: 'flex', gap: '4px' }}>
                        {annotations.map((pin) => (
                            <button
                                key={pin.id}
                                onClick={() => {
                                    setActivePin(pin.id);
                                    const container = imageContainerRef.current;
                                    if (container) {
                                        const rect = container.getBoundingClientRect();
                                        const targetScale = 2.5;
                                        setTransform({
                                            scale: targetScale,
                                            x: rect.width / 2 - (pin.x / 100) * rect.width * targetScale,
                                            y: rect.height / 2 - (pin.y / 100) * rect.height * targetScale,
                                        });
                                    }
                                }}
                                title={pin.label}
                                style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    background: activePin === pin.id ? '#818cf8' : 'rgba(255,255,255,0.35)',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: 0,
                                    transition: 'background 0.2s, transform 0.2s',
                                    transform: activePin === pin.id ? 'scale(1.4)' : 'scale(1)',
                                }}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* ── Keyframe styles ──────────────────────────────────────────── */}
            <style>{`
                @keyframes fp-ping {
                    0%, 100% { transform: scale(1); opacity: 0.6; }
                    50% { transform: scale(1.7); opacity: 0; }
                }
                @keyframes fp-popup {
                    from { opacity: 0; transform: translateX(-50%) translateY(6px); }
                    to   { opacity: 1; transform: translateX(-50%) translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default FloorPlanViewerModal;
