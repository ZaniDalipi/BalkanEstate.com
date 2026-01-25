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
  const [viewMode, setViewMode] = useState<'photos' | 'streetview' | 'video'>('photos');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [videoEnded, setVideoEnded] = useState(false);

  // Check if property has a video tour
  const hasVideo = !!property.tourUrl;

  // Start with video view if available, then fade to photos
  useEffect(() => {
    if (hasVideo && !videoEnded) {
      setViewMode('video');
      // Auto-transition to photos after 20 seconds if user hasn't interacted
      const timer = setTimeout(() => {
        setViewMode('photos');
        setVideoEnded(true);
      }, 20000);
      return () => clearTimeout(timer);
    }
  }, [hasVideo, videoEnded]);

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

    // TikTok URL patterns - extract video ID
    const tiktokMatch = url.match(/(?:tiktok\.com\/@[\w.-]+\/video\/|vm\.tiktok\.com\/)(\d+)/);
    if (tiktokMatch) {
      return {
        embedUrl: `https://www.tiktok.com/embed/v2/${tiktokMatch[1]}?autoplay=1`,
        platform: 'tiktok'
      };
    }

    // Instagram URL patterns - Reels or Posts
    const instagramReelMatch = url.match(/(?:instagram\.com\/(?:reel|p)\/)([A-Za-z0-9_-]+)/);
    if (instagramReelMatch) {
      return {
        embedUrl: `https://www.instagram.com/p/${instagramReelMatch[1]}/embed?autoplay=1`,
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
        ) : viewMode === 'video' && hasVideo ? (
          <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden">
            {/* Immersive mode for vertical videos (TikTok, Instagram, Facebook) */}
            {['tiktok', 'instagram', 'facebook'].includes(videoInfo.platform) ? (
              <>
                {/* Blurred background using property image */}
                <div
                  className="absolute inset-0 scale-110"
                  style={{
                    backgroundImage: `url(${property.imageUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    filter: 'blur(30px) brightness(0.4)',
                  }}
                />
                {/* Gradient overlay for HDR effect */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/40" />

                {/* Centered 9:16 vertical video container */}
                <div className="relative z-10 h-full flex items-center justify-center py-4">
                  <div
                    className="relative bg-black rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/20"
                    style={{
                      aspectRatio: '9/16',
                      height: '100%',
                      maxHeight: 'calc(100% - 32px)',
                    }}
                  >
                    <iframe
                      src={videoInfo.embedUrl}
                      className="w-full h-full border-0"
                      style={{
                        overflow: 'hidden',
                        pointerEvents: 'auto',
                      }}
                      scrolling="no"
                      allowFullScreen
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                      title="Property Video Tour"
                    />
                  </div>
                </div>
              </>
            ) : (
              /* Default horizontal format for YouTube/Vimeo */
              <iframe
                src={videoInfo.embedUrl}
                className="absolute inset-0 w-full h-full border-0"
                style={{ minHeight: '100%', minWidth: '100%' }}
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                title="Property Video Tour"
              />
            )}
            {/* Platform badge */}
            <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 bg-black/70 backdrop-blur-sm text-white font-semibold px-3 py-1.5 rounded-full text-xs">
              {videoInfo.platform === 'youtube' && (
                <svg className="w-4 h-4 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              )}
              {videoInfo.platform === 'tiktok' && (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                </svg>
              )}
              {videoInfo.platform === 'instagram' && (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              )}
              {videoInfo.platform === 'facebook' && (
                <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              )}
              {videoInfo.platform === 'vimeo' && (
                <svg className="w-4 h-4 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.977 6.416c-.105 2.338-1.739 5.543-4.894 9.609-3.268 4.247-6.026 6.37-8.29 6.37-1.409 0-2.578-1.294-3.553-3.881L5.322 11.4C4.603 8.816 3.834 7.522 3.01 7.522c-.179 0-.806.378-1.881 1.132L0 7.197c1.185-1.044 2.351-2.084 3.501-3.128C5.08 2.701 6.266 1.984 7.055 1.91c1.867-.18 3.016 1.1 3.447 3.838.465 2.953.789 4.789.971 5.507.539 2.45 1.131 3.674 1.776 3.674.502 0 1.256-.796 2.265-2.385 1.004-1.589 1.54-2.797 1.612-3.628.144-1.371-.395-2.061-1.614-2.061-.574 0-1.167.121-1.777.391 1.186-3.868 3.434-5.757 6.762-5.637 2.473.06 3.628 1.664 3.493 4.797l-.013.01z"/>
                </svg>
              )}
              <span className="capitalize">{t('property:gallery.videoTour', 'Video Tour')}</span>
            </div>
            {/* Skip to photos button */}
            <button
              onClick={() => {
                setViewMode('photos');
                setVideoEnded(true);
              }}
              className="absolute bottom-4 right-4 z-20 flex items-center gap-2 bg-white/90 backdrop-blur-sm text-neutral-800 font-medium px-4 py-2 rounded-full hover:bg-white transition-colors shadow-lg text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {t('property:gallery.viewPhotos', 'View Photos')}
            </button>
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
              onChange={(val) => setViewMode(val as 'photos' | 'streetview' | 'video')}
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
              onChange={(val) => setViewMode(val as 'photos' | 'streetview' | 'video')}
              size="md"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
