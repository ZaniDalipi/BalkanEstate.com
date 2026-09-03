/**
 * A listing's photos do not all share a shape. Phone portraits and video stills
 * come in at 9:16, and `object-cover` into a landscape frame kept whichever
 * horizontal band happened to sit in the middle — for an outdoor shot that band
 * is sky, so a strip of three different photos rendered as three near-identical
 * blue rectangles with a black bar on top.
 *
 * These tests pin the two halves of the fix: the rule that decides when a photo
 * is too far off-shape to crop, and the blurred fill that stands behind the
 * bars once it is shown whole.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { PropertyGallery } from '@/src/components/property/PropertyGallery';
import { coveredFraction, shouldCoverFrame, MIN_VISIBLE_ON_COVER } from '@/config/galleryImages';
import type { Property } from '@/types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, second?: string | { defaultValue?: string }) => {
      if (typeof second === 'string') return second;
      if (second && typeof second === 'object' && second.defaultValue) return second.defaultValue;
      return key;
    },
  }),
}));

vi.mock('@/src/features/promo/components/Slot', () => ({ default: () => null }));

const LANDSCAPE = 4 / 3;
const PORTRAIT = 9 / 16;
const FRAME_16_9 = 16 / 9;
const THUMB = 155 / 110;

describe('coveredFraction', () => {
  it('is 1 when the photo already matches the frame', () => {
    expect(coveredFraction(FRAME_16_9, FRAME_16_9)).toBe(1);
  });

  it('is symmetric — a frame too tall costs the same as a frame too wide', () => {
    expect(coveredFraction(1, 2)).toBeCloseTo(coveredFraction(2, 1), 10);
  });

  it('reports how little of a phone portrait survives a landscape frame', () => {
    // Roughly a third: the reason the crop was unusable, not merely tight.
    expect(coveredFraction(PORTRAIT, FRAME_16_9)).toBeCloseTo(0.316, 3);
  });

  it('treats an unmeasurable aspect as lossless rather than dividing by zero', () => {
    expect(coveredFraction(0, FRAME_16_9)).toBe(1);
    expect(coveredFraction(NaN, FRAME_16_9)).toBe(1);
  });
});

describe('shouldCoverFrame', () => {
  it('fills the frame with the ordinary listing shapes', () => {
    // 4:3, 3:2 and square are what a camera and a phone actually produce held
    // landscape; a threshold that letterboxed these would put bars on almost
    // every photo in the catalogue.
    [LANDSCAPE, 3 / 2, 1].forEach((aspect) => {
      expect(shouldCoverFrame(aspect, FRAME_16_9)).toBe(true);
      expect(shouldCoverFrame(aspect, THUMB)).toBe(true);
    });
  });

  it('judges each frame on its own shape, not the photo alone', () => {
    // A 3:1 panorama all but matches the 16:9 hero and fills it, while the
    // squarer thumbnail card would keep less than half of it — so the same
    // photo is cropped in one place and shown whole in the other.
    expect(shouldCoverFrame(3, FRAME_16_9)).toBe(true);
    expect(shouldCoverFrame(3, THUMB)).toBe(false);
  });

  it('shows a phone portrait whole instead of cropping it to its middle band', () => {
    expect(shouldCoverFrame(PORTRAIT, FRAME_16_9)).toBe(false);
    expect(shouldCoverFrame(PORTRAIT, THUMB)).toBe(false);
  });

  it('shows a gentler portrait whole in a 16:9 frame too', () => {
    // 3:4 survives a 1.4 thumbnail, but cropping it into 16:9 keeps two fifths
    // of it — still a band, not a photo.
    expect(shouldCoverFrame(3 / 4, THUMB)).toBe(true);
    expect(shouldCoverFrame(3 / 4, FRAME_16_9)).toBe(false);
  });

  it('covers until the loss reaches the threshold, and stops there', () => {
    const frame = FRAME_16_9;
    expect(shouldCoverFrame(frame * MIN_VISIBLE_ON_COVER, frame)).toBe(true);
    expect(shouldCoverFrame(frame * (MIN_VISIBLE_ON_COVER - 0.01), frame)).toBe(false);
  });

  it('covers a photo whose size is not known yet', () => {
    // The first paint has no naturalWidth. Guessing "cover" matches the common
    // case, so an ordinary photo never flips its framing after it loads.
    expect(shouldCoverFrame(undefined, FRAME_16_9)).toBe(true);
  });
});

const photo = (n: number) => `https://res.cloudinary.com/dh8tbq8wy/image/upload/v1700000000/listing/p${n}.jpg`;

const property = {
  id: 'p1',
  imageUrl: photo(0),
  images: [{ url: photo(1), tag: 'other' }],
  propertyType: 'land',
  listingType: 'sale',
  city: 'Tirana',
  country: 'Albania',
  price: 2000000,
  lat: 41.3,
  lng: 19.8,
} as unknown as Property;

/** The thumbnail strip renders at w_390; the carousel does not. */
const thumbnails = (): HTMLImageElement[] =>
  Array.from(document.querySelectorAll<HTMLImageElement>('img')).filter((img) =>
    img.getAttribute('src')?.includes('w_390')
  );

