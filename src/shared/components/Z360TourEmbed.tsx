/**
 * Z360 Virtual Tour Embed Component
 *
 * Embeds a Z360 virtual tour in an iframe with loading state
 * and fullscreen support.
 */

import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { isZ360TourUrl, normalizeZ360Url, is360TourUrl } from '../utils/z360Tour';

interface Z360TourEmbedProps {
  url: string;
  title?: string;
  className?: string;
  aspectRatio?: '16:9' | '4:3' | '1:1' | 'auto';
  showBadge?: boolean;
  showFullscreenButton?: boolean;
  onLoad?: () => void;
  onError?: () => void;
}

const Z360_LOGO = '/images/partners/z360-logo.svg';

export const Z360TourEmbed: React.FC<Z360TourEmbedProps> = ({
  url,
  title = '360° Virtual Tour',
  className = '',
  aspectRatio = '16:9',
  showBadge = true,
  showFullscreenButton = true,
  onLoad,
  onError,
}) => {
  const { t } = useTranslation(['property']);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Normalize the URL if it's a Z360 URL
  const embedUrl = isZ360TourUrl(url) ? normalizeZ360Url(url) : url;

  // Get provider info
  const providerInfo = is360TourUrl(url);
  const isZ360 = providerInfo.provider === 'z360';

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
    onError?.();
  }, [onError]);

  const handleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch {
      // Fullscreen not supported or denied
    }
  }, []);

  // Listen for fullscreen changes
  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const aspectRatioClass = {
    '16:9': 'pb-[56.25%]',
    '4:3': 'pb-[75%]',
    '1:1': 'pb-[100%]',
    'auto': '',
  }[aspectRatio];

  if (hasError) {
    return (
      <div className={`bg-neutral-100 rounded-lg flex items-center justify-center ${className}`}>
        <div className="text-center p-8">
          <svg
            className="w-12 h-12 text-neutral-400 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <p className="text-neutral-600">{t('property:virtualTour.failedToLoad')}</p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-600 hover:text-purple-800 text-sm mt-2 inline-block"
          >
            {t('property:virtualTour.openInNewTab')}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative bg-neutral-900 rounded-lg overflow-hidden ${className} ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none' : ''
      }`}
    >
      {/* Aspect ratio container */}
      <div className={`relative w-full ${aspectRatioClass}`}>
        {/* Loading state */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-900">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-white text-sm">{t('property:virtualTour.loading')}</p>
            </div>
          </div>
        )}

        {/* iframe */}
        <iframe
          ref={iframeRef}
          src={embedUrl}
          title={title}
          className={`absolute top-0 left-0 w-full h-full border-0 ${
            isLoading ? 'opacity-0' : 'opacity-100'
          } transition-opacity duration-300`}
          allowFullScreen
          loading="lazy"
          allow="xr-spatial-tracking; gyroscope; accelerometer; vr"
          onLoad={handleLoad}
          onError={handleError}
        />
      </div>

      {/* Z360 Badge */}
      {showBadge && isZ360 && !isLoading && (
        <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-1.5 flex items-center gap-2">
          <img src={Z360_LOGO} alt="Z360" className="h-5 w-auto" />
          <span className="text-white text-xs font-medium">Z360 Tour</span>
        </div>
      )}

      {/* Fullscreen button */}
      {showFullscreenButton && !isLoading && (
        <button
          onClick={handleFullscreen}
          className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm rounded-lg p-2 text-white hover:bg-black/80 transition-colors"
          title={isFullscreen ? t('property:gallery.exitFullscreen') : t('property:gallery.enterFullscreen')}
        >
          {isFullscreen ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
              />
            </svg>
          )}
        </button>
      )}

      {/* Open in new tab link */}
      {!isLoading && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-1.5 text-white text-xs hover:bg-black/80 transition-colors flex items-center gap-1"
        >
          <span>{t('property:virtualTour.openInNewTab')}</span>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        </a>
      )}
    </div>
  );
};

export default Z360TourEmbed;
