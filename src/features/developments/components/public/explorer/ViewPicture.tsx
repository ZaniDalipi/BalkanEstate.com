import React from 'react';
import { useTranslation } from 'react-i18next';
import { imageSrcSet, optimizeImageUrl } from '@/config/mediaConfig';

interface ViewPictureProps {
  url: string;
  name?: string;
}

/** The camera view's rendering, stretched over the explorer frame (regions are drawn over it in the same box). */
export const ViewPicture: React.FC<ViewPictureProps> = ({ url, name }) => {
  const { t } = useTranslation('developments');
  return (
    <img
      src={optimizeImageUrl(url, { width: 1920 })}
      srcSet={imageSrcSet(url, [800, 1280, 1920, 2560]) || undefined}
      sizes="100vw"
      alt={name || t('scene.exploreHeading', 'Explore the development')}
      draggable={false}
      // A failed image hides itself so buyers see the dark stage, not a broken-image icon.
      onError={(e) => {
        e.currentTarget.style.visibility = 'hidden';
      }}
      className="pointer-events-none absolute inset-0 h-full w-full object-fill"
    />
  );
};
