// PhotoThumbnail Component
// One listing photo in a fixed-shape card — shown whole, never cropped

import React, { useState } from 'react';
import { optimizeCloudinaryUrl, cloudinarySrcSet, getPropertyImagePlaceholder } from '../../../config/cloudinaryConfig';
import { needsBlurredBackdrop, GALLERY_QUALITY } from '../../../config/galleryImages';
import { BuildingOfficeIcon } from '../../../constants';

/**
 * The shape every thumbnail card on the site is cut to.
 *
 * 16:9, deliberately wider than the 4:3 a phone camera shoots. A card cut to
 * 4:3 would swallow the commonest listing photo edge to edge, and a photo that
 * exactly fills its card is indistinguishable from one that was cropped to fit
 * — there is nothing on screen to show the viewer they are seeing all of it.
 * Against a wider card the same photo sits whole with its own blurred colour
 * running down either side, which reads as "this is the whole picture".
 *
 * Callers shape their own card, but the card's CSS and this number have to
 * agree: it is what decides whether the photo inside needs a backdrop.
 */
export const THUMB_FRAME_ASPECT = 16 / 9;

export interface PhotoThumbnailProps {
  /** May be blank: a listing whose `imageUrl` never got filled in renders the tile. */
  url: string | undefined;
  /**
   * What the photo is. Thumbnails usually sit inside a bare `<button>`, so this
   * is also what gives that button its accessible name — it is not decorative.
   */
  alt: string;
  /** `sizes` for the card as the caller's layout actually renders it. */
  sizes: string;
  /** Candidate widths to offer the browser — the card's CSS width at 1x, 2x, 3x. */
  widths: number[];
  /** Width baked into `src`, for browsers that ignore `srcSet`. */
  fallbackWidth: number;
  /** Fetch up front rather than on scroll. Only worth it above the fold. */
  eager?: boolean;
}

/**
 * One listing photo in a thumbnail card.
 *
 * A thumbnail grid or strip is the only place a listing shows every photo at
 * once, so every photo is shown *whole* — scaled to fit the card, never
 * cropped to fill it. Cropping is what made these unreadable: a 16:9 room shot
 * lost a third of its width to the sides, and a phone portrait was cut down to
 * whichever horizontal band sat in the middle, usually ceiling or sky, so a
 * dozen different photos rendered as a dozen near-identical tiles.
 *
 * Whatever the fit leaves over — bars down either side of an ordinary 4:3 or
 * portrait photo, above and below a photo wider than 16:9 — is filled with a
 * blurred copy of that same photo, so it carries the photo's own colours
 * rather than a black slab. A photo that is already exactly 16:9 fills the
 * card and mounts no backdrop, so that case still costs a single request.
 *
 * Renders into the caller's card, which must be `relative` and clip its
 * overflow; the blurred fill is positioned against it.
 */
export const PhotoThumbnail: React.FC<PhotoThumbnailProps> = ({
  url,
  alt,
  sizes,
  widths,
  fallbackWidth,
  eager = false,
}) => {
  // Undefined until the photo reports its natural size. `needsBlurredBackdrop`
  // reads that as "bars are coming", so they are never briefly black while the
  // photo decodes.
  const [aspect, setAspect] = useState<number | undefined>(undefined);
  const [failed, setFailed] = useState(false);

  // '' for a missing URL and for anything that is not plain http(s) — a blank
  // listing photo and a rejected one land here together.
  const src = optimizeCloudinaryUrl(url, {
    // `limit` never crops and never upscales, so the card decides the framing
    // rather than the CDN guessing at it.
    width: fallbackWidth,
    quality: GALLERY_QUALITY,
    crop: 'limit',
  });

  // A photo that cannot be requested, or that the CDN will not serve, gets the
  // same placeholder tile the carousel shows — never an empty `src` and never
  // the browser's broken-image glyph.
  if (!src || failed) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-neutral-700 to-neutral-800">
        <BuildingOfficeIcon className="w-8 h-8 text-neutral-500" aria-hidden="true" />
        <span className="sr-only">{alt}</span>
      </div>
    );
  }

  // A Cloudinary photo has a 20px LQIP to blur behind the bars. Anything else
  // (an external URL the CDN never ingested) reuses the photo the card has
  // already fetched, so the fill still costs no second request — and an
  // off-shape photo never falls back to bare black bars.
  const backdropSrc = getPropertyImagePlaceholder(url) || src;
  const showBackdrop = needsBlurredBackdrop(aspect, THUMB_FRAME_ASPECT);

  return (
    <>
      {/* Blurred fill behind the bars. Only mounted once the photo is known to
          need it, so a full-bleed thumbnail costs no extra request.

          It has to read as *backdrop*, never as a second copy of the photo. A
          lightly blurred, full-size copy magnified across the card is legible
          enough that the eye merges it with the photo in front and the whole
          card reads as one zoomed, soft image — the exact thing showing the
          photo whole is meant to fix. So: the tiny LQIP rather than the photo
          where one exists, a heavy blur, and dimmed, so the sharp photo in
          front is unmistakably the subject.

          scale-[1.75], not 1.1: a CSS blur samples past the element as
          transparent, so the overflow has to exceed the blur radius or the
          card's edges fade back to black — the very bars this fill exists to
          hide. 37.5% each side clears a 40px blur down to a ~110px tile. */}
      {showBackdrop && (
        <img
          src={backdropSrc}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover blur-2xl scale-[1.75] opacity-60 pointer-events-none select-none"
          decoding="async"
        />
      )}
      <img
        src={src}
        srcSet={cloudinarySrcSet(url, widths, { quality: GALLERY_QUALITY, crop: 'limit' }) || undefined}
        sizes={sizes}
        alt={alt}
        // Absolute, not in flow: an inline <img> sits on a text baseline, so
        // the line box adds a few pixels under it and the card clips them off
        // the bottom. Cropping hid that; fitting the photo would not.
        className="absolute inset-0 w-full h-full object-contain"
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        onLoad={(e) => {
          const { naturalWidth, naturalHeight } = e.currentTarget;
          // A failed or still-empty decode reports 0x0; treating that as a
          // shape would divide by zero and put bars on a photo that is fine.
          if (naturalWidth > 0 && naturalHeight > 0) setAspect(naturalWidth / naturalHeight);
        }}
        onError={() => setFailed(true)}
      />
    </>
  );
};
