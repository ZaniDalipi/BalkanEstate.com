// PropertyGallery Component
// Image gallery with carousel, street view, and interactive controls

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Property, PropertyImageTag } from '../../../types';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PencilIcon,
  VideoCameraIcon,
  BuildingOfficeIcon,
  StreetViewIcon,
} from '../../../constants';
import { LiquidGlassSwitch } from '../ui/LiquidGlassSwitch';

interface PropertyGalleryProps {
  property: Property;
  onOpenEditor: (imageUrl: string) => void;
  onOpenViewer: () => void;
  // Controlled mode props
  activeCategory?: PropertyImageTag | 'all';
  currentImageIndex?: number;
  onCategoryChange?: (category: PropertyImageTag | 'all') => void;
  onImageIndexChange?: (index: number) => void;
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
  activeCategory: controlledCategory,
  currentImageIndex: controlledIndex,
  onCategoryChange,
  onImageIndexChange,
}) => {
  const { t } = useTranslation(['property']);

  // Internal state for uncontrolled mode
  const [internalCategory, setInternalCategory] = useState<PropertyImageTag | 'all'>('all');
  const [internalIndex, setInternalIndex] = useState(0);

  // Use controlled values if provided, otherwise use internal state
  const activeCategory = controlledCategory ?? internalCategory;
  const currentImageIndex = controlledIndex ?? internalIndex;

  // Update handlers that work in both modes
  const setActiveCategory = useCallback((category: PropertyImageTag | 'all') => {
    if (onCategoryChange) {
      onCategoryChange(category);
    } else {
      setInternalCategory(category);
    }
  }, [onCategoryChange]);

  const setCurrentImageIndex = useCallback((index: number | ((prev: number) => number)) => {
    if (onImageIndexChange) {
      if (typeof index === 'function') {
        // For function updates, we need the current value
        const newIndex = index(controlledIndex ?? internalIndex);
        onImageIndexChange(newIndex);
      } else {
        onImageIndexChange(index);
      }
    } else {
      setInternalIndex(index as number);
    }
  }, [onImageIndexChange, controlledIndex, internalIndex]);

  const [mainImageError, setMainImageError] = useState(false);
  const [viewMode, setViewMode] = useState<'photos' | 'streetview'>('photos');
  const [isFullscreen, setIsFullscreen] = useState(false);

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
    if (onImageIndexChange) {
      onImageIndexChange(0);
    } else {
      setInternalIndex(0);
    }
  }, [setActiveCategory, onImageIndexChange]);

  const handleNextImage = useCallback(() => {
    const newIndex = (currentImageIndex + 1) % imagesForCurrentCategory.length;
    if (onImageIndexChange) {
      onImageIndexChange(newIndex);
    } else {
      setInternalIndex(newIndex);
    }
  }, [currentImageIndex, imagesForCurrentCategory.length, onImageIndexChange]);

  const handlePrevImage = useCallback(() => {
    const newIndex = (currentImageIndex - 1 + imagesForCurrentCategory.length) % imagesForCurrentCategory.length;
    if (onImageIndexChange) {
      onImageIndexChange(newIndex);
    } else {
      setInternalIndex(newIndex);
    }
  }, [currentImageIndex, imagesForCurrentCategory.length, onImageIndexChange]);

  // Get category label for display
  const getCategoryEmoji = (category: PropertyImageTag | 'all'): string => {
    const emojiMap: Record<string, string> = {
      all: '📷',
      exterior: '🏠',
      interior: '🛋️',
      bedroom: '🛏️',
      bathroom: '🚿',
      kitchen: '🍳',
      living_room: '🛋️',
      garden: '🌳',
      pool: '🏊',
      view: '🌅',
      other: '📸',
    };
    return emojiMap[category] || '📷';
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-neutral-200 overflow-hidden">
      <div className="relative w-full h-[200px] xs:h-[250px] sm:h-[350px] md:h-[400px] lg:h-[450px] landscape:h-[50vh] landscape:min-h-[200px] bg-neutral-200">
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

        {/* 360 Tour Badge - Top Left */}
        {viewMode === 'photos' && property.virtualTour360Url && (
          <a
            href={property.virtualTour360Url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="absolute top-3 left-3 sm:top-4 sm:left-4 z-10 flex items-center gap-1 sm:gap-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold px-2 py-1 sm:px-3 sm:py-1.5 rounded-full hover:scale-105 transition-transform shadow-lg"
          >
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              <path d="M2 12h20" />
            </svg>
            <span className="text-[11px] sm:text-xs">360°</span>
          </a>
        )}

        {/* Action Buttons (Annotate, 3D Tour) - Horizontal on mobile, vertical on larger screens */}
        {viewMode === 'photos' && (
          <>
            <div className="absolute top-3 right-3 sm:top-4 sm:right-4 flex flex-row sm:flex-col items-center sm:items-end gap-2 sm:gap-2 z-10">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenEditor(currentImageUrl);
                }}
                className="flex items-center justify-center bg-white/90 backdrop-blur-sm text-neutral-800 rounded-full hover:scale-105 transition-transform shadow-md w-10 h-10 sm:w-auto sm:h-auto sm:gap-2 sm:px-4 sm:py-2"
              >
                <PencilIcon className="w-5 h-5 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline font-semibold text-sm">{t('actions.annotate')}</span>
              </button>

              {property.tourUrl && (
                <a
                  href={property.tourUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center justify-center bg-white/90 backdrop-blur-sm text-neutral-800 rounded-full hover:scale-105 transition-transform shadow-md w-10 h-10 sm:w-auto sm:h-auto sm:gap-2 sm:px-4 sm:py-2"
                >
                  <VideoCameraIcon className="w-5 h-5 sm:w-5 sm:h-5" />
                  <span className="hidden sm:inline font-semibold text-sm">{t('actions.tour3d')}</span>
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
                  className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-sm rounded-full hover:bg-white transition-colors shadow-md z-10 w-10 h-10 sm:w-10 sm:h-10 flex items-center justify-center"
                >
                  <ChevronLeftIcon className="w-5 h-5 sm:w-5 sm:h-5 text-neutral-800" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNextImage();
                  }}
                  className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-sm rounded-full hover:bg-white transition-colors shadow-md z-10 w-10 h-10 sm:w-10 sm:h-10 flex items-center justify-center"
                >
                  <ChevronRightIcon className="w-5 h-5 sm:w-5 sm:h-5 text-neutral-800" />
                </button>

                {/* Image Counter & Category Badge - Top left corner */}
                <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-10 flex flex-col gap-1.5" style={{ marginTop: property.virtualTour360Url ? '40px' : '0' }}>
                  {/* Category Badge - Shows when not viewing 'all' */}
                  {activeCategory !== 'all' && (
                    <div className="flex items-center gap-1.5 bg-primary/90 backdrop-blur-sm px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full shadow-lg animate-fade-in">
                      <span className="text-sm">{getCategoryEmoji(activeCategory)}</span>
                      <span className="text-white text-[11px] sm:text-xs font-semibold capitalize">
                        {t(`photos.categories.${activeCategory}`, { defaultValue: activeCategory.replace('_', ' ') })}
                      </span>
                    </div>
                  )}
                  {/* Image Counter */}
                  <div className="flex items-center bg-black/60 backdrop-blur-sm px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full">
                    <span className="text-white text-[11px] sm:text-xs font-medium whitespace-nowrap">
                      {currentImageIndex + 1} / {imagesForCurrentCategory.length}
                    </span>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* View Mode Toggle (Photos / Street View) - Liquid Glass Style */}
        <div className="absolute bottom-2 sm:bottom-3 left-1/2 -translate-x-1/2 z-10">
          <LiquidGlassSwitch
            options={[
              { value: 'photos', label: t('actions.photos') },
              {
                value: 'streetview',
                label: t('actions.streetView'),
                icon: <StreetViewIcon className="w-full h-full" />,
              },
            ]}
            value={viewMode}
            onChange={(val) => setViewMode(val as 'photos' | 'streetview')}
            size="sm"
          />
        </div>
      </div>
    </div>
  );
};