/** Fakes a decode so the component learns the photo's real shape. */
const reportNaturalSize = (img: HTMLImageElement, width: number, height: number) => {
  Object.defineProperty(img, 'naturalWidth', { value: width, configurable: true });
  Object.defineProperty(img, 'naturalHeight', { value: height, configurable: true });
  fireEvent.load(img);
};

beforeEach(() => {
  cleanup();
});

describe('thumbnail strip', () => {
  const renderStrip = () =>
    render(
      <PropertyGallery
        property={property}
        onOpenEditor={() => {}}
        onOpenViewer={() => {}}
        activeCategory="all"
        currentImageIndex={0}
        onCategoryChange={() => {}}
        onImageIndexChange={() => {}}
      />
    );

  it('asks the CDN not to crop, so the card decides the framing', () => {
    renderStrip();
    // c_fill at a bare width silently upscales small photos; c_limit does not,
    // and neither crops — the decision belongs to the component below.
    thumbnails().forEach((img) => expect(img.getAttribute('src')).toContain('c_limit'));
  });

  it('fills the card with a landscape photo and adds no backdrop', () => {
    renderStrip();
    const thumb = thumbnails()[0];
    reportNaturalSize(thumb, 1600, 1200);

    expect(thumb.className).toContain('object-cover');
    expect(thumb.className).not.toContain('object-contain');
    // A full-bleed card has nothing to fill, so it pays for no extra request.
    // Scoped to the card: the carousel above keeps its own blurred backdrop.
    expect(thumb.closest('button')!.querySelectorAll('img[src*="e_blur"]')).toHaveLength(0);
  });

  it('shows a portrait photo whole over a blurred copy of itself', () => {
    renderStrip();
    const thumb = thumbnails()[0];
    reportNaturalSize(thumb, 1080, 1920);

    expect(thumb.className).toContain('object-contain');

    const backdrop = thumb.closest('button')!.querySelector<HTMLImageElement>('img[src*="e_blur"]');
    expect(backdrop).not.toBeNull();
    // Filling the bars is the whole point: it must cover, and it must be the
    // same photo rather than a generic placeholder.
    expect(backdrop!.className).toContain('object-cover');
    expect(backdrop!.getAttribute('src')).toContain('/listing/p0');
    // A CSS blur samples past the element as transparent, so the backdrop has
    // to overflow by more than its blur radius or the edges fade back to black.
    expect(backdrop!.className).toContain('scale-150');
  });

  it('ignores a load event that carries no usable size', () => {
    renderStrip();
    const thumb = thumbnails()[0];
    // A failed or still-empty decode reports 0x0; treating that as an aspect
    // would divide by zero and letterbox a photo that is perfectly fine.
    reportNaturalSize(thumb, 0, 0);
    expect(thumb.className).toContain('object-cover');
  });
});
