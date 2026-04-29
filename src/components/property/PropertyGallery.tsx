// PropertyGallery Component
// Image gallery with carousel, street view, video player, and interactive controls

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Property, PropertyImageTag } from '../../../types';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  BuildingOfficeIcon,
} from '../../../constants';
import { optimizeCloudinaryUrl, cloudinarySrcSet, getPropertyImagePlaceholder } from '../../../config/cloudinaryConfig';
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
  isFavorited?: boolean;
  onFavoriteClick?: () => void;
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
// Zillow-style crossfade between images: pure opacity, with a tiny direction-aware
// x-drift so swiping forward/back still feels intentional but doesn't dominate.
const imageSlideVariants = {
  enter: (dir: number) => ({
    opacity: 0,
    x: dir > 0 ? '2%' : '-2%',
  }),
  center: {
    opacity: 1,
    x: '0%',
  },
  exit: (dir: number) => ({
    opacity: 0,
    x: dir > 0 ? '-1%' : '1%',
  }),
};

// Ken Burns: image is pre-scaled 1.2× so it overflows the container by 10%
// on each side — object-cover fills edge-to-edge, no grey bars ever.
// Pan uses that 10% buffer; ±8% x / ±5% y stays safely within it.
const KEN_BURNS_DURATION = 20;
const KB_SCALE = 1.2;

const KB_PRESETS = [
  { initial: { x: '8%',  y: '5%'  }, animate: { x: '-8%', y: '-5%' } },
  { initial: { x: '-8%', y: '-5%' }, animate: { x: '8%',  y: '5%'  } },
  { initial: { x: '8%',  y: '-5%' }, animate: { x: '-8%', y: '5%'  } },
  { initial: { x: '-8%', y: '5%'  }, animate: { x: '8%',  y: '-5%' } },
] as const;

