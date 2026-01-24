/**
 * VideoPlayer Component
 *
 * A versatile video player that supports embedding videos from various social media platforms:
 * - YouTube
 * - TikTok
 * - Instagram
 * - Vimeo
 * - Facebook
 * - Direct video URLs (mp4, webm, etc.)
 *
 * Features:
 * - Autoplay support
 * - Callback when video ends
 * - Replay functionality
 * - Responsive design
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

interface VideoPlayerProps {
  videoUrl: string;
  autoPlay?: boolean;
  muted?: boolean;
  onVideoEnd?: () => void;
  onVideoStart?: () => void;
  className?: string;
  showControls?: boolean;
  showReplayButton?: boolean;
}

type VideoProvider = 'youtube' | 'tiktok' | 'instagram' | 'vimeo' | 'facebook' | 'direct' | 'unknown';

interface VideoInfo {
  provider: VideoProvider;
  embedUrl: string;
  videoId?: string;
}

/**
 * Parse a video URL and return embed information
 */
function parseVideoUrl(url: string): VideoInfo {
  if (!url) {
    return { provider: 'unknown', embedUrl: '' };
  }

  // YouTube patterns
  const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const youtubeMatch = url.match(youtubeRegex);
  if (youtubeMatch) {
    const videoId = youtubeMatch[1];
    return {
      provider: 'youtube',
      videoId,
      embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&enablejsapi=1&rel=0&modestbranding=1`,
    };
  }

  // YouTube Shorts
  const youtubeShortsRegex = /youtube\.com\/shorts\/([^"&?\/\s]+)/i;
  const youtubeShortsMatch = url.match(youtubeShortsRegex);
  if (youtubeShortsMatch) {
    const videoId = youtubeShortsMatch[1];
    return {
      provider: 'youtube',
      videoId,
      embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&enablejsapi=1&rel=0&modestbranding=1`,
    };
  }

  // TikTok patterns
  const tiktokRegex = /(?:tiktok\.com\/@[^\/]+\/video\/|tiktok\.com\/t\/)(\d+)/i;
  const tiktokMatch = url.match(tiktokRegex);
  if (tiktokMatch) {
    const videoId = tiktokMatch[1];
    return {
      provider: 'tiktok',
      videoId,
      embedUrl: `https://www.tiktok.com/embed/v2/${videoId}?autoplay=1`,
    };
  }

  // TikTok short URL
  if (url.includes('tiktok.com') && url.includes('/video/')) {
    const videoIdMatch = url.match(/\/video\/(\d+)/);
    if (videoIdMatch) {
      return {
        provider: 'tiktok',
        videoId: videoIdMatch[1],
        embedUrl: `https://www.tiktok.com/embed/v2/${videoIdMatch[1]}?autoplay=1`,
      };
    }
  }

  // Instagram patterns (Reels and Posts)
  const instagramRegex = /instagram\.com\/(?:p|reel|reels)\/([^\/\?]+)/i;
  const instagramMatch = url.match(instagramRegex);
  if (instagramMatch) {
    const postId = instagramMatch[1];
    return {
      provider: 'instagram',
      videoId: postId,
      embedUrl: `https://www.instagram.com/p/${postId}/embed`,
    };
  }

  // Vimeo patterns
  const vimeoRegex = /(?:vimeo\.com\/)(\d+)/i;
  const vimeoMatch = url.match(vimeoRegex);
  if (vimeoMatch) {
    const videoId = vimeoMatch[1];
    return {
      provider: 'vimeo',
      videoId,
      embedUrl: `https://player.vimeo.com/video/${videoId}?autoplay=1&muted=1&title=0&byline=0&portrait=0`,
    };
  }

  // Facebook video patterns
  const facebookRegex = /facebook\.com\/(?:watch\/?\?v=|.*\/videos\/)(\d+)/i;
  const facebookMatch = url.match(facebookRegex);
  if (facebookMatch) {
    const videoId = facebookMatch[1];
    return {
      provider: 'facebook',
      videoId,
      embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false&autoplay=true&mute=true`,
    };
  }

  // Direct video URL (mp4, webm, etc.)
  const videoExtensions = /\.(mp4|webm|ogg|mov)(\?.*)?$/i;
  if (videoExtensions.test(url)) {
    return {
      provider: 'direct',
      embedUrl: url,
    };
  }

  // Unknown provider - try to use as-is (might be an embed URL already)
  return { provider: 'unknown', embedUrl: url };
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoUrl,
  autoPlay = true,
  muted = true,
  onVideoEnd,
  onVideoStart,
  className = '',
  showControls = true,
  showReplayButton = true,
}) => {
  const { t } = useTranslation(['property']);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [hasEnded, setHasEnded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const videoInfo = parseVideoUrl(videoUrl);

  // Handle video start
  useEffect(() => {
    if (isPlaying && onVideoStart) {
      onVideoStart();
    }
  }, [isPlaying, onVideoStart]);

  // Handle direct video events
  const handleVideoEnded = useCallback(() => {
    setHasEnded(true);
    setIsPlaying(false);
    if (onVideoEnd) {
      onVideoEnd();
    }
  }, [onVideoEnd]);

  const handleVideoPlay = useCallback(() => {
    setIsPlaying(true);
    setHasEnded(false);
  }, []);

  const handleReplay = useCallback(() => {
    setHasEnded(false);
    setIsPlaying(true);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play();
    }
    // For iframe embeds, we need to reload
    if (iframeRef.current && videoInfo.provider !== 'direct') {
      const currentSrc = iframeRef.current.src;
      iframeRef.current.src = '';
      setTimeout(() => {
        if (iframeRef.current) {
          iframeRef.current.src = currentSrc;
        }
      }, 100);
    }
  }, [videoInfo.provider]);

  const handleIframeLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleVideoError = useCallback(() => {
    setError(t('property:video.errorLoading', 'Failed to load video'));
    setIsLoading(false);
  }, [t]);

  // Get provider-specific styling
  const getProviderBadge = () => {
    const badges: Record<VideoProvider, { color: string; label: string; icon: JSX.Element }> = {
      youtube: {
        color: 'bg-red-600',
        label: 'YouTube',
        icon: (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
          </svg>
        ),
      },
      tiktok: {
        color: 'bg-black',
        label: 'TikTok',
        icon: (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
          </svg>
        ),
      },
      instagram: {
        color: 'bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500',
        label: 'Instagram',
        icon: (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
          </svg>
        ),
      },
      vimeo: {
        color: 'bg-cyan-600',
        label: 'Vimeo',
        icon: (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M23.977 6.416c-.105 2.338-1.739 5.543-4.894 9.609-3.268 4.247-6.026 6.37-8.29 6.37-1.409 0-2.578-1.294-3.553-3.881L5.322 11.4C4.603 8.816 3.834 7.522 3.01 7.522c-.179 0-.806.378-1.881 1.132L0 7.197c1.185-1.044 2.351-2.084 3.501-3.128C5.08 2.701 6.266 1.984 7.055 1.91c1.867-.18 3.016 1.1 3.447 3.838.465 2.953.789 4.789.971 5.507.539 2.45 1.131 3.674 1.776 3.674.502 0 1.256-.796 2.265-2.385 1.004-1.589 1.54-2.797 1.612-3.628.144-1.371-.395-2.061-1.614-2.061-.574 0-1.167.121-1.777.391 1.186-3.868 3.434-5.757 6.762-5.637 2.473.06 3.628 1.664 3.493 4.797l-.013.01z" />
          </svg>
        ),
      },
      facebook: {
        color: 'bg-blue-600',
        label: 'Facebook',
        icon: (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
        ),
      },
      direct: {
        color: 'bg-neutral-700',
        label: t('property:video.video', 'Video'),
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      },
      unknown: {
        color: 'bg-neutral-600',
        label: t('property:video.video', 'Video'),
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        ),
      },
    };

    return badges[videoInfo.provider];
  };

  const badge = getProviderBadge();

  if (error) {
    return (
      <div className={`relative w-full h-full bg-neutral-900 flex items-center justify-center ${className}`}>
        <div className="text-center text-white p-4">
          <svg className="w-12 h-12 mx-auto mb-2 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-neutral-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full bg-neutral-900 ${className}`}>
      {/* Provider Badge */}
      <div className={`absolute top-3 left-3 z-20 flex items-center gap-1.5 ${badge.color} text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-lg`}>
        {badge.icon}
        <span>{badge.label}</span>
      </div>

      {/* Loading Indicator */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-900 z-10">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-3 border-white/20 border-t-white rounded-full animate-spin" />
            <span className="text-white text-sm">{t('property:video.loading', 'Loading video...')}</span>
          </div>
        </div>
      )}

      {/* Video Content */}
      {videoInfo.provider === 'direct' ? (
        <video
          ref={videoRef}
          src={videoInfo.embedUrl}
          autoPlay={autoPlay}
          muted={muted}
          controls={showControls}
          playsInline
          onEnded={handleVideoEnded}
          onPlay={handleVideoPlay}
          onLoadedData={() => setIsLoading(false)}
          onError={handleVideoError}
          className="w-full h-full object-cover"
        />
      ) : (
        <iframe
          ref={iframeRef}
          src={isPlaying ? videoInfo.embedUrl : ''}
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          onLoad={handleIframeLoad}
          title={`${badge.label} video`}
        />
      )}

      {/* Replay Overlay */}
      {hasEnded && showReplayButton && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20 animate-fade-in">
          <button
            onClick={handleReplay}
            className="flex flex-col items-center gap-2 text-white hover:scale-105 transition-transform"
          >
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
              </svg>
            </div>
            <span className="text-sm font-medium">{t('property:video.replay', 'Replay Video')}</span>
          </button>
        </div>
      )}

      {/* Click to Play Overlay (when not autoplaying) */}
      {!autoPlay && !isPlaying && !hasEnded && (
        <button
          onClick={() => setIsPlaying(true)}
          className="absolute inset-0 flex items-center justify-center bg-black/40 z-20 group"
        >
          <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 group-hover:scale-110 transition-all">
            <svg className="w-10 h-10 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </button>
      )}
    </div>
  );
};

export default VideoPlayer;
