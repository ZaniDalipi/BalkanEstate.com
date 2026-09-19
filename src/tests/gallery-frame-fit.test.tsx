/**
 * A listing's photos do not all share a shape. Phone portraits and video stills
 * come in at 9:16, and `object-cover` into a landscape frame kept whichever
 * horizontal band happened to sit in the middle — for an outdoor shot that band
 * is sky, so a strip of three different photos rendered as three near-identical
 * blue rectangles with a black bar on top.
 *
 * Nothing is cropped to its frame any more. The thumbnail strip shows every
 * photo whole in a 16:9 card over a blurred copy of itself — wider than the
 * 4:3 a phone shoots, so an ordinary listing photo visibly sits inside its
 * card rather than filling it, which is what tells a viewer they are seeing
 * all of it. These tests pin the rule that decides when those bars need
 * filling, and the fill itself.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { PropertyGallery } from '@/src/components/property/PropertyGallery';
import { coveredFraction, needsBlurredBackdrop } from '@/config/galleryImages';
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
/** The thumbnail card's own shape — 192x108 and 208x117 are both exactly this. */
const THUMB_FRAME = 16 / 9;

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

describe('needsBlurredBackdrop', () => {
  it('leaves an exactly-shaped photo alone', () => {
    // It fills the card edge to edge, so there is nothing to fill behind it and
    // no reason to pay for a second request.
    expect(needsBlurredBackdrop(THUMB_FRAME, THUMB_FRAME)).toBe(false);
  });

  it('fills the bars a contained photo leaves, whichever way they run', () => {
    // The card is 16:9, so an ordinary 4:3 photo and a phone portrait both
    // leave bars at the sides; only something wider than 16:9 leaves them
    // above and below. All of them are the black slab the fill replaces.
    expect(needsBlurredBackdrop(LANDSCAPE, THUMB_FRAME)).toBe(true);
    expect(needsBlurredBackdrop(PORTRAIT, THUMB_FRAME)).toBe(true);
    expect(needsBlurredBackdrop(3, THUMB_FRAME)).toBe(true);
  });

  it('gives the commonest listing photo a fill — the point of a wider card', () => {
    // A phone shoots 4:3. Against a 4:3 card that photo filled edge to edge
    // and looked exactly like one cropped to fit; against 16:9 it sits whole
    // with its own colour down either side.
    expect(needsBlurredBackdrop(LANDSCAPE, THUMB_FRAME)).toBe(true);
    expect(THUMB_FRAME).toBeGreaterThan(LANDSCAPE);
  });

  it('ignores a difference too small to see', () => {
    // A hair off 4:3 is a pixel of bar on a 147px card.
    expect(needsBlurredBackdrop(THUMB_FRAME * 1.005, THUMB_FRAME)).toBe(false);
  });

  it('assumes bars for a photo whose size is not known yet', () => {
    // Mounting the backdrop before the decode is what stops the bars flashing
    // black on first paint; an unmeasurable photo is treated the same way.
    expect(needsBlurredBackdrop(undefined, THUMB_FRAME)).toBe(true);
    expect(needsBlurredBackdrop(0, THUMB_FRAME)).toBe(true);
    expect(needsBlurredBackdrop(NaN, THUMB_FRAME)).toBe(true);
  });

  it('has nothing to fill when the frame itself is unmeasurable', () => {
    expect(needsBlurredBackdrop(LANDSCAPE, 0)).toBe(false);
    expect(needsBlurredBackdrop(LANDSCAPE, NaN)).toBe(false);
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

/** The thumbnail strip renders at w_416 (2x its 208px card); the carousel does not. */
const thumbnails = (): HTMLImageElement[] =>
  Array.from(document.querySelectorAll<HTMLImageElement>('img')).filter((img) =>
    img.getAttribute('src')?.includes('w_416')
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

  it('never crops a photo to the card, whatever shape it arrives in', () => {
    renderStrip();
    // 4:3, 16:9 and a phone portrait: the whole photo stays on screen in every
    // one. Cropping is what turned a strip of twelve rooms into twelve
    // identical close-ups of a ceiling.
    [[1600, 1200], [1920, 1080], [1080, 1920]].forEach(([w, h]) => {
      const thumb = thumbnails()[0];
      reportNaturalSize(thumb, w, h);
      expect(thumb.className).toContain('object-contain');
      expect(thumb.className).not.toContain('object-cover');
    });
  });

  it('adds no backdrop behind a photo already shaped like the card', () => {
    renderStrip();
    const thumb = thumbnails()[0];
    // Exactly 16:9 — it fills the card, so there are no bars to hide.
    reportNaturalSize(thumb, 1920, 1080);

    // Scoped to the card: the carousel above keeps its own blurred backdrop.
    expect(thumb.closest('button')!.querySelectorAll('img[src*="e_blur"]')).toHaveLength(0);
  });

  it('shows an off-shape photo whole over a blurred copy of itself', () => {
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
    // A failed or still-empty decode reports 0x0. Recording that as the photo's
    // shape would divide by zero, so the card keeps waiting — still contained,
    // still backed by the fill it was given before the decode.
    reportNaturalSize(thumb, 0, 0);

    expect(thumb.className).toContain('object-contain');
    expect(thumb.closest('button')!.querySelectorAll('img[src*="e_blur"]')).toHaveLength(1);
  });

  it('shapes the card as the 16:9 the backdrop rule assumes', () => {
    renderStrip();
    // The classes are what actually shape the card and the constant is what
    // decides whether a photo inside needs a backdrop, so a card that drifted
    // off 4:3 would silently start letterboxing photos that fit it.
    const card = document.querySelector<HTMLElement>('button.w-\\[192px\\]')!;
    const classes = Array.from(card.classList);
    const px = (prefix: string, axis: 'w' | 'h') => {
      const cls = classes.find((c) => c.startsWith(`${prefix}${axis}-[`));
      expect(cls, `${prefix}${axis}-[...] on the thumbnail card`).toBeDefined();
      return Number(cls!.match(/\[(\d+)px\]/)![1]);
    };

    expect(px('', 'w') / px('', 'h')).toBeCloseTo(THUMB_FRAME, 10);
    expect(px('sm:', 'w') / px('sm:', 'h')).toBeCloseTo(THUMB_FRAME, 10);
  });

  it('fills the bars of an off-CDN photo with the photo itself', () => {
    // An external URL has no LQIP to blur. Reusing the photo the card already
    // fetched costs no second request and keeps the bars off bare black.
    const external = 'https://example.com/listing/photo.jpg';
    render(
      <PropertyGallery
        property={{ ...property, imageUrl: external } as unknown as Property}
        onOpenEditor={() => {}}
        onOpenViewer={() => {}}
        activeCategory="all"
        currentImageIndex={0}
        onCategoryChange={() => {}}
        onImageIndexChange={() => {}}
      />
    );

    const card = document.querySelector<HTMLElement>('button.w-\\[192px\\]')!;
    const [backdrop, photo] = Array.from(card.querySelectorAll('img'));
    expect(backdrop.getAttribute('src')).toBe(external);
    expect(backdrop.className).toContain('object-cover');
    expect(photo.className).toContain('object-contain');
  });

  it('shows the tile rather than requesting a URL the optimiser rejects', () => {
    // `optimizeCloudinaryUrl` returns '' for anything that is not plain
    // http(s) — a `javascript:` or `data:` URL that reached the listing must
    // not be handed to an <img> at all.
    render(
      <PropertyGallery
        property={{ ...property, imageUrl: 'javascript:alert(1)' } as unknown as Property}
        onOpenEditor={() => {}}
        onOpenViewer={() => {}}
        activeCategory="all"
        currentImageIndex={0}
        onCategoryChange={() => {}}
        onImageIndexChange={() => {}}
      />
    );

    const card = document.querySelector<HTMLElement>('button.w-\\[192px\\]')!;
    expect(card.querySelectorAll('img')).toHaveLength(0);
    expect(card.querySelector('svg')).not.toBeNull();
  });

  it('falls back to a placeholder tile when a photo will not load', () => {
    renderStrip();
    const card = thumbnails()[0].closest('button')!;
    fireEvent.error(thumbnails()[0]);

    // A dead URL used to leave the browser's own broken-image glyph sitting in
    // the strip. Nothing of that photo is requested any more — not even the
    // blurred fill, which is the same dead upload.
    expect(card.querySelectorAll('img')).toHaveLength(0);
    expect(card.querySelector('svg')).not.toBeNull();
    // The card still says which photo it is, so its button keeps a name.
    expect(card.textContent).toContain('Tirana');
  });

  it('renders the same tile for a listing with no main photo at all', () => {
    // `imageUrl` is part of the list the carousel and the strip index into, so
    // a blank one cannot simply be dropped — it would shift every index after
    // it. The card absorbs it instead of requesting an empty src.
    render(
      <PropertyGallery
        property={{ ...property, imageUrl: undefined } as unknown as Property}
        onOpenEditor={() => {}}
        onOpenViewer={() => {}}
        activeCategory="all"
        currentImageIndex={0}
        onCategoryChange={() => {}}
        onImageIndexChange={() => {}}
      />
    );

    const cards = document.querySelectorAll<HTMLElement>('button.w-\\[192px\\]');
    expect(cards).toHaveLength(2);
    // The blank one shows the tile; its neighbour is a real photo, so the
    // fallback is the missing URL's doing and not the whole strip giving up.
    expect(cards[0].querySelectorAll('img')).toHaveLength(0);
    expect(cards[0].querySelector('svg')).not.toBeNull();
    expect(cards[1].querySelector('img')!.getAttribute('src')).toContain('/listing/p1');
  });
});
