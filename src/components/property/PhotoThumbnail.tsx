// PhotoThumbnail Component
// One listing photo in a fixed-shape card — shown whole, never cropped

import React, { useState } from 'react';
import { optimizeCloudinaryUrl, cloudinarySrcSet, getPropertyImagePlaceholder } from '../../../config/cloudinaryConfig';
import { GALLERY_QUALITY } from '../../../config/galleryImages';
import { BuildingOfficeIcon } from '../../../constants';

/**
 * The shape every thumbnail card on the site is cut to.
 *
 * 16:9, deliberately wider than the 4:3 a phone camera shoots, so the
 * commonest listing photo sits well inside its card rather than filling it.
 * Callers shape their own card; `gallery-frame-fit.test.tsx` and
 * `property-photos-grid.test.tsx` pin that their CSS matches this number.
 */
export const THUMB_FRAME_ASPECT = 16 / 9;

/**
 * How far the photo is held off the card's edges, as a share of the card's
 * width (`p-[6%]` below).
 *
 * The photo is never cropped, but "never cropped" is not something a viewer
 * can *see* when the photo happens to match the card: it fills the card edge
 * to edge and looks exactly like one zoomed to fit. Holding every photo off
 * the edges means there is always a blurred margin around it, so the card
 * always reads as "this is the whole picture, and here is where it ends" —
 * whatever shape the photo arrived in.
 */
export const THUMB_INSET = '6%';

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
 * The photo is also held off the card's edges (`THUMB_INSET`), so there is
 * always a margin around it rather than only when its shape happens to differ
 * from the card's. That margin — and whatever else the fit leaves over — is
 * filled with a blurred copy of the same photo, so it carries the photo's own
 * colours rather than a black slab.
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

  // A Cloudinary photo has a 40px LQIP to blur behind the margin. Anything
  // else (an external URL the CDN never ingested) reuses the photo the card
  // has already fetched, so the fill still costs no second request — and the
  // margin never falls back to a bare black border.
  const backdropSrc = getPropertyImagePlaceholder(url) || src;

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
      <img
        src={backdropSrc}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover blur-2xl scale-[1.75] opacity-60 pointer-events-none select-none"
        decoding="async"
      />
      <img
        src={src}
        srcSet={cloudinarySrcSet(url, widths, { quality: GALLERY_QUALITY, crop: 'limit' }) || undefined}
        sizes={sizes}
        alt={alt}
        // Absolute, not in flow: an inline <img> sits on a text baseline, so
        // the line box adds a few pixels under it and the card clips them off
        // the bottom. Cropping hid that; fitting the photo would not.
        //
        // `p-[6%]` and not `inset-[6%]`: an absolutely positioned *replaced*
        // element takes its intrinsic size when width/height are auto and
        // ignores the insets that would otherwise size it, which renders the
        // photo at full size anchored to the corner. Padding shrinks the
        // content box `object-contain` fits into, which is what we want, and
        // `box-sizing: border-box` keeps the element itself card-sized.
        className="absolute inset-0 w-full h-full p-[6%] object-contain"
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        onError={() => setFailed(true)}
      />
    </>
  );
};