export const PropertyGallery: React.FC<PropertyGalleryProps> = ({
  property,
  onOpenEditor,
  onOpenViewer,
  onNavigateTo3DTour,
  activeCategory: controlledCategory,
  currentImageIndex: controlledIndex,
  onCategoryChange,
  onImageIndexChange,
  isFavorited = false,
  onFavoriteClick,
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

  useEffect(() => {
    setMainImageError(false);
  }, [currentImageUrl]);

  // Eagerly preload first 4 images when the listing opens so swipes feel instant
  useEffect(() => {
    imagesForCurrentCategory.slice(1, 5).forEach((item) => {
      const el = new Image();
      el.src = optimizeCloudinaryUrl(item.url, { width: 1200, quality: 'auto' });
    });
  }, [imagesForCurrentCategory]);

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

  // 1 = forward/next, -1 = backward/prev
  const [slideDirection, setSlideDirection] = useState(1);

  const handleNextImage = useCallback(() => {
    setSlideDirection(1);
    const newIndex = (currentImageIndex + 1) % imagesForCurrentCategory.length;
    if (onImageIndexChange) {
      onImageIndexChange(newIndex);
    } else {
      setInternalIndex(newIndex);
    }
  }, [currentImageIndex, imagesForCurrentCategory.length, onImageIndexChange]);

  // Auto-rotate every 5 s in photos mode; resets whenever the user manually navigates
  // (handleNextImage recreates on index change, which restarts the interval)
  useEffect(() => {
    if (viewMode !== 'photos' || imagesForCurrentCategory.length <= 1) return;
    const timer = setInterval(handleNextImage, 5000);
    return () => clearInterval(timer);
  }, [viewMode, imagesForCurrentCategory.length, handleNextImage]);

  const handlePrevImage = useCallback(() => {
    setSlideDirection(-1);
    const newIndex = (currentImageIndex - 1 + imagesForCurrentCategory.length) % imagesForCurrentCategory.length;
    if (onImageIndexChange) {
      onImageIndexChange(newIndex);
    } else {
      setInternalIndex(newIndex);
    }
  }, [currentImageIndex, imagesForCurrentCategory.length, onImageIndexChange]);

  const handleDotNav = useCallback((index: number) => {
    setSlideDirection(index > currentImageIndex ? 1 : -1);
    if (onImageIndexChange) {
      onImageIndexChange(index);
    } else {
      setInternalIndex(index);
    }
  }, [currentImageIndex, onImageIndexChange]);

  return (
    <div className="overflow-hidden shadow-sm border-b border-neutral-200">
      {/* ── Gallery frame — fixed 16:9 aspect ratio (Zillow standard). Landscape photos
           fill edge-to-edge via object-cover; portrait photos are preserved with object-contain
           and a blurred LQIP backdrop on the side bars. ── */}
      <div
        className="relative w-full bg-neutral-900 overflow-hidden aspect-[16/9]"
        style={{
          maxHeight: '75vh',
          minHeight: '360px',
        }}
      >

        {/* ── PHOTOS ── */}
        {viewMode === 'photos' && (
          <motion.button
            onClick={onOpenViewer}
            drag={imagesForCurrentCategory.length > 1 ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.08}
            dragMomentum={false}
            onDragEnd={(_, info) => {
              if (info.offset.x < -50) handleNextImage();
              else if (info.offset.x > 50) handlePrevImage();
            }}
            className="absolute inset-0 focus:outline-none cursor-pointer overflow-hidden"
            style={{ touchAction: 'pan-y' }}
            aria-label={t('property:gallery.viewImages', 'View property images')}
          >
            {mainImageError ? (
              <div className="w-full h-full bg-gradient-to-br from-neutral-700 to-neutral-800 flex items-center justify-center">
                <BuildingOfficeIcon className="w-20 h-20 text-neutral-500" />
              </div>
            ) : (
              <>
                {/* LQIP blurred background — fills letterbox bars on desktop object-contain */}
                <img
                  src={getPropertyImagePlaceholder(currentImageUrl) || optimizeCloudinaryUrl(currentImageUrl, { width: 40, quality: 'auto:eco' })}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 w-full h-full object-cover blur-3xl scale-110 pointer-events-none select-none"
                />

                {/* AnimatePresence at the outer level so exit animations complete before unmount */}
                <AnimatePresence initial={false} custom={slideDirection}>
                  <motion.div
                    key={currentImageUrl}
                    className="absolute inset-0"
                    custom={slideDirection}
                    variants={imageSlideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{
                      opacity: { duration: 0.6, ease: 'easeInOut' },
                      x: { duration: 0.6, ease: 'easeOut' },
                    }}
                  >
                    {(() => {
                      const kb = KB_PRESETS[currentImageIndex % KB_PRESETS.length];
                      return (
                        <motion.div
                          className="absolute inset-0"
                          initial={{ scale: KB_SCALE, x: kb.initial.x, y: kb.initial.y }}
                          animate={{ scale: KB_SCALE, x: kb.animate.x, y: kb.animate.y }}
                          transition={{ duration: KEN_BURNS_DURATION, ease: 'linear' }}
                          style={{ willChange: 'transform' }}
                        >
                          <img
                            src={optimizeCloudinaryUrl(currentImageUrl, { width: 1200, quality: 'auto' })}
                            srcSet={cloudinarySrcSet(currentImageUrl, [480, 768, 1200, 1920])}
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 1200px"
                            alt={`${property.propertyType ? property.propertyType.charAt(0).toUpperCase() + property.propertyType.slice(1) : 'Property'} in ${property.city}, ${property.country}`}
                            width={1200}
                            height={800}
                            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                            // @ts-ignore fetchpriority is a valid HTML perf hint not yet in all TS lib defs
                            fetchpriority={currentImageIndex === 0 ? 'high' : 'auto'}
                            decoding="async"
                            loading={currentImageIndex === 0 ? 'eager' : 'lazy'}
                            className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
                            draggable={false}
                            onError={() => setMainImageError(true)}
                          />
                        </motion.div>
                      );
                    })()}
                  </motion.div>
                </AnimatePresence>
              </>
            )}
          </motion.button>
        )}

        {/* ── VIDEO ── */}
        {viewMode === 'video' && hasVideo ? (
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

        {/* ── OVERLAYS (photos mode only) ── */}
        {viewMode === 'photos' && (
          <>
            {/* 3D Tour badge – top-left */}
            {videoEnded && property.virtualTour360Url && (
              <button
                onClick={(e) => { e.stopPropagation(); onNavigateTo3DTour?.(); }}
                className="absolute top-3 left-3 z-10 flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-pink-500 text-white text-xs font-semibold rounded-full px-3 py-1.5 shadow-lg hover:scale-105 active:scale-95 transition-all animate-pulse hover:animate-none"
              >
                <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  <path d="M2 12h20" />
                </svg>
                <span>{t('property:gallery.enter3DTour', 'Enter 3D Tour')}</span>
              </button>
            )}

            {/* Favorite button */}
            {onFavoriteClick && (
              <motion.button
                onClick={(e) => { e.stopPropagation(); onFavoriteClick(); }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.92 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="absolute top-4 right-4 z-10 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full shadow-md flex items-center justify-center"
                aria-label={isFavorited ? t('property:actions.removeFavorite', 'Remove from favorites') : t('property:actions.addFavorite', 'Add to favorites')}
              >
                <svg
                  className={`w-5 h-5 transition-colors ${isFavorited ? 'text-red-500 fill-current' : 'text-neutral-600'}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </motion.button>
            )}

            {/* Nav arrows – outer edges */}
            {imagesForCurrentCategory.length > 1 && (
              <>
                <motion.button
                  onClick={(e) => { e.stopPropagation(); handlePrevImage(); }}
                  whileHover={{ scale: 1.08, backgroundColor: 'rgba(255,255,255,0.95)' }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-11 h-11 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center"
                  aria-label={t('property:gallery.prevImage', 'Previous image')}
                >
                  <ChevronLeftIcon className="w-5 h-5 text-neutral-800" />
                </motion.button>
                <motion.button
                  onClick={(e) => { e.stopPropagation(); handleNextImage(); }}
                  whileHover={{ scale: 1.08, backgroundColor: 'rgba(255,255,255,0.95)' }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-11 h-11 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center"
                  aria-label={t('property:gallery.nextImage', 'Next image')}
                >
                  <ChevronRightIcon className="w-5 h-5 text-neutral-800" />
                </motion.button>
              </>
            )}

            {/* Mobile-only bottom badge: type | sale/rent */}
            <div className="sm:hidden absolute bottom-3 right-3 z-[3] flex items-center gap-1.5 bg-black/70 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1.5 rounded-full pointer-events-none">
              {property.propertyType && (
                <>
                  <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                  </svg>
                  <span className="capitalize">{t(`property:propertyTypes.${property.propertyType}`, property.propertyType)}</span>
                  <span className="opacity-50">|</span>
                </>
              )}
              <span className={property.listingType === 'rent' ? 'text-blue-300' : 'text-emerald-400'}>
                {property.listingType === 'rent' ? t('property:gallery.forRent', 'Rent') : t('property:gallery.forSale', 'Sale')}
              </span>
            </div>

            {/* Right-side gradient overlay with property info — desktop only */}
            <div
              className="hidden sm:flex absolute inset-0 z-[2] pointer-events-none items-center justify-end"
              style={{ background: 'linear-gradient(to left, rgba(5,15,50,0.96) 0%, rgba(5,15,50,0.85) 20%, rgba(5,15,50,0.5) 42%, rgba(5,15,50,0.08) 62%, transparent 78%)' }}
            >
              <div className="w-[46%] sm:w-[42%] pr-6 sm:pr-10 pl-4 py-6">
                {(property.title || property.address) && (
                  <h2 className="text-white font-bold text-xl sm:text-2xl lg:text-3xl leading-tight mb-2 drop-shadow-lg">
                    {property.title || property.address}
                  </h2>
                )}
                {(property.city || property.country) && (
                  <div className="flex items-center gap-1.5 text-white/80 text-sm mb-3">
                    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                    </svg>
                    <span>{[property.city, property.country].filter(Boolean).join(', ')}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 flex-wrap mb-3">
                  {property.propertyType && (
                    <span className="flex items-center gap-1 bg-white/15 backdrop-blur-sm border border-white/20 text-white text-xs font-semibold px-2.5 py-1 rounded-full capitalize">
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                      </svg>
                      {t(`property:propertyTypes.${property.propertyType}`, property.propertyType)}
                    </span>
                  )}
                  {property.beds ? (
                    <span className="bg-white/15 backdrop-blur-sm border border-white/20 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                      {property.beds} {t('property:specs.beds', 'Beds')}
                    </span>
                  ) : null}
                  {property.baths ? (
                    <span className="bg-white/15 backdrop-blur-sm border border-white/20 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                      {property.baths} {t('property:specs.baths', 'Baths')}
                    </span>
                  ) : null}
                  {property.sqft ? (
                    <span className="bg-white/15 backdrop-blur-sm border border-white/20 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                      {property.sqft} m²
                    </span>
                  ) : null}
                </div>
                {property.price ? (
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-white font-bold text-2xl sm:text-3xl drop-shadow-lg">
                      € {property.price.toLocaleString()}{property.listingType === 'rent' ? t('property:seo.perMonth', '/mo') : ''}
                    </span>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full flex-shrink-0 ${
                      property.listingType === 'rent' ? 'bg-blue-500 text-white' : 'bg-emerald-500 text-white'
                    }`}>
                      {property.listingType === 'rent' ? t('property:gallery.forRent', 'For Rent') : t('property:gallery.forSale', 'For Sale')}
                    </span>
                  </div>
                ) : null}
                {imagesForCurrentCategory.length > 1 && (
                  <div className="text-white/60 text-sm font-medium" role="status" aria-live="polite">
                    {currentImageIndex + 1} / {imagesForCurrentCategory.length}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* LiquidGlassSwitch — overlaid at bottom-center of gallery frame (desktop only) */}
        <div className="hidden sm:block absolute bottom-5 left-1/2 -translate-x-1/2 z-[5] pointer-events-auto">
          <LiquidGlassSwitch
            options={[
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

      {/* ── Thumbnail strip + category tabs ── */}
      <div className="bg-white border-t border-neutral-100 px-4 sm:px-5 pt-4 pb-4">

        {/* Mobile LiquidGlassSwitch — below the image */}
        <div className="sm:hidden flex justify-center mb-4">
          <LiquidGlassSwitch
            options={[
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

        {/* Header row: camera icon + "Photos" label + category pills */}
        <div className="flex items-center gap-2 mb-3 overflow-x-auto scrollbar-hide">
          <div className="flex items-center gap-1.5 flex-shrink-0 mr-1">
            <svg className="w-4 h-4 text-neutral-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="M21 15l-3.086-3.086a2 2 0 00-2.828 0L6 21" />
            </svg>
            <span className="text-sm font-bold text-neutral-800">{t('property:photos.title', 'Photos')}</span>
          </div>

          {/* All pill */}
          <button
            onClick={() => { if (viewMode !== 'photos') setViewMode('photos'); handleCategorySelect('all'); }}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
              activeCategory === 'all' && viewMode === 'photos'
                ? 'bg-primary text-white border-primary'
                : 'bg-neutral-100 text-neutral-600 border-neutral-200 hover:bg-neutral-200'
            }`}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="M21 15l-3.086-3.086a2 2 0 00-2.828 0L6 21" />
            </svg>
            {t('property:photos.all', 'All')} {allImages.length}
          </button>

          {/* Per-tag pills */}
          {(Object.keys(categorizedImages) as PropertyImageTag[]).map((tag) => (
            <button
              key={tag}
              onClick={() => { if (viewMode !== 'photos') setViewMode('photos'); handleCategorySelect(tag); }}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-all border ${
                activeCategory === tag && viewMode === 'photos'
                  ? 'bg-primary text-white border-primary'
                  : 'bg-neutral-100 text-neutral-600 border-neutral-200 hover:bg-neutral-200'
              }`}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
              </svg>
              {t(`property:photos.categories.${tag}`, { defaultValue: tag.replace('_', ' ') })} {categorizedImages[tag]?.length || 0}
            </button>
          ))}
        </div>

        {/* Thumbnail row — large cards filling card width */}
        {viewMode === 'photos' ? (
          <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 sm:-mx-5 px-4 sm:px-5 pb-1">
            {imagesForCurrentCategory.map((img, index) => (
              <button
                key={img.url}
                onClick={() => {
                  setSlideDirection(index > currentImageIndex ? 1 : -1);
                  if (onImageIndexChange) { onImageIndexChange(index); } else { setInternalIndex(index); }
                }}
                className={`flex-shrink-0 w-[155px] h-[110px] sm:w-[195px] sm:h-[140px] rounded-xl overflow-hidden transition-all border-2 ${
                  index === currentImageIndex
                    ? 'border-primary shadow-lg'
                    : 'border-transparent hover:border-neutral-300'
                }`}
              >
                <img
                  src={optimizeCloudinaryUrl(img.url, { width: 390, quality: 'auto', crop: 'fill' })}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              </button>
            ))}
            {imagesForCurrentCategory.length > 5 && (
              <button
                onClick={handleNextImage}
                className="flex-shrink-0 w-10 h-[110px] sm:h-[140px] bg-neutral-100 hover:bg-neutral-200 rounded-xl flex items-center justify-center transition-colors"
              >
                <ChevronRightIcon className="w-5 h-5 text-neutral-600" />
              </button>
            )}
          </div>
        ) : (
          <div className="pb-1">
            <button
              onClick={() => setViewMode('photos')}
              className="text-xs text-primary font-semibold hover:underline flex items-center gap-1"
            >
              <ChevronLeftIcon className="w-3 h-3" />
              {t('property:gallery.backToPhotos', 'Back to Photos')}
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
