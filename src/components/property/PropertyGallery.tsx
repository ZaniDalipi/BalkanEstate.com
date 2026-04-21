// PropertyGallery Component
// Image gallery with carousel, street view, video player, and interactive controls

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Property, PropertyImageTag } from '../../../types';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PencilIcon,
  BuildingOfficeIcon,
} from '../../../constants';
import { LiquidGlassSwitch } from '../ui/LiquidGlassSwitch';
import { optimizeCloudinaryUrl, cloudinarySrcSet, getPropertyImagePlaceholder } from '../../../config/cloudinaryConfig';

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
  const [mainImageLoaded, setMainImageLoaded] = useState(false);
  const [viewMode, setViewMode] = useState<'photos' | 'streetview' | 'video'>('photos');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [videoEnded, setVideoEnded] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  // Determine video platform from URL
  const getVideoPlatform = useCallback((url: string): string => {
    if (!url) return 'unknown';
    if (url.includes('tiktok.com') || url.includes('vm.tiktok.com') || url.includes('m.tiktok.com')) return 'tiktok';
    if (url.includes('instagram.com')) return 'instagram';
    if (url.includes('facebook.com') || url.includes('fb.watch')) return 'facebook';
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    if (url.includes('vimeo.com')) return 'vimeo';
    return 'unknown';
  }, []);

  // Use tourUrl first, fall back to videoUrl for external video detection
  const externalVideoUrl = property.tourUrl || property.videoUrl || '';
  const videoPlatform = useMemo(() => getVideoPlatform(externalVideoUrl), [externalVideoUrl, getVideoPlatform]);

  // YouTube, Vimeo, Facebook, TikTok, and Instagram can be embedded via iframe
  // TikTok uses their official player embed: tiktok.com/player/v1/{videoId}
  // Instagram uses their /embed/ endpoint for reels and posts
  const isEmbeddableVideo = ['youtube', 'vimeo', 'facebook', 'tiktok', 'instagram'].includes(videoPlatform);
  const hasExternalVideo = !!externalVideoUrl && isEmbeddableVideo;

  // Check if property has an auto-generated video (from video generator)
  const hasGeneratedVideo = !!(property.hasGeneratedVideo && property.generatedVideoUrl);

  // Combine: show video if either generated or external video is available
  const hasVideo = hasGeneratedVideo || hasExternalVideo;

  // Start with generated video view if available (plays for 10 seconds)
  useEffect(() => {
    if (hasGeneratedVideo && !videoEnded) {
      setViewMode('video');
      // Auto-transition after 10 seconds for generated video
      const duration = Math.min(property.generatedVideoDuration || 10, 10);
      const timer = setTimeout(() => {
        setViewMode('photos');
        setVideoEnded(true);
      }, duration * 1000);
      return () => clearTimeout(timer);
    } else if (hasExternalVideo && !hasGeneratedVideo && !videoEnded) {
      // Fallback to external video if no generated video
      setViewMode('video');
      const timer = setTimeout(() => {
        setViewMode('photos');
        setVideoEnded(true);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [hasGeneratedVideo, hasExternalVideo, videoEnded, property.generatedVideoDuration]);

  // Handle view mode change
  const handleViewModeChange = useCallback((val: string) => {
    setViewMode(val as 'photos' | 'streetview' | 'video');
  }, []);

  // Helper to convert video URLs to embed format
  // Supports: YouTube, Vimeo, TikTok, Instagram, Facebook (all known URL variations)
  const getVideoEmbedUrl = useCallback((url: string): { embedUrl: string; platform: string } => {
    if (!url) return { embedUrl: '', platform: 'unknown' };

    // --- YouTube ---
    // watch?v=ID, watch?feature=share&v=ID (v= as first or later param)
    const ytParamMatch = url.match(/youtube\.com\/watch\?(?:.*&)?v=([a-zA-Z0-9_-]{11})/);
    if (ytParamMatch) {
      return { embedUrl: `https://www.youtube.com/embed/${ytParamMatch[1]}?autoplay=1&rel=0&playsinline=1&enablejsapi=1`, platform: 'youtube' };
    }
    // embed/ID, shorts/ID, v/ID (legacy), live/ID
    const ytPathMatch = url.match(/youtube\.com\/(?:embed|shorts|v|live)\/([a-zA-Z0-9_-]{11})/);
    if (ytPathMatch) {
      return { embedUrl: `https://www.youtube.com/embed/${ytPathMatch[1]}?autoplay=1&rel=0&playsinline=1&enablejsapi=1`, platform: 'youtube' };
    }
    // youtu.be/ID short links
    const ytShortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    if (ytShortMatch) {
      return { embedUrl: `https://www.youtube.com/embed/${ytShortMatch[1]}?autoplay=1&rel=0&playsinline=1&enablejsapi=1`, platform: 'youtube' };
    }

    // --- Vimeo ---
    // player.vimeo.com/video/ID (already an embed URL)
    const vimeoPlayerMatch = url.match(/player\.vimeo\.com\/video\/(\d+)/);
    if (vimeoPlayerMatch) {
      return { embedUrl: `https://player.vimeo.com/video/${vimeoPlayerMatch[1]}?autoplay=1&playsinline=1`, platform: 'vimeo' };
    }
    // vimeo.com/channels/xxx/ID, vimeo.com/groups/xxx/videos/ID, vimeo.com/manage/videos/ID
    const vimeoPathMatch = url.match(/vimeo\.com\/(?:channels\/[\w]+\/|groups\/[\w]+\/videos\/|manage\/videos\/)(\d+)/);
    if (vimeoPathMatch) {
      return { embedUrl: `https://player.vimeo.com/video/${vimeoPathMatch[1]}?autoplay=1&playsinline=1`, platform: 'vimeo' };
    }
    // vimeo.com/ID (standard - must be after path-based matches to avoid false positives)
    const vimeoStdMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoStdMatch) {
      return { embedUrl: `https://player.vimeo.com/video/${vimeoStdMatch[1]}?autoplay=1&playsinline=1`, platform: 'vimeo' };
    }

    // --- TikTok ---
    // tiktok.com/@username/video/ID (full URL)
    const tiktokFullMatch = url.match(/tiktok\.com\/@[\w.-]+\/video\/(\d+)/);
    if (tiktokFullMatch) {
      return { embedUrl: `https://www.tiktok.com/player/v1/${tiktokFullMatch[1]}?music_info=0&description=0&autoplay=1&loop=1`, platform: 'tiktok' };
    }
    // m.tiktok.com/v/ID (mobile URL)
    const tiktokMobileMatch = url.match(/m\.tiktok\.com\/v\/(\d+)/);
    if (tiktokMobileMatch) {
      return { embedUrl: `https://www.tiktok.com/player/v1/${tiktokMobileMatch[1]}?music_info=0&description=0&autoplay=1&loop=1`, platform: 'tiktok' };
    }
    // vm.tiktok.com/CODE/ (short URL - alphanumeric)
    const tiktokVmMatch = url.match(/vm\.tiktok\.com\/([\w]+)/);
    if (tiktokVmMatch) {
      return { embedUrl: `https://www.tiktok.com/player/v1/${tiktokVmMatch[1]}?music_info=0&description=0&autoplay=1&loop=1`, platform: 'tiktok' };
    }
    // tiktok.com/t/CODE/ (another short URL format)
    const tiktokTMatch = url.match(/tiktok\.com\/t\/([\w]+)/);
    if (tiktokTMatch) {
      return { embedUrl: `https://www.tiktok.com/player/v1/${tiktokTMatch[1]}?music_info=0&description=0&autoplay=1&loop=1`, platform: 'tiktok' };
    }

    // --- Instagram ---
    // instagram.com/reel/CODE, /p/CODE, /tv/CODE (IGTV)
    const instagramMatch = url.match(/instagram\.com\/(reel|p|tv)\/([A-Za-z0-9_-]+)/);
    if (instagramMatch) {
      return { embedUrl: `https://www.instagram.com/${instagramMatch[1]}/${instagramMatch[2]}/embed/`, platform: 'instagram' };
    }

    // --- Facebook ---
    // facebook.com/video.php?v=ID (legacy)
    const fbVideoPhpMatch = url.match(/facebook\.com\/video\.php\?v=(\d+)/);
    if (fbVideoPhpMatch) {
      return { embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false&autoplay=true`, platform: 'facebook' };
    }
    // facebook.com/share/v/CODE/ (share links)
    const fbShareMatch = url.match(/facebook\.com\/share\/v\/([A-Za-z0-9_-]+)/);
    if (fbShareMatch) {
      return { embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false&autoplay=true`, platform: 'facebook' };
    }
    // facebook.com/watch/?v=ID, /videos/ID, /reel/ID
    const fbVideoMatch = url.match(/facebook\.com\/(?:watch\/?\?v=|[\w.]+\/videos\/|reel\/)(\d+)/);
    if (fbVideoMatch) {
      return { embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false&autoplay=true`, platform: 'facebook' };
    }
    // fb.watch/CODE/ (short links)
    const fbWatchMatch = url.match(/fb\.watch\/([A-Za-z0-9_-]+)/);
    if (fbWatchMatch) {
      return { embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false&autoplay=true`, platform: 'facebook' };
    }

    // Default - return original URL
    return { embedUrl: url, platform: 'other' };
  }, []);

  const videoInfo = useMemo(() => getVideoEmbedUrl(externalVideoUrl), [externalVideoUrl, getVideoEmbedUrl]);

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

  // Reset error/loaded state when image changes
  useEffect(() => {
    setMainImageError(false);
    setMainImageLoaded(false);
  }, [currentImageUrl]);

  // Preload adjacent images so navigation feels instant
  useEffect(() => {
    if (imagesForCurrentCategory.length <= 1) return;
    const prevIndex = (currentImageIndex - 1 + imagesForCurrentCategory.length) % imagesForCurrentCategory.length;
    const nextIndex = (currentImageIndex + 1) % imagesForCurrentCategory.length;
    [prevIndex, nextIndex].forEach((idx) => {
      const url = imagesForCurrentCategory[idx]?.url;
      if (url) {
        const img = new Image();
        img.src = optimizeCloudinaryUrl(url, { width: 1200, quality: 'auto' });
      }
    });
  }, [currentImageIndex, imagesForCurrentCategory]);

  const handleCategorySelect = useCallback((tag: PropertyImageTag | 'all') => {
    setActiveCategory(tag);
    if (onImageIndexChange) {
      onImageIndexChange(0);
    } else {
      setInternalIndex(0);
    }
  }, [setActiveCategory, onImageIndexChange]);

  const slideDirectionRef = useRef<'left' | 'right' | null>(null);

  const handleNextImage = useCallback(() => {
    slideDirectionRef.current = 'left';
    const newIndex = (currentImageIndex + 1) % imagesForCurrentCategory.length;
    if (onImageIndexChange) {
      onImageIndexChange(newIndex);
    } else {
      setInternalIndex(newIndex);
    }
  }, [currentImageIndex, imagesForCurrentCategory.length, onImageIndexChange]);

  const handlePrevImage = useCallback(() => {
    slideDirectionRef.current = 'right';
    const newIndex = (currentImageIndex - 1 + imagesForCurrentCategory.length) % imagesForCurrentCategory.length;
    if (onImageIndexChange) {
      onImageIndexChange(newIndex);
    } else {
      setInternalIndex(newIndex);
    }
  }, [currentImageIndex, imagesForCurrentCategory.length, onImageIndexChange]);

  const handleDotNav = useCallback((index: number) => {
    slideDirectionRef.current = index > currentImageIndex ? 'left' : 'right';
    if (onImageIndexChange) {
      onImageIndexChange(index);
    } else {
      setInternalIndex(index);
    }
  }, [currentImageIndex, onImageIndexChange]);

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
    <div className="overflow-hidden sm:bg-white sm:rounded-xl sm:shadow-lg sm:border sm:border-neutral-200">
      <div
        className="relative w-full aspect-video sm:aspect-auto sm:h-[420px] md:h-[500px] lg:h-[560px] landscape:h-[60vh] landscape:min-h-[280px] bg-neutral-900 overflow-hidden"
      >
        {viewMode === 'photos' ? (
          <motion.button
            onClick={onOpenViewer}
            drag={imagesForCurrentCategory.length > 1 ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.22}
            dragMomentum={false}
            whileTap={{ scale: 0.98 }}
            onDragEnd={(_, info) => {
              if (info.offset.x < -60) handleNextImage();
              else if (info.offset.x > 60) handlePrevImage();
            }}
            className="relative w-full h-full flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-t-xl overflow-hidden"
            style={{ touchAction: 'pan-y', cursor: 'pointer' }}
          >
            {mainImageError ? (
              <div className="w-full h-full bg-gradient-to-br from-neutral-200 to-neutral-300 flex items-center justify-center">
                <BuildingOfficeIcon className="w-24 h-24 text-neutral-400" />
              </div>
            ) : (
              <>
                {/* LQIP blur-up placeholder – fades as sharp image loads */}
                <motion.img
                  src={getPropertyImagePlaceholder(currentImageUrl) || optimizeCloudinaryUrl(currentImageUrl, { width: 40, quality: 'auto:eco' })}
                  alt=""
                  aria-hidden="true"
                  animate={{ opacity: mainImageLoaded ? 0.15 : 0.65 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110 will-change-opacity"
                />
                {/* Main sharp image – slides + fades in once loaded */}
                <motion.img
                  key={currentImageUrl}
                  src={optimizeCloudinaryUrl(currentImageUrl, { width: 1200, quality: 'auto' })}
                  srcSet={cloudinarySrcSet(currentImageUrl, [480, 768, 1200, 1920])}
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 1200px"
                  alt={`${property.propertyType ? property.propertyType.charAt(0).toUpperCase() + property.propertyType.slice(1) : 'Property'} for ${property.listingType === 'rent' ? 'rent' : 'sale'} in ${property.city}, ${property.country} - ${property.address}`}
                  width={1200}
                  height={800}
                  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                  // @ts-ignore fetchpriority is a valid HTML perf hint not yet in all TS lib defs
                  fetchpriority="high"
                  decoding="async"
                  initial={{
                    x: slideDirectionRef.current === 'left' ? '5%' : slideDirectionRef.current === 'right' ? '-5%' : 0,
                    opacity: 0,
                    scale: 1.04,
                  }}
                  animate={mainImageLoaded
                    ? { x: 0, opacity: 1, scale: 1 }
                    : {
                        x: slideDirectionRef.current === 'left' ? '5%' : slideDirectionRef.current === 'right' ? '-5%' : 0,
                        opacity: 0,
                        scale: 1.04,
                      }
                  }
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  className="absolute inset-0 w-full h-full object-contain will-change-transform"
                  onLoad={() => setMainImageLoaded(true)}
                  onError={() => setMainImageError(true)}
                />
              </>
            )}
          </motion.button>
        ) : viewMode === 'video' && hasVideo ? (
          // Video player - supports both generated videos (mp4) and external embeds
          <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden">
            {/* Generated video (direct mp4 playback) */}
            {hasGeneratedVideo ? (
              <>
                <video
                  ref={videoRef}
                  src={property.generatedVideoUrl}
                  autoPlay
                  muted={isMuted}
                  playsInline
                  loop={false}
                  className="w-full h-full object-contain"
                  onEnded={() => {
                    setViewMode('photos');
                    setVideoEnded(true);
                  }}
                />
                {/* Generated video badge */}
                <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 bg-gradient-to-r from-primary to-primary-dark backdrop-blur-sm text-white font-semibold px-3 py-1.5 rounded-full text-xs">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span>{t('property:gallery.propertyShowcase', 'Property Showcase')}</span>
                </div>
                {/* Sound toggle button */}
                <button
                  onClick={() => {
                    setIsMuted(!isMuted);
                    if (videoRef.current) {
                      videoRef.current.muted = !isMuted;
                    }
                  }}
                  className="absolute top-3 right-3 z-20 flex items-center justify-center w-10 h-10 bg-black/60 backdrop-blur-sm text-white rounded-full hover:bg-black/80 transition-colors"
                  title={isMuted ? t('property:gallery.unmute') : t('property:gallery.mute')}
                >
                  {isMuted ? (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                  )}
                </button>
                {/* Skip button */}
                <button
                  onClick={() => {
                    setViewMode('photos');
                    setVideoEnded(true);
                  }}
                  className="absolute bottom-16 right-3 z-20 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm text-neutral-800 font-medium px-3 py-1.5 rounded-full text-xs hover:bg-white transition-colors"
                >
                  {t('property:gallery.skipVideo', 'Skip Video')}
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            ) : (
              <>
                {/* External video player for YouTube, Vimeo, Facebook */}
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
                  {videoInfo.platform === 'tiktok' && (
                    <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                    </svg>
                  )}
                  {videoInfo.platform === 'instagram' && (
                    <svg className="w-4 h-4 text-pink-500" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                  )}
                  {videoInfo.platform === 'facebook' && (
                    <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  )}
                  <span className="capitalize">{t('property:gallery.videoTour', 'Video Tour')}</span>
                </div>
              </>
            )}
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
              title={isFullscreen ? t('property:gallery.exitFullscreen') : t('property:gallery.fullscreen')}
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
            className="absolute top-3 left-3 sm:top-4 sm:left-4 z-10 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-500 text-white font-semibold rounded-full hover:scale-105 active:scale-95 transition-all shadow-lg animate-pulse hover:animate-none w-9 h-9 sm:w-auto sm:h-auto sm:px-4 sm:py-2.5"
          >
            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              <path d="M2 12h20" />
            </svg>
            <span className="hidden sm:inline text-sm">{t('property:gallery.enter3DTour', 'Enter 3D Tour')}</span>
          </button>
        )}

        {/* Action Buttons (Annotate, 3D Tour) - Horizontal on mobile, vertical on larger screens */}
        {viewMode === 'photos' && (
          <>
            <div className="absolute top-3 right-3 sm:top-4 sm:right-4 flex flex-row sm:flex-col items-center sm:items-end gap-2 sm:gap-2 z-10">
              <motion.button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenEditor(currentImageUrl);
                }}
                whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,255,255,1)' }}
                whileTap={{ scale: 0.92 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="flex items-center justify-center bg-white/90 backdrop-blur-sm text-neutral-800 rounded-full shadow-md w-10 h-10 sm:w-auto sm:h-auto sm:gap-2 sm:px-4 sm:py-2"
              >
                <PencilIcon className="w-5 h-5 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline font-semibold text-sm">{t('actions.annotate')}</span>
              </motion.button>

            </div>

            {/* Navigation Controls */}
            {imagesForCurrentCategory.length > 1 && (
              <>
                <motion.button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrevImage();
                  }}
                  whileHover={{ scale: 1.08, backgroundColor: 'rgba(255,255,255,0.95)' }}
                  whileTap={{ scale: 0.92 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 bg-white/75 backdrop-blur-sm rounded-full shadow-md z-10 w-9 h-9 sm:w-11 sm:h-11 flex items-center justify-center"
                  aria-label="Previous image"
                >
                  <ChevronLeftIcon className="w-4 h-4 sm:w-5 sm:h-5 text-neutral-800" />
                </motion.button>
                <motion.button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNextImage();
                  }}
                  whileHover={{ scale: 1.08, backgroundColor: 'rgba(255,255,255,0.95)' }}
                  whileTap={{ scale: 0.92 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 bg-white/75 backdrop-blur-sm rounded-full shadow-md z-10 w-9 h-9 sm:w-11 sm:h-11 flex items-center justify-center"
                  aria-label="Next image"
                >
                  <ChevronRightIcon className="w-4 h-4 sm:w-5 sm:h-5 text-neutral-800" />
                </motion.button>

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
                  <div className="flex items-center bg-black/60 backdrop-blur-sm px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full" role="status" aria-live="polite">
                    <span className="text-white text-[11px] sm:text-xs font-medium whitespace-nowrap">
                      {currentImageIndex + 1} / {imagesForCurrentCategory.length}
                    </span>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* Building Floor Overlay - Shows apartment position in building */}
        {viewMode === 'photos' && property.propertyType === 'apartment' && property.floorNumber && property.totalFloors && property.totalFloors > 1 && (
          <>
            {/* Mobile: compact floor pill */}
            <div className="sm:hidden absolute bottom-[2.6rem] left-2 z-10 animate-fade-in">
              <div className="flex items-center gap-1 bg-slate-900/80 backdrop-blur-sm px-2 py-1 rounded-lg">
                <svg className="w-3 h-3 text-green-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="1" />
                  <path d="M3 9h18M3 15h18M9 3v18" />
                </svg>
                <span className="text-green-400 text-[11px] font-bold leading-none">{property.floorNumber}/{property.totalFloors}</span>
              </div>
            </div>
            {/* Desktop: full building visualization */}
            <div className="hidden sm:block absolute bottom-[calc(3rem-1px)] left-3 z-10 animate-fade-in">
            <div className="bg-slate-900/85 backdrop-blur-sm rounded-xl shadow-lg border border-slate-700/50 overflow-hidden w-[60px]">
              {/* Building visualization */}
              <div className="relative px-2 sm:px-2.5 pt-2 sm:pt-2.5 pb-1">
                {/* Roof */}
                <div className="mx-auto w-0 h-0 border-l-[14px] sm:border-l-[16px] border-r-[14px] sm:border-r-[16px] border-b-[6px] sm:border-b-[7px] border-l-transparent border-r-transparent border-b-slate-600 mb-px" />
                {/* Building outline */}
                <div
                  className="relative mx-auto w-7 sm:w-8 rounded-b-sm overflow-hidden border border-slate-600/80 bg-slate-800/60"
                  style={{ height: `${Math.min(Math.max(property.totalFloors * 7, 35), 80)}px` }}
                >
                  {Array.from({ length: property.totalFloors }).map((_, i) => {
                    const floor = property.totalFloors! - i;
                    const isHighlighted = floor === property.floorNumber;
                    return (
                      <div
                        key={floor}
                        className="absolute left-0 right-0 border-b border-slate-700/40"
                        style={{
                          height: `${100 / property.totalFloors!}%`,
                          top: `${(i / property.totalFloors!) * 100}%`,
                          background: isHighlighted
                            ? 'linear-gradient(90deg, rgba(34, 197, 94, 0.9), rgba(22, 163, 74, 0.9))'
                            : 'transparent',
                          boxShadow: isHighlighted ? '0 0 6px rgba(34, 197, 94, 0.5)' : 'none',
                        }}
                      >
                        {isHighlighted && (
                          <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-green-400/20 to-emerald-400/20" />
                        )}
                      </div>
                    );
                  })}
                  {/* Window dots for non-highlighted floors */}
                  {property.totalFloors <= 12 && Array.from({ length: property.totalFloors }).map((_, i) => {
                    const floor = property.totalFloors! - i;
                    if (floor === property.floorNumber) return null;
                    return (
                      <div
                        key={`win-${floor}`}
                        className="absolute left-1/2 -translate-x-1/2 flex gap-0.5"
                        style={{
                          top: `${((i + 0.35) / property.totalFloors!) * 100}%`,
                        }}
                      >
                        <div className="w-1 h-0.5 bg-slate-600/60 rounded-[0.5px]" />
                        <div className="w-1 h-0.5 bg-slate-600/60 rounded-[0.5px]" />
                      </div>
                    );
                  })}
                </div>
                {/* Ground */}
                <div className="w-9 sm:w-10 h-0.5 mx-auto bg-slate-600 rounded-b" />
              </div>
              {/* Floor label */}
              <div className="px-1 py-1 text-center border-t border-slate-700/50">
                <div className="text-[10px] sm:text-xs font-bold text-green-400 leading-none">
                  {property.floorNumber}/{property.totalFloors}
                </div>
                <div className="text-[7px] sm:text-[8px] text-slate-400 leading-tight mt-0.5">
                  {t('property:gallery.floor', 'floor')}
                </div>
              </div>
            </div>
            </div>
          </>
        )}

        {/* Property Type & Listing Chip - Bottom right overlay */}
        {viewMode === 'photos' && property.propertyType && (
          <div className="absolute bottom-2 sm:bottom-3 right-2 sm:right-3 z-10 flex items-center gap-1.5 animate-fade-in">
            <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-xl backdrop-saturate-150 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-full border border-white/25 shadow-[0_4px_20px_rgba(0,0,0,0.15)]">
              {property.propertyType === 'apartment' && (
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                </svg>
              )}
              {property.propertyType === 'house' && (
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                </svg>
              )}
              {property.propertyType === 'villa' && (
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3L2 12h3v8h6v-5h2v5h6v-8h3L12 3z" />
                </svg>
              )}
              {property.propertyType === 'land' && (
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
                </svg>
              )}
              {!['apartment', 'house', 'villa', 'land'].includes(property.propertyType) && (
                <BuildingOfficeIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/90" />
              )}
              <span className="text-white text-[11px] sm:text-xs font-semibold capitalize">
                {t(`property:propertyTypes.${property.propertyType}`, property.propertyType)}
              </span>
              <span className="w-px h-3 bg-white/30" />
              <span className={`text-[11px] sm:text-xs font-bold ${
                property.listingType === 'rent' ? 'text-blue-300' : 'text-emerald-300'
              }`}>
                {property.listingType === 'rent' ? t('property:gallery.forRent', 'Rent') : t('property:gallery.forSale', 'Sale')}
              </span>
            </div>
          </div>
        )}

        {/* Progress scrubber bar – Zillow-style interactive progress */}
        {viewMode === 'photos' && imagesForCurrentCategory.length > 1 && (
          <motion.div
            className="absolute bottom-[3.2rem] sm:bottom-[3.5rem] left-0 right-0 h-1 bg-white/20 backdrop-blur-sm z-10 cursor-pointer group"
            onClick={(e) => {
              const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
              const percent = (e.clientX - rect.left) / rect.width;
              const index = Math.min(Math.floor(percent * imagesForCurrentCategory.length), imagesForCurrentCategory.length - 1);
              handleDotNav(index);
            }}
            whileHover={{ height: 4 }}
            transition={{ duration: 0.15 }}
          >
            {/* Filled progress bar */}
            <motion.div
              className="absolute left-0 top-0 h-full bg-gradient-to-r from-blue-400 to-blue-500 shadow-lg"
              animate={{ width: `${((currentImageIndex + 1) / imagesForCurrentCategory.length) * 100}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
            {/* Progress dots on track */}
            <div className="absolute top-0 h-full w-full flex">
              {imagesForCurrentCategory.map((_, i) => (
                <div
                  key={i}
                  className="flex-1 h-full flex items-center justify-center"
                >
                  <motion.div
                    animate={{
                      scale: i === currentImageIndex ? 1.3 : 0.6,
                      opacity: i === currentImageIndex ? 1 : 0.4,
                    }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="w-1.5 h-1.5 rounded-full bg-white"
                  />
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* View Mode Toggle (Video / Photos / Street View) - Compact Action Buttons Style */}
        <div className="absolute bottom-2 sm:bottom-3 left-1/2 -translate-x-1/2 z-10">
          <div className="flex items-center gap-2 sm:gap-3 px-2">
            {/* Photos button */}
            <motion.button
              onClick={() => handleViewModeChange('photos')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full font-semibold text-sm sm:text-base transition-all ${
                viewMode === 'photos'
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'bg-white/90 backdrop-blur-sm text-neutral-800 hover:bg-white'
              }`}
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="M21 15l-3.086-3.086a2 2 0 00-2.828 0L6 21" />
              </svg>
              <span className="hidden sm:inline">{t('actions.photos')}</span>
            </motion.button>

            {/* Video button */}
            {hasVideo && (
              <motion.button
                onClick={() => handleViewModeChange('video')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full font-semibold text-sm sm:text-base transition-all ${
                  viewMode === 'video'
                    ? 'bg-blue-500 text-white shadow-lg'
                    : 'bg-white/90 backdrop-blur-sm text-neutral-800 hover:bg-white'
                }`}
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                <span className="hidden sm:inline">{t('actions.video', 'Video')}</span>
              </motion.button>
            )}

            {/* Street View button */}
            <motion.button
              onClick={() => handleViewModeChange('streetview')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full font-semibold text-sm sm:text-base transition-all ${
                viewMode === 'streetview'
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'bg-white/90 backdrop-blur-sm text-neutral-800 hover:bg-white'
              }`}
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="5" r="3" />
                <path d="M12 8v4" />
                <path d="M8 21l4-9 4 9" />
              </svg>
              <span className="hidden sm:inline">{t('actions.streetView')}</span>
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
};
