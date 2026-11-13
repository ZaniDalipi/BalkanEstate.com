import React, { useMemo } from 'react';
import { MorphStage, type MorphStatus } from '@/src/components/ui/morph-gallery';
import { getGallerySources, shouldCoverFrame } from '../../../config/galleryImages';

interface ListingMorphStageProps {
  /** The photos of the active category, in gallery order. */
  urls: string[];
  index: number;
  /** Wide screens get full-size textures; phones a lighter 1280w. */
  wide: boolean;
  /** `unavailable` means: render the plain slide track instead. */
  onStatusChange: (status: MorphStatus) => void;
}

/**
 * The listing hero's photos, changing through the morph dissolve.
 *
 * Under the canvas sits the current photo's blurred placeholder, the same first
 * paint the slide track gives, so the frame is never an empty black box while
 * the first texture downloads. Textures use the gallery's own sized sources,
 * so they go through the CDN (with CORS) or the image proxy like every photo.
 */
export const ListingMorphStage: React.FC<ListingMorphStageProps> = ({ urls, index, wide, onStatusChange }) => {
  const width = wide ? 1920 : 1280;
  const sources = useMemo(
    () => urls.map((url) => getGallerySources(url, { fallbackWidth: width }).src),
    [urls, width],
  );
  const placeholder = getGallerySources(urls[index]).placeholder;

  return (
    <div className="absolute inset-0 overflow-hidden" data-testid="listing-morph-stage">
      {placeholder && (
        <img
          src={placeholder}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover blur-3xl scale-150 pointer-events-none select-none"
        />
      )}
      <MorphStage
        sources={sources}
        index={index}
        duration={1400}
        // Same frame-fill rule as the slide track: a portrait photo is shown whole.
        shouldCover={shouldCoverFrame}
        onStatusChange={onStatusChange}
      />
    </div>
  );
};
