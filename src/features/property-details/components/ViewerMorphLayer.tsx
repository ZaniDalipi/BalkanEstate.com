import React, { useMemo, useState } from 'react';
import { MorphStage, supportsWebGL } from '@/src/components/ui/morph-gallery';
import { getGallerySources, VIEWER_SIZES } from '@/config/galleryImages';

interface ViewerMorphLayerProps {
  urls: string[];
  index: number;
  /** Zoomed or annotating: the plain photo underneath takes over, the morph waits hidden. */
  hidden: boolean;
}

/** The viewer shows every photo whole, never cropped. */
const containAlways = () => false;

/**
 * The fullscreen viewer's photo change, played as the morph dissolve.
 *
 * It lies over the viewer's own <img>, which stays mounted underneath for zoom,
 * annotation and the room styler. The layer takes no pointer events, so swipes,
 * double-click zoom and drags still reach the viewer. It hides (rather than
 * unmounting, which would rebuild the WebGL context) while the plain photo is
 * needed. A photo it cannot texture (a dead link, no CORS) is simply shown by
 * the <img> underneath while the canvas fades out, and the morph resumes on the
 * next photo. Only a browser without WebGL removes the layer for good.
 */
export const ViewerMorphLayer: React.FC<ViewerMorphLayerProps> = ({ urls, index, hidden }) => {
  const [off, setOff] = useState(() => !supportsWebGL());
  // Same sized source the warm-up fetches for the viewer, so a texture is a cache hit.
  const sources = useMemo(
    () => urls.map((url) => getGallerySources(url, { sizes: VIEWER_SIZES, fallbackWidth: 1920 }).src),
    [urls],
  );
  if (off || urls.length === 0) return null;

  return (
    <div
      className={`absolute inset-0 pointer-events-none ${hidden ? 'hidden' : ''}`}
      data-testid="viewer-morph-layer"
    >
      <MorphStage
        sources={sources}
        index={index}
        duration={1400}
        shouldCover={containAlways}
        onStatusChange={(status) => status === 'unavailable' && setOff(true)}
      />
    </div>
  );
};
