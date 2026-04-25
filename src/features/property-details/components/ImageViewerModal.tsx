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

interface ImageDimensions {
    width: number;
    height: number;
}

const ImageViewerModal: React.FC<ImageViewerModalProps> = ({ images, startIndex, onClose }) => {
    const { t } = useTranslation(['property', 'common']);
    const [currentIndex, setCurrentIndex] = useState(startIndex);
    const [imageError, setImageError] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [zoom, setZoom] = useState(1);
    const [panX, setPanX] = useState(0);
    const [panY, setPanY] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [imageDimensions, setImageDimensions] = useState<ImageDimensions>({ width: 0, height: 0 });
    const [containerDimensions, setContainerDimensions] = useState<ImageDimensions>({ width: 0, height: 0 });
    const containerRef = useRef<HTMLDivElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);
    const touchDistanceRef = useRef(0);

    const handleNext = useCallback(() => {
        setCurrentIndex(prev => (prev + 1) % images.length);
        resetZoomAndPan();
    }, [images.length]);

    const handlePrev = useCallback(() => {
        setCurrentIndex(prev => (prev - 1 + images.length) % images.length);
        resetZoomAndPan();
    }, [images.length]);

    const resetZoomAndPan = useCallback(() => {
        setZoom(1);
        setPanX(0);
        setPanY(0);
    }, []);

    const swipeHandlers = useSwipeGesture({
        onSwipeLeft: handleNext,
        onSwipeRight: handlePrev,
        onSwipeDown: onClose,
    });

    useEffect(() => {
        setImageError(false);
        setImageLoaded(false);
    }, [currentIndex, images]);

    useEffect(() => {
        if (!containerRef.current) return;
        const updateDimensions = () => {
            setContainerDimensions({
                width: containerRef.current?.clientWidth || 0,
                height: containerRef.current?.clientHeight || 0,
            });
        };
        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    const calculateConstrainedPan = (newPanX: number, newPanY: number, currentZoom: number) => {
        if (currentZoom <= 1) return { x: 0, y: 0 };

        const scaledWidth = imageDimensions.width * currentZoom;
        const scaledHeight = imageDimensions.height * currentZoom;

        const maxPanX = Math.max(0, (scaledWidth - containerDimensions.width) / 2);
        const maxPanY = Math.max(0, (scaledHeight - containerDimensions.height) / 2);

        return {
            x: Math.max(-maxPanX, Math.min(maxPanX, newPanX)),
            y: Math.max(-maxPanY, Math.min(maxPanY, newPanY)),
        };
    };

    const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
        const img = e.currentTarget;
        setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
        setImageLoaded(true);
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        if (zoom <= 1) return;
        if ((e.target as HTMLElement)?.tagName === 'BUTTON') return;
        setIsDragging(true);
        setDragStart({ x: e.clientX - panX, y: e.clientY - panY });
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isDragging || zoom <= 1) return;
        const newPanX = e.clientX - dragStart.x;
        const newPanY = e.clientY - dragStart.y;
        const constrained = calculateConstrainedPan(newPanX, newPanY, zoom);
        setPanX(constrained.x);
        setPanY(constrained.y);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
        e.preventDefault();
        const newZoom = Math.max(1, Math.min(3, zoom - e.deltaY * 0.001));
        setZoom(newZoom);
        if (newZoom <= 1) {
            setPanX(0);
            setPanY(0);
        }
    };

    const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
        if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            touchDistanceRef.current = Math.hypot(dx, dy);
        } else if (e.touches.length === 1 && zoom > 1) {
            setIsDragging(true);
            setDragStart({
                x: e.touches[0].clientX - panX,
                y: e.touches[0].clientY - panY,
            });
        }
    };

    const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
        if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const newDistance = Math.hypot(dx, dy);
            if (touchDistanceRef.current > 0) {
                const zoomFactor = newDistance / touchDistanceRef.current;
                const newZoom = Math.max(1, Math.min(3, zoom * zoomFactor));
                setZoom(newZoom);
                if (newZoom <= 1) {
                    setPanX(0);
                    setPanY(0);
                }
            }
            touchDistanceRef.current = newDistance;
        } else if (isDragging && e.touches.length === 1 && zoom > 1) {
            const newPanX = e.touches[0].clientX - dragStart.x;
            const newPanY = e.touches[0].clientY - dragStart.y;
            const constrained = calculateConstrainedPan(newPanX, newPanY, zoom);
            setPanX(constrained.x);
            setPanY(constrained.y);
        }
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
        touchDistanceRef.current = 0;
    };

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
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                {...swipeHandlers}
                style={{
                    touchAction: zoom > 1 ? 'none' : 'pan-x',
                    cursor: zoom > 1 && isDragging ? 'grabbing' : zoom > 1 ? 'grab' : 'default'
                }}
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

                {/* Image container with panning/zooming */}
                <div
                    className="relative w-full h-full flex items-center justify-center z-[1]"
                    style={{
                        transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
                        transformOrigin: 'center',
                        transition: isDragging ? 'none' : 'transform 0.2s ease-out',
                    }}
                >
                    {imageError ? (
                        <div className="w-full h-full bg-gradient-to-br from-neutral-600 to-neutral-700 flex flex-col items-center justify-center text-white p-4 sm:p-6 md:p-8 rounded-lg">
                            <BuildingOfficeIcon className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 text-neutral-400" />
                            <p className="mt-3 sm:mt-4 font-semibold text-sm sm:text-base">{t('property:imageViewer.loadError', 'Image could not be loaded')}</p>
                        </div>
                    ) : (
                        <img
                            ref={imgRef}
                            key={images[currentIndex].url}
                            src={optimizeCloudinaryUrl(images[currentIndex].url, { width: 1920, quality: 'auto' })}
                            srcSet={cloudinarySrcSet(images[currentIndex].url, [640, 1024, 1440, 1920])}
                            sizes="100vw"
                            alt={t('property:imageViewer.imageAlt', 'Property image {{current}} of {{total}}', { current: currentIndex + 1, total: images.length })}
                            width={1920}
                            height={1280}
                            loading="eager"
                            decoding="async"
                            className={`w-full h-full object-contain select-none transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                            draggable={false}
                            onLoad={handleImageLoad}
                            onError={() => setImageError(true)}
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

                {/* Zoom indicator */}
                {zoom > 1 && (
                    <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm text-white text-sm font-medium px-3 py-1.5 rounded-full pointer-events-none z-10">
                        {Math.round(zoom * 100)}%
                    </div>
                )}
            </div>

            {/* Image counter - safe area aware */}
            <div
                className="absolute left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm text-white text-sm font-medium px-4 py-2 rounded-full"
                style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
                role="status"
                aria-live="polite"
            >
                {currentIndex + 1} / {images.length}
            </div>
        </div>
    );
};

export default ImageViewerModal;
