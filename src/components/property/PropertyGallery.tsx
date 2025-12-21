// PropertyGallery Component
// Image gallery with carousel, street view, and interactive controls

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Property, PropertyImageTag } from '../../../types';
import { SharePopover } from './SharePopover';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PencilIcon,
  ShareIcon,
  VideoCameraIcon,
  BuildingOfficeIcon,
  StreetViewIcon,
} from '../../../constants';

interface PropertyGalleryProps {
  property: Property;
  onOpenEditor: (imageUrl: string) => void;
  onOpenViewer: () => void;
}

/**
 * PropertyGallery Component
 *
 * Features:
 * - Image carousel with category filtering
 * - Street View integration
 * - Fullscreen support
 * - Image annotation (opens editor)
 * - Social sharing
 * - 3D tour link
 * - Navigation controls
 *
 * Usage:
 * ```tsx
 * <PropertyGallery
 *   property={property}
 *   onOpenEditor={(url) => setEditorImage(url)}
 *   onOpenViewer={() => setViewerOpen(true)}
 * />
 * ```
 */
export const PropertyGallery: React.FC<PropertyGalleryProps> = ({
  property,
  onOpenEditor,
  onOpenViewer,
}) => {
  const [activeCategory, setActiveCategory] = useState<PropertyImageTag | 'all'>('all');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [mainImageError, setMainImageError] = useState(false);
  const [isSharePopoverOpen, setIsSharePopoverOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'photos' | 'streetview'>('photos');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const shareContainerRef = useRef<HTMLDivElement>(null);
  const streetViewRef = useRef<HTMLIFrameElement>(null);

  // Close share popover on outside click
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (shareContainerRef.current && !shareContainerRef.current.contains(event.target as Node)) {
        setIsSharePopoverOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Combine all images
  const allImages = useMemo(() => {
    const images = property.images || [];
    const mainImage = { url: property.imageUrl, tag: 'exterior' as PropertyImageTag };
    const combined = [mainImage, ...images];
    return combined.filter((v, i, a) => a.findIndex((t) => t.url === v.url) === i);
  }, [property.imageUrl, property.images]);

  // Categorize images by tag
  const categorizedImages = useMemo(() => {
    return allImages.reduce((acc, img) => {
      const tag = img.tag || 'other';
      if (!acc[tag]) {
        acc[tag] = [];
      }
      acc[tag].push(img);
      return acc;
    }, {} as Record<PropertyImageTag, { url: string; tag: PropertyImageTag }[]>);
  }, [allImages]);

  // Get images for current category
  const imagesForCurrentCategory = useMemo(() => {
    if (activeCategory === 'all') {
      return allImages;
    }
    return categorizedImages[activeCategory] || [];
  }, [activeCategory, allImages, categorizedImages]);

  const currentImageUrl = imagesForCurrentCategory[currentImageIndex]?.url || property.imageUrl;

  // Reset error state when image changes
  useEffect(() => {
    setMainImageError(false);
  }, [currentImageUrl]);

  const handleCategorySelect = useCallback((tag: PropertyImageTag | 'all') => {
    setActiveCategory(tag);
    setCurrentImageIndex(0);
  }, []);

  const handleNextImage = useCallback(() => {
    setCurrentImageIndex((prev) => (prev + 1) % imagesForCurrentCategory.length);
  }, [imagesForCurrentCategory.length]);

  const handlePrevImage = useCallback(() => {
    setCurrentImageIndex(
      (prev) => (prev - 1 + imagesForCurrentCategory.length) % imagesForCurrentCategory.length
    );
  }, [imagesForCurrentCategory.length]);

  return (
    <div className="bg-white rounded-xl shadow-lg border border-neutral-200 overflow-hidden">
      <div className="relative w-full h-[250px] sm:h-[400px] lg:h-[450px] bg-neutral-200">
        {viewMode === 'photos' ? (
          <button
            onClick={onOpenViewer}
            className="relative w-full h-full block focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-t-xl"
          >
            {mainImageError ? (
              <div className="w-full h-full bg-gradient-to-br from-neutral-200 to-neutral-300 flex items-center justify-center">
                <BuildingOfficeIcon className="w-24 h-24 text-neutral-400" />
              </div>
            ) : (
              <img
                key={currentImageUrl}
                src={currentImageUrl}
                alt={property.address}
                className="w-full h-full object-cover animate-image-fade"
                onError={() => setMainImageError(true)}
              />
            )}
          </button>
        ) : (
          <div className={`relative w-full h-full ${isFullscreen ? 'fixed inset-0 z-50 bg-black' : ''}`}>
            <iframe
              ref={streetViewRef}
              src={`https://www.google.com/maps?layer=c&cbll=${property.lat},${property.lng}&cbp=12,0,0,0,0&output=svembed`}
              className="w-full h-full border-0"
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
            {/* Fullscreen button for mobile */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm p-3 rounded-full shadow-lg hover:bg-white transition-colors z-10 md:hidden"
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              )}
            </button>
          </div>
        )}

        {/* Action Buttons (Annotate, Share, 3D Tour) */}
        {viewMode === 'photos' && (
          <>
            <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenEditor(currentImageUrl);
                }}
                className="flex items-center gap-2 bg-white/80 backdrop-blur-sm text-neutral-800 font-semibold px-4 py-2 rounded-full hover:scale-105 transition-transform shadow-md"
              >
                <PencilIcon className="w-5 h-5" />
                <span className="hidden sm:inline">Annotate</span>
              </button>

              <div className="relative" ref={shareContainerRef}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsSharePopoverOpen((prev) => !prev);
                  }}
                  className="flex items-center gap-2 bg-white/80 backdrop-blur-sm text-neutral-800 font-semibold px-4 py-2 rounded-full hover:scale-105 transition-transform shadow-md"
                >
                  <ShareIcon className="w-5 h-5" />
                  <span className="hidden sm:inline">Share</span>
                </button>
                {isSharePopoverOpen && (
                  <SharePopover property={property} onClose={() => setIsSharePopoverOpen(false)} />
                )}
              </div>

              {property.tourUrl && (
                <a
                  href={property.tourUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-2 bg-white/80 backdrop-blur-sm text-neutral-800 font-semibold px-4 py-2 rounded-full hover:scale-105 transition-transform shadow-md"
                >
                  <VideoCameraIcon className="w-5 h-5" />
                  <span className="hidden sm:inline">3D Tour</span>
                </a>
              )}

              {property.virtualTour360Url && (
                <a
                  href={property.virtualTour360Url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold px-4 py-2 rounded-full hover:scale-105 transition-transform shadow-md"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                    <path d="M2 12h20" />
                  </svg>
                  <span className="hidden sm:inline">360° Tour</span>
                </a>
              )}
            </div>

            {/* Navigation Controls */}
            {imagesForCurrentCategory.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrevImage();
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/70 backdrop-blur-sm p-2 rounded-full hover:bg-white transition-colors shadow-md z-10"
                >
                  <ChevronLeftIcon className="w-6 h-6 text-neutral-800" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNextImage();
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/70 backdrop-blur-sm p-2 rounded-full hover:bg-white transition-colors shadow-md z-10"
                >
                  <ChevronRightIcon className="w-6 h-6 text-neutral-800" />
                </button>

                {/* Image Indicators */}
                <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-full px-4 z-10">
                  <div className="flex items-center justify-center h-10">
                    <div className="flex items-center gap-2 bg-black/40 backdrop-blur-sm p-1.5 rounded-full">
                      {imagesForCurrentCategory.map((img, index) => (
                        <button
                          key={index}
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentImageIndex(index);
                          }}
                          className={`w-2 h-2 rounded-full transition-all duration-300 ${
                            index === currentImageIndex
                              ? 'bg-white scale-125'
                              : 'bg-white/50 hover:bg-white/75'
                          }`}
                          aria-label={`Go to image ${index + 1}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* View Mode Toggle (Photos / Street View) */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
          <div className="flex items-center gap-1 bg-white/80 backdrop-blur-sm p-1 rounded-full shadow-lg">
            <button
              onClick={() => setViewMode('photos')}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors flex items-center gap-2 ${
                viewMode === 'photos'
                  ? 'bg-primary text-white shadow'
                  : 'text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              Photos
            </button>
            <button
              onClick={() => setViewMode('streetview')}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors flex items-center gap-2 ${
                viewMode === 'streetview'
                  ? 'bg-primary text-white shadow'
                  : 'text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              <StreetViewIcon className="w-5 h-5" />
              Street View
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
