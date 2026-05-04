import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeftIcon, ChevronRightIcon, XMarkIcon, BuildingOfficeIcon } from '@/constants';
import { optimizeCloudinaryUrl, cloudinarySrcSet } from '@/config/cloudinaryConfig';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';

interface ImageViewerModalProps {
    images: { url: string; tag: string }[];
    startIndex: number;
    onClose: () => void;
}

const ImageViewerModal: React.FC<ImageViewerModalProps> = ({ images, startIndex, onClose }) => {
    const { t } = useTranslation(['property', 'common']);
    const [currentIndex, setCurrentIndex] = useState(startIndex);
    const [imageError, setImageError] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [zoom, setZoom] = useState(1);
    const [panX, setPanX] = useState(0);
    const [panY, setPanY] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const touchStartDistance = useRef(0);
    const touchStartZoom = useRef(1);
    const panStartX = useRef(0);
    const panStartY = useRef(0);

    const resetZoom = useCallback(() => {
        setZoom(1);
        setPanX(0);
        setPanY(0);
    }, []);

    const handleNext = useCallback(() => {
        resetZoom();
        setCurrentIndex(prev => (prev + 1) % images.length);
    }, [images.length, resetZoom]);

    const handlePrev = useCallback(() => {
        resetZoom();
        setCurrentIndex(prev => (prev - 1 + images.length) % images.length);
    }, [images.length, resetZoom]);

    const swipeHandlers = useSwipeGesture({
        onSwipeLeft: zoom === 1 ? handleNext : undefined,
        onSwipeRight: zoom === 1 ? handlePrev : undefined,
        onSwipeDown: zoom === 1 ? onClose : undefined,
    });

    const getDistance = (touch1: Touch, touch2: Touch) => {
        const dx = touch1.clientX - touch2.clientX;
        const dy = touch1.clientY - touch2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        if (e.touches.length === 2) {
            touchStartDistance.current = getDistance(e.touches[0], e.touches[1]);
            touchStartZoom.current = zoom;
        } else if (e.touches.length === 1 && zoom > 1) {
            panStartX.current = e.touches[0].clientX - panX;
            panStartY.current = e.touches[0].clientY - panY;
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (e.touches.length === 2 && touchStartDistance.current > 0) {
            const currentDistance = getDistance(e.touches[0], e.touches[1]);
            const newZoom = Math.max(1, Math.min(4, touchStartZoom.current * (currentDistance / touchStartDistance.current)));
            setZoom(newZoom);
            e.preventDefault();
        } else if (e.touches.length === 1 && zoom > 1) {
            const newPanX = e.touches[0].clientX - panStartX.current;
            const newPanY = e.touches[0].clientY - panStartY.current;
            const maxPan = (zoom - 1) * 100;
            setPanX(Math.max(-maxPan, Math.min(maxPan, newPanX)));
            setPanY(Math.max(-maxPan, Math.min(maxPan, newPanY)));
        }
    };

    const handleTouchEnd = () => {
        touchStartDistance.current = 0;
        touchStartZoom.current = 1;
    };

    const handleWheel = (e: React.WheelEvent) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const delta = -e.deltaY > 0 ? 1.1 : 0.9;
            const newZoom = Math.max(1, Math.min(4, zoom * delta));
            setZoom(newZoom);
        }
    };

    const handleDoubleClick = () => {
        if (zoom > 1) {
            resetZoom();
        } else {
            setZoom(2);
        }
    };

    useEffect(() => {
        setImageError(false);
        setImageLoaded(false);
        resetZoom();
    }, [currentIndex, images, resetZoom]);

    // Preload adjacent images so navigation feels instant
    useEffect(() => {
        if (images.length <= 1) return;
        const prevIndex = (currentIndex - 1 + images.length) % images.length;
        const nextIndex = (currentIndex + 1) % images.length;
        [prevIndex, nextIndex].forEach((idx) => {
            const url = images[idx]?.url;
            if (url) {
                const img = new Image();
                img.src = optimizeCloudinaryUrl(url, { width: 1920, quality: 'auto' });
            }
        });
    }, [currentIndex, images]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') handleNext();
            if (e.key === 'ArrowLeft') handlePrev();
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [handleNext, handlePrev, onClose]);

    // Lock body scroll
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = 'unset'; };
    }, []);

    if (images.length === 0) return null;

    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black/95 z-[6000] flex flex-col items-center justify-center"
            onClick={handleBackdropClick}
            role="dialog"
            aria-modal="true"
            aria-label={t('property:imageViewer.ariaLabel', 'Image viewer: {{current}} of {{total}}', { current: currentIndex + 1, total: images.length })}
            style={{ paddingTop: 'env(safe-area-inset-top, 1rem)', paddingBottom: 'env(safe-area-inset-bottom, 1rem)', paddingLeft: 'env(safe-area-inset-left, 1rem)', paddingRight: 'env(safe-area-inset-right, 1rem)' }}
        >
            {/* Close button - 44px min touch target */}
            <button
                type="button"
                onClick={onClose}
                className="absolute top-2 right-2 text-white/80 hover:text-white z-20 p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-black/30 backdrop-blur-sm hover:bg-black/50 transition-colors"
                style={{ top: 'calc(env(safe-area-inset-top, 0px) + 0.5rem)', right: 'calc(env(safe-area-inset-right, 0px) + 0.5rem)' }}
                aria-label={t('property:imageViewer.close', 'Close image viewer')}
            >
                <XMarkIcon className="w-6 h-6 sm:w-7 sm:h-7" />
            </button>

            <div
                ref={containerRef}
                className="relative w-full h-full flex items-center justify-center overflow-hidden"
                {...swipeHandlers}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onWheel={handleWheel}
                style={{ touchAction: zoom > 1 ? 'none' : 'pan-x' }}
            >
                {/* Blurred background – fills black bars for any aspect ratio */}
                {!imageError && (
                    <img
                        src={optimizeCloudinaryUrl(images[currentIndex].url, { width: 40, quality: 'auto:eco' })}
                        alt=""
                        aria-hidden="true"
                        className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110 opacity-60 pointer-events-none select-none"
                    />
                )}

                {/* Image */}
                <div className="relative w-full h-full flex items-center justify-center z-[1]" style={{
                    transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
                    transformOrigin: 'center',
                    transition: zoom === touchStartZoom.current ? 'none' : 'transform 0.2s ease-out',
                }}>
                    {imageError ? (
                        <div className="max-w-full max-h-full w-full h-full bg-gradient-to-br from-neutral-600 to-neutral-700 flex flex-col items-center justify-center text-white p-4 sm:p-6 md:p-8 rounded-lg">
                            <BuildingOfficeIcon className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 text-neutral-400" />
                            <p className="mt-3 sm:mt-4 font-semibold text-sm sm:text-base">{t('property:imageViewer.loadError', 'Image could not be loaded')}</p>
                        </div>
                    ) : (
                        <img
                            ref={imageRef}
                            key={images[currentIndex].url}
                            src={optimizeCloudinaryUrl(images[currentIndex].url, { width: 1920, quality: 'auto' })}
                            srcSet={cloudinarySrcSet(images[currentIndex].url, [640, 1024, 1440, 1920])}
                            sizes="100vw"
                            alt={t('property:imageViewer.imageAlt', 'Property image {{current}} of {{total}}', { current: currentIndex + 1, total: images.length })}
                            width={1920}
                            height={1280}
                            loading="eager"
                            decoding="async"
                            className={`max-w-full max-h-full object-contain select-none transition-opacity duration-300 cursor-zoom-in ${imageLoaded ? 'opacity-100' : 'opacity-0'} ${zoom > 1 ? 'cursor-grab active:cursor-grabbing' : ''}`}
                            draggable={false}
                            onLoad={() => setImageLoaded(true)}
                            onError={() => setImageError(true)}
                            onDoubleClick={handleDoubleClick}
                            style={{ userSelect: 'none' }}
                        />
                    )}
                </div>

                {/* Previous button */}
                <button
                    type="button"
                    onClick={handlePrev}
                    className="absolute left-1 sm:left-3 top-1/2 -translate-y-1/2 bg-black/40 backdrop-blur-sm p-2.5 sm:p-3 rounded-full hover:bg-black/60 active:bg-black/70 transition-colors z-10 min-w-[44px] min-h-[44px] flex items-center justify-center"
                    aria-label={t('property:imageViewer.previous', 'Previous image ({{current}} of {{total}})', { current: ((currentIndex - 1 + images.length) % images.length) + 1, total: images.length })}
                >
                    <ChevronLeftIcon className="w-6 h-6 sm:w-7 sm:h-7 text-white"/>
                </button>

                {/* Next button */}
                <button
                    type="button"
                    onClick={handleNext}
                    className="absolute right-1 sm:right-3 top-1/2 -translate-y-1/2 bg-black/40 backdrop-blur-sm p-2.5 sm:p-3 rounded-full hover:bg-black/60 active:bg-black/70 transition-colors z-10 min-w-[44px] min-h-[44px] flex items-center justify-center"
                    aria-label={t('property:imageViewer.next', 'Next image ({{current}} of {{total}})', { current: (currentIndex + 1) % images.length + 1, total: images.length })}
                >
                    <ChevronRightIcon className="w-6 h-6 sm:w-7 sm:h-7 text-white"/>
                </button>
            </div>

            {/* Zoom reset button - only show when zoomed */}
            {zoom > 1 && (
                <button
                    type="button"
                    onClick={resetZoom}
                    className="absolute top-2 left-2 text-white/80 hover:text-white z-20 p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-black/30 backdrop-blur-sm hover:bg-black/50 transition-colors"
                    style={{ top: 'calc(env(safe-area-inset-top, 0px) + 0.5rem)', left: 'calc(env(safe-area-inset-left, 0px) + 0.5rem)' }}
                    aria-label={t('property:imageViewer.resetZoom', 'Reset zoom')}
                    title="Reset zoom"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </button>
            )}

            {/* Image counter + zoom level - safe area aware */}
            <div
                className="absolute left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm text-white text-sm font-medium px-4 py-2 rounded-full"
                style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
                role="status"
                aria-live="polite"
            >
                <span className="mr-2">{currentIndex + 1} / {images.length}</span>
                {zoom > 1 && <span className="text-xs text-white/70">({Math.round(zoom * 100)}%)</span>}
            </div>

            {/* Zoom hint on desktop */}
            {zoom === 1 && images.length > 0 && (
                <div
                    className="absolute bottom-3 right-3 text-white/50 text-xs pointer-events-none hidden sm:block"
                    style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 4.5rem)' }}
                >
                    💡 Scroll to zoom · Double-click
                </div>
            )}
        </div>
    );
};

export default ImageViewerModal;
