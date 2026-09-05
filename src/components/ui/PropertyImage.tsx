import React, { useState } from 'react';
import { optimizeImageUrl, getPropertyImagePlaceholder } from '@/config/imageConfig';
import { BuildingOfficeIcon } from '@/constants';

interface PropertyImageProps {
  src: string | undefined;
  alt: string;
  /** Extra classes applied to the main <img> element (e.g. grayscale, group-hover:scale) */
  imgClassName?: string;
  /** Above-the-fold / LCP images: sets eager loading + fetchpriority=high + sync decoding */
  priority?: boolean;
  /** Responsive widths for srcSet generation. Last entry is used as the rendered size. */
  widths?: number[];
  sizes?: string;
  crop?: 'fill' | 'scale' | 'fit' | 'limit';
  gravity?: 'auto' | 'center';
  /** Tailwind duration class for the fade-in transition (default: duration-300). */
  transitionDurationClass?: string;
  onLoad?: () => void;
}

/**
 * Builds the exact placeholder / main / srcSet URLs used by <PropertyImage>.
 * Exported so callers can preload the identical resources the browser will
 * request (e.g. warming the cache for adjacent carousel images), guaranteeing
 * cache hits instead of near-misses at a slightly different width.
 */
export const getPropertyImageSources = (
  src: string,
  widths: number[] = [320, 480, 640],
  crop: 'fill' | 'scale' | 'fit' | 'limit' = 'fill',
  gravity: 'auto' | 'center' = 'auto',
) => {
  const displayWidth = widths[widths.length - 1];
  const displayHeight = Math.round(displayWidth * 0.75);

  const placeholder =
    getPropertyImagePlaceholder(src) ||
    optimizeImageUrl(src, { width: 40, quality: 'auto:eco', crop });

  const mainSrc = optimizeImageUrl(src, {
    width: displayWidth,
    height: displayHeight,
    quality: 'auto',
    crop,
    gravity,
  });

  const srcSet = widths
    .map((w) => {
      const url = optimizeImageUrl(src, {
        width: w,
        height: Math.round(w * 0.75),
        quality: 'auto',
        crop,
        gravity,
      });
      return `${url} ${w}w`;
    })
    .join(', ');

  return { placeholder, mainSrc, srcSet, displayWidth, displayHeight };
};

/**
 * Renders a property image with:
 *  - An immediately-loaded (eager) blurred LQIP backdrop
 *  - A main image that fades in once loaded
 *  - Responsive srcSet from Cloudinary
 *  - Priority mode for above-the-fold / LCP images
 *  - Error fallback (gradient + building icon)
 *
 * Must be placed inside a positioned container (relative/absolute) with
 * overflow-hidden so the absolute-positioned imgs fill it correctly.
 */
const PropertyImage: React.FC<PropertyImageProps> = ({
  src,
  alt,
  imgClassName = '',
  priority = false,
  widths = [320, 480, 640],
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
  crop = 'fill',
  gravity = 'auto',
  transitionDurationClass = 'duration-300',
  onLoad,
}) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(!src);

  if (error || !src) {
    return (
      <div className="absolute inset-0 bg-gradient-to-br from-neutral-100 via-neutral-200 to-neutral-300 flex items-center justify-center">
        <BuildingOfficeIcon className="w-10 h-10 text-neutral-400" />
      </div>
    );
  }

  const { placeholder, mainSrc, srcSet, displayWidth, displayHeight } =
    getPropertyImageSources(src, widths, crop, gravity);

  return (
    <>
      {/* Blurred LQIP backdrop — loads immediately, fills the container while the main image arrives */}
      <img
        src={placeholder}
        alt=""
        aria-hidden="true"
        loading="eager"
        decoding="async"
        width={40}
        height={30}
        className="absolute inset-0 w-full h-full object-cover blur-2xl scale-150 opacity-80 pointer-events-none select-none"
      />
      {/* Main image — fades in once loaded; priority images get high fetchpriority for LCP */}
      <img
        src={mainSrc}
        srcSet={srcSet}
        sizes={sizes}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore fetchpriority is a valid perf hint not yet in all TS lib defs
        fetchpriority={priority ? 'high' : 'auto'}
        width={displayWidth}
        height={displayHeight}
        className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity ${transitionDurationClass} ${
          loaded ? 'opacity-100' : 'opacity-0'
        } ${imgClassName}`}
        onLoad={() => {
          setLoaded(true);
          onLoad?.();
        }}
        onError={() => setError(true)}
      />
    </>
  );
};

export default PropertyImage;
