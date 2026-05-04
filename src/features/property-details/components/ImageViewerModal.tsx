import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeftIcon, ChevronRightIcon, XMarkIcon, BuildingOfficeIcon } from '@/constants';
import { optimizeCloudinaryUrl, cloudinarySrcSet } from '@/config/cloudinaryConfig';

interface ImageViewerModalProps {
    images: { url: string; tag: string }[];
    startIndex: number;
    onClose: () => void;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const SWIPE_THRESHOLD = 50;
const DOUBLE_TAP_MS = 300;

const ImageViewerModal: React.FC<ImageViewerModalProps> = ({ images, startIndex, onClose }) => {
    const { t } = useTranslation(['property', 'common']);
    const [currentIndex, setCurrentIndex] = useState(startIndex);
    const [imageError, setImageError] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [zoom, setZoom] = useState(1);
    const [panX, setPanX] = useState(0);
    const [panY, setPanY] = useState(0);

    // Touch tracking refs — never trigger re-renders
    const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
    const lastTapRef = useRef(0);
    const pinchStartDist = useRef(0);
    const pinchStartZoom = useRef(1);
    const panOriginRef = useRef<{ x: number; y: number } | null>(null);
    const zoomRef = useRef(zoom);
    const panXRef = useRef(panX);
    const panYRef = useRef(panY);

    useEffect(() => { zoomRef.current = zoom; }, [zoom]);
    useEffect(() => { panXRef.current = panX; }, [panX]);
    useEffect(() => { panYRef.current = panY; }, [panY]);

    const resetZoom = useCallback(() => {
        setZoom(1);
        setPanX(0);
        setPanY(0);
    }, []);

    const clampPan = useCallback((x: number, y: number, z: number) => {
        const maxPan = (z - 1) * 150;
        return {
            x: Math.max(-maxPan, Math.min(maxPan, x)),
            y: Math.max(-maxPan, Math.min(maxPan, y)),
        };
    }, []);

    const handleNext = useCallback(() => {
        resetZoom();
        setCurrentIndex(prev => (prev + 1) % images.length);
    }, [images.length, resetZoom]);

    const handlePrev = useCallback(() => {
        resetZoom();
        setCurrentIndex(prev => (prev - 1 + images.length) % images.length);
    }, [images.length, resetZoom]);

    // ── Touch: pinch-zoom + swipe + pan ──────────────────────────────────────
    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            pinchStartDist.current = Math.sqrt(dx * dx + dy * dy);
            pinchStartZoom.current = zoomRef.current;
        } else if (e.touches.length === 1) {
            const { clientX: x, clientY: y } = e.touches[0];
            touchStartRef.current = { x, y, time: Date.now() };
            if (zoomRef.current > 1) {
                panOriginRef.current = { x: x - panXRef.current, y: y - panYRef.current };
            }
        }
    }, []);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (e.touches.length === 2 && pinchStartDist.current > 0) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, pinchStartZoom.current * (dist / pinchStartDist.current)));
            setZoom(newZoom);
            e.preventDefault();
        } else if (e.touches.length === 1 && zoomRef.current > 1 && panOriginRef.current) {
            const { clientX: x, clientY: y } = e.touches[0];
            const clamped = clampPan(x - panOriginRef.current.x, y - panOriginRef.current.y, zoomRef.current);
            setPanX(clamped.x);
            setPanY(clamped.y);
            e.preventDefault();
        }
    }, [clampPan]);

    const handleTouchEnd = useCallback((e: React.TouchEvent) => {
        const start = touchStartRef.current;
        pinchStartDist.current = 0;
        panOriginRef.current = null;

        if (!start || zoomRef.current > 1) {
            touchStartRef.current = null;
            return;
        }

        const changedTouch = e.changedTouches[0];
        const dx = changedTouch.clientX - start.x;
        const dy = changedTouch.clientY - start.y;
        const elapsed = Date.now() - start.time;
        const isQuick = elapsed < 300;
        const isStill = Math.abs(dx) < 10 && Math.abs(dy) < 10;

        if (isStill && isQuick) {
            const now = Date.now();
            if (now - lastTapRef.current < DOUBLE_TAP_MS) {
                setZoom(2);
                lastTapRef.current = 0;
            } else {
                lastTapRef.current = now;
            }
        } else if (Math.abs(dx) > Math.abs(dy)) {
            if (dx < -SWIPE_THRESHOLD) handleNext();
            else if (dx > SWIPE_THRESHOLD) handlePrev();
        } else if (dy < -SWIPE_THRESHOLD) {
            // swipe up — nothing
        } else if (dy > SWIPE_THRESHOLD && images.length > 0) {
            onClose();
        }

        touchStartRef.current = null;
    }, [handleNext, handlePrev, onClose, images.length]);

    // ── Mouse wheel zoom ──────────────────────────────────────────────────────
    const handleWheel = useCallback((e: React.WheelEvent) => {
        if (!e.ctrlKey && !e.metaKey) return;
        e.preventDefault();
        const factor = e.deltaY < 0 ? 1.15 : 0.87;
        const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoomRef.current * factor));
        setZoom(newZoom);
        if (newZoom === 1) { setPanX(0); setPanY(0); }
    }, []);

    // ── Double-click zoom ─────────────────────────────────────────────────────
    const handleDoubleClick = useCallback(() => {
        if (zoomRef.current > 1) resetZoom();
        else setZoom(2);
    }, [resetZoom]);

    useEffect(() => {
        setImageError(false);
        setImageLoaded(false);
        resetZoom();
    }, [currentIndex, images, resetZoom]);

    useEffect(() => {
        if (images.length <= 1) return;
        const prev = (currentIndex - 1 + images.length) % images.length;
        const next = (currentIndex + 1) % images.length;
        [prev, next].forEach(idx => {
            const url = images[idx]?.url;
            if (url) {
                const img = new Image();
                img.src = optimizeCloudinaryUrl(url, { width: 1920, quality: 'auto' });
            }
        });
    }, [currentIndex, images]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') handleNext();
            else if (e.key === 'ArrowLeft') handlePrev();
            else if (e.key === 'Escape') { if (zoomRef.current > 1) resetZoom(); else onClose(); }
            else if (e.key === '+' || e.key === '=') setZoom(z => Math.min(MAX_ZOOM, z + 0.5));
            else if (e.key === '-') setZoom(z => { const n = Math.max(MIN_ZOOM, z - 0.5); if (n === 1) { setPanX(0); setPanY(0); } return n; });
            else if (e.key === '0') resetZoom();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [handleNext, handlePrev, onClose, resetZoom]);

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    if (images.length === 0) return null;

    const isZoomed = zoom > 1;

    return (
        <div
            className="fixed inset-0 bg-black z-[6000] flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-label={t('property:imageViewer.ariaLabel', 'Image viewer: {{current}} of {{total}}', { current: currentIndex + 1, total: images.length })}
        >
            {/* ── Top bar ── */}
            <div
                className="relative flex-shrink-0 flex items-center justify-between px-2 z-20"
                style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.5rem)', height: 'calc(env(safe-area-inset-top, 0px) + 3.5rem)' }}
            >
                {isZoomed ? (
                    <button
                        type="button"
                        onClick={resetZoom}
                        className="flex items-center gap-1.5 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 backdrop-blur-sm px-3 py-2 rounded-full text-xs font-medium transition-colors min-h-[44px]"
                        aria-label={t('property:imageViewer.resetZoom', 'Reset zoom')}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 11h4M11 9v4" />
                        </svg>
                        <span>{Math.round(zoom * 100)}%</span>
                    </button>
                ) : <div />}

                <button
                    type="button"
                    onClick={onClose}
                    className="ml-auto text-white/80 hover:text-white p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-colors"
                    aria-label={t('property:imageViewer.close', 'Close image viewer')}
                >
                    <XMarkIcon className="w-6 h-6" />
                </button>
            </div>

            {/* ── Image area ── */}
            <div
                className="relative flex-1 overflow-hidden flex items-center justify-center"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onWheel={handleWheel}
                style={{ touchAction: isZoomed ? 'none' : 'pan-y' }}
            >
                {/* Blurred LQIP backdrop */}
                {!imageError && (
                    <img
                        src={optimizeCloudinaryUrl(images[currentIndex].url, { width: 40, quality: 'auto:eco' })}
                        alt=""
                        aria-hidden="true"
                        className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110 opacity-40 pointer-events-none select-none"
                    />
                )}

                {/* Main image wrapper — zoom + pan applied here */}
                <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{
                        transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
                        transformOrigin: 'center center',
                        transition: pinchStartDist.current > 0 ? 'none' : 'transform 0.15s ease-out',
                        willChange: 'transform',
                        cursor: isZoomed ? 'grab' : 'zoom-in',
                    }}
                    onDoubleClick={handleDoubleClick}
                >
                    {imageError ? (
                        <div className="flex flex-col items-center justify-center text-white p-8">
                            <BuildingOfficeIcon className="w-20 h-20 text-neutral-500" />
                            <p className="mt-4 text-sm font-medium text-white/70">{t('property:imageViewer.loadError', 'Image could not be loaded')}</p>
                        </div>
                    ) : (
                        <img
                            key={images[currentIndex].url}
                            src={optimizeCloudinaryUrl(images[currentIndex].url, { width: 1920, quality: 'auto' })}
                            srcSet={cloudinarySrcSet(images[currentIndex].url, [640, 1024, 1440, 1920])}
                            sizes="100vw"
                            alt={t('property:imageViewer.imageAlt', 'Property image {{current}} of {{total}}', { current: currentIndex + 1, total: images.length })}
                            width={1920}
                            height={1280}
                            loading="eager"
                            decoding="async"
                            draggable={false}
                            className={`max-w-full max-h-full object-contain select-none transition-opacity duration-200 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                            style={{ userSelect: 'none', pointerEvents: 'none' }}
                            onLoad={() => setImageLoaded(true)}
                            onError={() => setImageError(true)}
                        />
                    )}
                </div>

                {/* Prev/Next — hidden when single image or zoomed */}
                {images.length > 1 && !isZoomed && (
                    <>
                        <button
                            type="button"
                            onClick={handlePrev}
                            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-black/50 backdrop-blur-sm p-3 rounded-full hover:bg-black/70 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                            aria-label={t('property:imageViewer.previous', 'Previous image')}
                        >
                            <ChevronLeftIcon className="w-6 h-6 text-white" />
                        </button>
                        <button
                            type="button"
                            onClick={handleNext}
                            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-black/50 backdrop-blur-sm p-3 rounded-full hover:bg-black/70 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                            aria-label={t('property:imageViewer.next', 'Next image')}
                        >
                            <ChevronRightIcon className="w-6 h-6 text-white" />
                        </button>
                    </>
                )}
            </div>

            {/* ── Bottom bar: counter ── */}
            <div
                className="flex-shrink-0 flex items-center justify-center z-20"
                style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)', height: 'calc(env(safe-area-inset-bottom, 0px) + 3rem)' }}
            >
                {images.length > 1 && (
                    <div
                        className="bg-black/50 backdrop-blur-sm text-white text-sm font-medium px-4 py-1.5 rounded-full"
                        role="status"
                        aria-live="polite"
                    >
                        {currentIndex + 1} / {images.length}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ImageViewerModal;
