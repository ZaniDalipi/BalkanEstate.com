import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, XMarkIcon, BuildingOfficeIcon } from '../../../constants';

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
        <div className="fixed inset-0 bg-black/90 z-[6000] flex flex-col items-center justify-center p-4" onClick={handleBackdropClick}>
            <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white z-20">
                <XMarkIcon className="w-8 h-8" />
            </button>
            
            <div
                className="relative w-full sm:w-[90vw] md:w-[85vw] lg:w-[80vw] h-full sm:h-[85vh] md:h-[80vh] flex items-center justify-center overflow-hidden"
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
            >
                <button onClick={handlePrev} className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 bg-white/20 backdrop-blur-sm p-2 sm:p-3 rounded-full hover:bg-white/40 transition-colors z-10">
                    <ChevronLeftIcon className="w-6 h-6 sm:w-8 sm:h-8 text-white"/>
                </button>

                <div className="w-full h-full flex items-center justify-center overflow-hidden">
                    {imageError ? (
                        <div className="max-w-full max-h-full w-full h-full bg-gradient-to-br from-neutral-600 to-neutral-700 flex flex-col items-center justify-center text-white p-4 sm:p-6 md:p-8 rounded-lg">
                            <BuildingOfficeIcon className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 text-neutral-400" />
                            <p className="mt-3 sm:mt-4 font-semibold text-sm sm:text-base">Image could not be loaded</p>
                        </div>
                    ) : (
                        <img
                            key={images[currentIndex].url}
                            src={images[currentIndex].url}
                            alt={`Property view ${currentIndex + 1}`}
                            className="max-w-full max-h-full object-contain animate-fade-in"
                            onError={() => setImageError(true)}
                        />
                    )}
                </div>

                <button onClick={handleNext} className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 bg-white/20 backdrop-blur-sm p-2 sm:p-3 rounded-full hover:bg-white/40 transition-colors z-10">
                    <ChevronRightIcon className="w-6 h-6 sm:w-8 sm:h-8 text-white"/>
                </button>
            </div>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white text-sm px-3 py-1.5 rounded-full">
                {currentIndex + 1} / {images.length}
            </div>
        </div>
    );
};

export default ImageViewerModal;