import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, XMarkIcon, BuildingOfficeIcon } from '@/constants';
import { optimizeCloudinaryUrl, cloudinarySrcSet } from '@/config/cloudinaryConfig';

interface ImageViewerModalProps {
    images: { url: string; tag: string }[];
    startIndex: number;
    onClose: () => void;
}

const ImageViewerModal: React.FC<ImageViewerModalProps> = ({ images, startIndex, onClose }) => {
    const [currentIndex, setCurrentIndex] = useState(startIndex);
    const [imageError, setImageError] = useState(false);
    const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
    const [touchMove, setTouchMove] = useState<{ x: number; y: number } | null>(null);

    const minSwipeDistance = 50; // pixels

    const handleNext = useCallback(() => {
        setCurrentIndex(prev => (prev + 1) % images.length);
    }, [images.length]);

    const handlePrev = useCallback(() => {
        setCurrentIndex(prev => (prev - 1 + images.length) % images.length);
    }, [images.length]);

    useEffect(() => {
        setImageError(false);
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

    const onTouchStart = (e: React.TouchEvent) => {
        setTouchMove(null);
        setTouchStart({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
    };

    const onTouchMove = (e: React.TouchEvent) => {
        setTouchMove({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
    };

    const onTouchEnd = () => {
        if (!touchStart || !touchMove) return;

        const xDistance = touchStart.x - touchMove.x;
        const yDistance = touchStart.y - touchMove.y;

        // Horizontal swipe
        if (Math.abs(xDistance) > Math.abs(yDistance)) {
            const isLeftSwipe = xDistance > minSwipeDistance;
            const isRightSwipe = xDistance < -minSwipeDistance;

            if (isLeftSwipe) handleNext();
            else if (isRightSwipe) handlePrev();
        }
        // Vertical swipe
        else {
            const isDownSwipe = yDistance < -minSwipeDistance;
            if (isDownSwipe) onClose();
        }

        setTouchStart(null);
        setTouchMove(null);
    };

    return (
        <div
            className="fixed inset-0 bg-black/95 z-[6000] flex flex-col items-center justify-center"
            onClick={handleBackdropClick}
            role="dialog"
            aria-modal="true"
            aria-label={`Image viewer: ${currentIndex + 1} of ${images.length}`}
            style={{ paddingTop: 'env(safe-area-inset-top, 1rem)', paddingBottom: 'env(safe-area-inset-bottom, 1rem)', paddingLeft: 'env(safe-area-inset-left, 1rem)', paddingRight: 'env(safe-area-inset-right, 1rem)' }}
        >
            {/* Close button - 44px min touch target */}
            <button
                type="button"
                onClick={onClose}
                className="absolute top-2 right-2 text-white/80 hover:text-white z-20 p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-black/30 backdrop-blur-sm hover:bg-black/50 transition-colors"
                style={{ top: 'calc(env(safe-area-inset-top, 0px) + 0.5rem)', right: 'calc(env(safe-area-inset-right, 0px) + 0.5rem)' }}
                aria-label="Close image viewer"
            >
                <XMarkIcon className="w-6 h-6 sm:w-7 sm:h-7" />
            </button>

            <div
                className="relative w-full h-full flex items-center justify-center overflow-hidden"
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
            >
                {/* Previous button - 44px min touch target */}
                <button
                    type="button"
                    onClick={handlePrev}
                    className="absolute left-1 sm:left-3 top-1/2 -translate-y-1/2 bg-white/20 backdrop-blur-sm p-2.5 sm:p-3 rounded-full hover:bg-white/40 active:bg-white/50 transition-colors z-10 min-w-[44px] min-h-[44px] flex items-center justify-center"
                    aria-label={`Previous image (${((currentIndex - 1 + images.length) % images.length) + 1} of ${images.length})`}
                >
                    <ChevronLeftIcon className="w-6 h-6 sm:w-7 sm:h-7 text-white"/>
                </button>

                <div className="w-full h-full flex items-center justify-center overflow-hidden px-12 sm:px-16">
                    {imageError ? (
                        <div className="max-w-full max-h-full w-full h-full bg-gradient-to-br from-neutral-600 to-neutral-700 flex flex-col items-center justify-center text-white p-4 sm:p-6 md:p-8 rounded-lg">
                            <BuildingOfficeIcon className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 text-neutral-400" />
                            <p className="mt-3 sm:mt-4 font-semibold text-sm sm:text-base">Image could not be loaded</p>
                        </div>
                    ) : (
                        <img
                            key={images[currentIndex].url}
                            src={optimizeCloudinaryUrl(images[currentIndex].url, { width: 1920, quality: 'auto' })}
                            srcSet={cloudinarySrcSet(images[currentIndex].url, [640, 1024, 1440, 1920])}
                            sizes="100vw"
                            alt={`Property image ${currentIndex + 1} of ${images.length}`}
                            width={1920}
                            height={1280}
                            className="max-w-full max-h-full object-contain animate-fade-in select-none"
                            draggable={false}
                            onError={() => setImageError(true)}
                        />
                    )}
                </div>

                {/* Next button - 44px min touch target */}
                <button
                    type="button"
                    onClick={handleNext}
                    className="absolute right-1 sm:right-3 top-1/2 -translate-y-1/2 bg-white/20 backdrop-blur-sm p-2.5 sm:p-3 rounded-full hover:bg-white/40 active:bg-white/50 transition-colors z-10 min-w-[44px] min-h-[44px] flex items-center justify-center"
                    aria-label={`Next image (${(currentIndex + 1) % images.length + 1} of ${images.length})`}
                >
                    <ChevronRightIcon className="w-6 h-6 sm:w-7 sm:h-7 text-white"/>
                </button>
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
