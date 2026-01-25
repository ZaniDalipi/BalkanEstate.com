// PropertyGallery Component
// Image gallery with carousel, street view, video player, and interactive controls

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Property, PropertyImageTag } from '../../../types';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PencilIcon,
  VideoCameraIcon,
  BuildingOfficeIcon,
} from '../../../constants';
import { LiquidGlassSwitch } from '../ui/LiquidGlassSwitch';

interface PropertyGalleryProps {
  property: Property;
  onOpenEditor: (imageUrl: string) => void;
  onOpenViewer: () => void;
  onNavigateTo3DTour?: () => void;
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
  onNavigateTo3DTour,
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
  const [viewMode, setViewMode] = useState<'photos' | 'streetview' | 'video'>('photos');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [videoEnded, setVideoEnded] = useState(false);

  // Determine video platform
  const getVideoPlatform = useCallback((url: string): string => {
    if (!url) return 'unknown';
    if (url.includes('tiktok.com') || url.includes('vm.tiktok.com')) return 'tiktok';
    if (url.includes('instagram.com')) return 'instagram';
    if (url.includes('facebook.com') || url.includes('fb.watch')) return 'facebook';
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    if (url.includes('vimeo.com')) return 'vimeo';
    return 'unknown';
  }, []);

  const videoPlatform = useMemo(() => getVideoPlatform(property.tourUrl || ''), [property.tourUrl, getVideoPlatform]);

  // Only show video in gallery for YouTube/Vimeo (TikTok/Instagram/Facebook have separate section)
  const isEmbeddableVideo = ['youtube', 'vimeo'].includes(videoPlatform);
  const hasVideo = !!property.tourUrl && isEmbeddableVideo;

  // Start with video view if available (only for YouTube/Vimeo)
  useEffect(() => {
    if (hasVideo && !videoEnded) {
      setViewMode('video');
      // Auto-transition after 10 seconds
      const timer = setTimeout(() => {
        setViewMode('photos');
        setVideoEnded(true);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [hasVideo, videoEnded]);

  // Handle view mode change
  const handleViewModeChange = useCallback((val: string) => {
    setViewMode(val as 'photos' | 'streetview' | 'video');
  }, []);

  // Helper to convert video URLs to embed format (YouTube, Vimeo, TikTok, Instagram)
  const getVideoEmbedUrl = useCallback((url: string): { embedUrl: string; platform: string } => {
    if (!url) return { embedUrl: '', platform: 'unknown' };

    // YouTube URL patterns
    const youtubeMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (youtubeMatch) {
      return {
        embedUrl: `https://www.youtube.com/embed/${youtubeMatch[1]}?autoplay=1&rel=0&playsinline=1&enablejsapi=1`,
        platform: 'youtube'
      };
    }

    // Vimeo URL patterns
    const vimeoMatch = url.match(/(?:vimeo\.com\/)(\d+)/);
    if (vimeoMatch) {
      return {
        embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1&playsinline=1`,
        platform: 'vimeo'
      };
    }

    // TikTok URL patterns - extract video ID - use player format for cleaner embed
    const tiktokMatch = url.match(/(?:tiktok\.com\/@[\w.-]+\/video\/|vm\.tiktok\.com\/)(\d+)/);
    if (tiktokMatch) {
      return {
        embedUrl: `https://www.tiktok.com/player/v1/${tiktokMatch[1]}?music_info=0&description=0&autoplay=1&loop=1`,
        platform: 'tiktok'
      };
    }

    // Instagram URL patterns - Reels or Posts - use reel embed for cleaner display
    const instagramReelMatch = url.match(/(?:instagram\.com\/(?:reel|p)\/)([A-Za-z0-9_-]+)/);
    if (instagramReelMatch) {
      return {
        embedUrl: `https://www.instagram.com/reel/${instagramReelMatch[1]}/embed/captioned/?autoplay=1`,
        platform: 'instagram'
      };
    }

    // Facebook URL patterns - videos and watch
    const facebookVideoMatch = url.match(/(?:facebook\.com|fb\.watch)\/(?:watch\/?\?v=|.*\/videos\/|reel\/)(\d+)/);
    if (facebookVideoMatch) {
      return {
        embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false&autoplay=true`,
        platform: 'facebook'
      };
    }
    // Facebook watch format (fb.watch short links)
    const fbWatchMatch = url.match(/fb\.watch\/([A-Za-z0-9_-]+)/);
    if (fbWatchMatch) {
      return {
        embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false&autoplay=true`,
        platform: 'facebook'
      };
    }

    // Default - return original URL
    return { embedUrl: url, platform: 'other' };
  }, []);

  const videoInfo = useMemo(() => getVideoEmbedUrl(property.tourUrl || ''), [property.tourUrl, getVideoEmbedUrl]);

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
      <div className="relative w-full h-[200px] xs:h-[250px] sm:h-[350px] md:h-[400px] lg:h-[450px] landscape:h-[50vh] landscape:min-h-[200px] bg-black">
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
                className="w-full h-full object-contain bg-black animate-image-fade"
                onError={() => setMainImageError(true)}
              />
            )}
          </button>
        ) : viewMode === 'video' && hasVideo ? (
          // YouTube/Vimeo - Inline video player
          <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden">
              <iframe
                src={videoInfo.embedUrl}
                className="absolute inset-0 w-full h-full border-0"
                style={{ minHeight: '100%', minWidth: '100%' }}
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                title="Property Video Tour"
              />
              {/* Platform badge */}
              <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 bg-black/70 backdrop-blur-sm text-white font-semibold px-3 py-1.5 rounded-full text-xs">
                {videoInfo.platform === 'youtube' && (
                  <svg className="w-4 h-4 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                )}
                {videoInfo.platform === 'vimeo' && (
                  <svg className="w-4 h-4 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23.977 6.416c-.105 2.338-1.739 5.543-4.894 9.609-3.268 4.247-6.026 6.37-8.29 6.37-1.409 0-2.578-1.294-3.553-3.881L5.322 11.4C4.603 8.816 3.834 7.522 3.01 7.522c-.179 0-.806.378-1.881 1.132L0 7.197c1.185-1.044 2.351-2.084 3.501-3.128C5.08 2.701 6.266 1.984 7.055 1.91c1.867-.18 3.016 1.1 3.447 3.838.465 2.953.789 4.789.971 5.507.539 2.45 1.131 3.674 1.776 3.674.502 0 1.256-.796 2.265-2.385 1.004-1.589 1.54-2.797 1.612-3.628.144-1.371-.395-2.061-1.614-2.061-.574 0-1.167.121-1.777.391 1.186-3.868 3.434-5.757 6.762-5.637 2.473.06 3.628 1.664 3.493 4.797l-.013.01z"/>
                  </svg>
                )}
                <span className="capitalize">{t('property:gallery.videoTour', 'Video Tour')}</span>
              </div>
            </div>
        ) : viewMode === 'streetview' ? (
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
        ) : null}

        {/* 360 Tour Badge - Top Left - Shows after video ends */}
        {videoEnded && property.virtualTour360Url && viewMode === 'photos' && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onNavigateTo3DTour) {
                onNavigateTo3DTour();
              }
            }}
            className="absolute top-3 left-3 sm:top-4 sm:left-4 z-10 flex items-center gap-1.5 sm:gap-2 bg-gradient-to-r from-purple-600 to-pink-500 text-white font-semibold px-3 py-2 sm:px-4 sm:py-2.5 rounded-full hover:scale-105 active:scale-95 transition-all shadow-lg animate-pulse hover:animate-none"
          >
            <svg className="w-5 h-5 sm:w-5 sm:h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              <path d="M2 12h20" />
            </svg>
            <span className="text-xs sm:text-sm">{t('property:gallery.enter3DTour', 'Enter 3D Tour')}</span>
          </button>
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

