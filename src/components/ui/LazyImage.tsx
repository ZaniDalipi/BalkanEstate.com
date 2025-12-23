import React, { useState, useRef, useEffect, memo } from 'react';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholderClassName?: string;
  width?: number | string;
  height?: number | string;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  priority?: boolean; // If true, load immediately without lazy loading
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * LazyImage component that uses Intersection Observer for lazy loading
 * Features:
 * - Lazy loading with Intersection Observer
 * - Blur-up placeholder effect
 * - Progressive loading with fade-in
 * - Error handling with fallback
 * - Memory efficient (unobserves after load)
 */
const LazyImage: React.FC<LazyImageProps> = memo(({
  src,
  alt,
  className = '',
  placeholderClassName = '',
  width,
  height,
  objectFit = 'cover',
  priority = false,
  onLoad,
  onError,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority || !containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '50px', // Start loading 50px before visible
        threshold: 0.01,
      }
    );

    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, [priority]);

  // Handle image load
  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  // Handle image error
  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  // Generate srcSet for responsive images (Cloudinary optimization)
  const generateSrcSet = (url: string): string | undefined => {
    if (!url.includes('cloudinary.com')) return undefined;

    // Cloudinary URL transformations for responsive images
    const sizes = [320, 640, 768, 1024, 1280];
    return sizes
      .map((size) => {
        const transformedUrl = url.replace(
          '/upload/',
          `/upload/w_${size},c_scale,q_auto,f_auto/`
        );
        return `${transformedUrl} ${size}w`;
      })
      .join(', ');
  };

  // Optimize Cloudinary URLs
  const optimizeUrl = (url: string): string => {
    if (!url.includes('cloudinary.com')) return url;

    // Add auto format and quality if not present
    if (!url.includes('f_auto')) {
      return url.replace('/upload/', '/upload/f_auto,q_auto/');
    }
    return url;
  };

  const objectFitClass = {
    cover: 'object-cover',
    contain: 'object-contain',
    fill: 'object-fill',
    none: 'object-none',
    'scale-down': 'object-scale-down',
  }[objectFit];

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${placeholderClassName}`}
      style={{ width, height }}
    >
      {/* Placeholder/skeleton */}
      {!isLoaded && !hasError && (
        <div
          className={`absolute inset-0 bg-gray-200 animate-pulse ${placeholderClassName}`}
          aria-hidden="true"
        />
      )}

      {/* Error fallback */}
      {hasError && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <svg
            className="w-12 h-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
      )}

      {/* Actual image */}
      {isInView && !hasError && (
        <img
          ref={imgRef}
          src={optimizeUrl(src)}
          srcSet={generateSrcSet(src)}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
          className={`
            ${className}
            ${objectFitClass}
            transition-opacity duration-300 ease-in-out
            ${isLoaded ? 'opacity-100' : 'opacity-0'}
          `}
          style={{ width: '100%', height: '100%' }}
        />
      )}
    </div>
  );
});

LazyImage.displayName = 'LazyImage';

export default LazyImage;

/**
 * Hook for preloading images
 */
export const useImagePreload = (src: string): boolean => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.src = src;
    img.onload = () => setIsLoaded(true);
  }, [src]);

  return isLoaded;
};

/**
 * Utility to generate blur placeholder from Cloudinary
 */
export const getBlurPlaceholder = (url: string): string => {
  if (!url.includes('cloudinary.com')) return url;
  return url.replace('/upload/', '/upload/w_20,e_blur:1000,q_1,f_auto/');
};
