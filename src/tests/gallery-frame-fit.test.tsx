/**
 * Nothing is cropped to its frame. A thumbnail shows the whole photo, held off
 * the card's edges so there is always a blurred margin around it — not only
 * when the photo's shape happens to differ from the card's. A photo that fills
 * its card edge to edge is indistinguishable from one zoomed to fit, which is
 * what kept these reading as "still cropped" however correct the fit was.
 *
 * These tests pin the card's shape, that the photo is fitted and inset, that
 * the fill is always there and reads as backdrop, and the failure paths.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { PropertyGallery } from '@/src/components/property/PropertyGallery';
import { THUMB_FRAME_ASPECT } from '@/src/components/property/PhotoThumbnail';
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

  it('holds the photo off the card edges so the margin is always visible', () => {
    renderStrip();
    const thumb = thumbnails()[0];
    // Padding, not inset: an absolutely positioned replaced element takes its
    // intrinsic size when width/height are auto and ignores the insets, which
    // renders the photo full-size in the corner. Padding shrinks the content
    // box `object-contain` fits into instead.
    expect(thumb.className).toContain('p-[6%]');
    expect(thumb.className).toContain('inset-0');
    expect(thumb.className).toContain('w-full');
    expect(thumb.className).toContain('h-full');
  });

  it('always puts a fill behind the photo, even one shaped like the card', () => {
    renderStrip();
    const thumb = thumbnails()[0];
    // Exactly 16:9 \u2014 it used to mount no fill at all, so the photo ran to the
    // card's edges and read as zoomed-to-fit. The inset means there is always
    // a margin, so there is always something to fill.
    reportNaturalSize(thumb, 1920, 1080);
    expect(thumb.closest('button')!.querySelectorAll('img[src*="e_blur"]')).toHaveLength(1);
  });

  it('shows a photo whole over a blurred copy of itself', () => {
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
    // A CSS blur samples past the element as transparent, so the fill has to
    // overflow by more than its blur radius or the edges fade back to black.
    expect(backdrop!.className).toContain('scale-[1.75]');
    // And it has to recede: a lightly blurred, full-strength copy of the photo
    // merges with the photo in front and the card reads as one zoomed image.
    expect(backdrop!.className).toContain('blur-2xl');
    expect(backdrop!.className).toContain('opacity-60');
  });

  it('shapes the card as the 16:9 THUMB_FRAME_ASPECT declares', () => {
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

    expect(px('', 'w') / px('', 'h')).toBeCloseTo(THUMB_FRAME_ASPECT, 10);
    expect(px('sm:', 'w') / px('sm:', 'h')).toBeCloseTo(THUMB_FRAME_ASPECT, 10);
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
