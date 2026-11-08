import React from 'react';
import { useTranslation } from 'react-i18next';
import { imageSrcSet, optimizeImageUrl } from '@/config/mediaConfig';
import { cn } from '@/src/lib/utils';

interface ViewPictureProps {
  url: string;
  name?: string;
  /** A styled copy laid over the real one (e.g. the dive's white model): no alt text. */
  decorative?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * The camera view's rendering, stretched over the explorer frame (regions are
 * drawn over it in the same box). Copies use the same sources, so the browser
 * reuses the image it already has.
 */
export const ViewPicture: React.FC<ViewPictureProps> = ({ url, name, decorative, className, style }) => {
  const { t } = useTranslation('developments');
  return (
    <img
      src={optimizeImageUrl(url, { width: 1920 })}
      srcSet={imageSrcSet(url, [800, 1280, 1920, 2560]) || undefined}
      sizes="100vw"
      alt={decorative ? '' : name || t('scene.exploreHeading', 'Explore the development')}
      aria-hidden={decorative || undefined}
      draggable={false}
      // A failed image hides itself so buyers see the dark stage, not a broken-image icon.
      onError={(e) => {
        e.currentTarget.style.visibility = 'hidden';
      }}
      className={cn('pointer-events-none absolute inset-0 h-full w-full object-fill', className)}
      style={style}
    />
  );
};