        {/* View Mode Toggle (Video / Photos / Street View) - Liquid Glass Style */}
        <div className="absolute bottom-2 sm:bottom-3 left-1/2 -translate-x-1/2 z-10">
          {/* Mobile version - smaller */}
          <div className="sm:hidden">
            <LiquidGlassSwitch
              options={[
                // Video option (only if property has video)
                ...(hasVideo ? [{
                  value: 'video',
                  label: t('actions.video', 'Video'),
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                  ),
                }] : []),
                {
                  value: 'photos',
                  label: t('actions.photos'),
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="9" cy="9" r="2" />
                      <path d="M21 15l-3.086-3.086a2 2 0 00-2.828 0L6 21" />
                    </svg>
                  ),
                },
                {
                  value: 'streetview',
                  label: t('actions.streetView'),
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="5" r="3" />
                      <path d="M12 8v4" />
                      <path d="M8 21l4-9 4 9" />
                    </svg>
                  ),
                },
              ]}
              value={viewMode}
              onChange={handleViewModeChange}
              size="sm"
            />
          </div>
          {/* Desktop version - medium */}
          <div className="hidden sm:block">
            <LiquidGlassSwitch
              options={[
                // Video option (only if property has video)
                ...(hasVideo ? [{
                  value: 'video',
                  label: t('actions.video', 'Video'),
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                  ),
                }] : []),
                {
                  value: 'photos',
                  label: t('actions.photos'),
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="9" cy="9" r="2" />
                      <path d="M21 15l-3.086-3.086a2 2 0 00-2.828 0L6 21" />
                    </svg>
                  ),
                },
                {
                  value: 'streetview',
                  label: t('actions.streetView'),
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="5" r="3" />
                      <path d="M12 8v4" />
                      <path d="M8 21l4-9 4 9" />
                    </svg>
                  ),
                },
              ]}
              value={viewMode}
              onChange={handleViewModeChange}
              size="md"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
