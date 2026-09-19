/**
 * On a phone the hero frame was 16:9 — about 220px of picture across a 390px
 * screen, shorter than the controls stacked above and below it, so the listing's
 * own photos were the smallest thing on the page. The frame is now 4:3 up to
 * Tailwind's `sm` and 16:9 from there.
 *
 * What goes inside it no longer depends on that shape at all: the carousel
 * crops nothing. A buyer judging a house should see the whole photo the seller
 * uploaded, so every photo is fitted into the frame whole and the bars it
 * leaves are filled with a blurred copy of itself. These tests pin the frame
 * and that rule.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { PropertyGallery } from '@/src/components/property/PropertyGallery';
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

const baseProperty = {
  id: 'p1',
  imageUrl: photo(0),
  images: [{ url: photo(1), tag: 'other' }],
  propertyType: 'apartment',
  listingType: 'sale',
  city: 'Tirana',
  country: 'Albania',
  price: 215000,
  lat: 41.3,
  lng: 19.8,
} as unknown as Property;

const renderGallery = (property: Property = baseProperty) =>
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

/**
 * The frame is the only element carrying an `aspect-[…]` class; the photos
 * inside it are absolutely positioned to its edges.
 */
const frame = (): HTMLElement => {
  const el = document.querySelector<HTMLElement>('[class*="aspect-["]');
  if (!el) throw new Error('gallery frame not found');
  return el;
};

/** Points `useMediaQuery` at a viewport at or above Tailwind's `sm`. */
const useWideViewport = () => {
  vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({
    matches: query.includes('min-width: 640px'),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }) as unknown as MediaQueryList);
};

const slide = (): HTMLImageElement => {
  const img = document.querySelector<HTMLImageElement>('img[data-gallery-url]');
  if (!img) throw new Error('carousel slide not found');
  return img;
};

/** Fakes a decode so the carousel learns the photo's real shape. */
const reportNaturalSize = (img: HTMLImageElement, width: number, height: number) => {
  Object.defineProperty(img, 'naturalWidth', { value: width, configurable: true });
  Object.defineProperty(img, 'naturalHeight', { value: height, configurable: true });
  fireEvent.load(img);
};

beforeEach(() => {
  cleanup();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('gallery frame height', () => {
  it('gives a phone a 4:3 frame and keeps 16:9 from sm up', () => {
    renderGallery();
    // Mobile-first: the bare class is the phone's, the sm: variant the desktop's.
    expect(frame().className).toContain('aspect-[4/3]');
    expect(frame().className).toContain('sm:aspect-[16/9]');
  });

  it('leaves a video embed at the shape it was authored in', () => {
    // A YouTube embed is 16:9 at every width; a 4:3 box around it would add
    // letterboxing, not picture.
    renderGallery({ ...baseProperty, tourUrl: 'https://www.youtube.com/watch?v=abc123' } as Property);
    expect(frame().className).toContain('aspect-[16/9]');
    expect(frame().className).not.toContain('aspect-[4/3]');
  });
});

describe('the carousel never crops', () => {
  const SHAPES: Array<[string, number, number]> = [
    ['4:3, the commonest listing shape', 1600, 1200],
    ['16:9, a wide room shot', 1920, 1080],
    ['3:4, a gentle portrait', 1200, 1600],
    ['9:16, shot on a phone held upright', 1080, 1920],
  ];

  it.each(SHAPES)('shows a %s photo whole', (_label, width, height) => {
    renderGallery();
    reportNaturalSize(slide(), width, height);
    expect(slide().className).toContain('object-contain');
    expect(slide().className).not.toContain('object-cover');
  });

  it('frames a photo the same way at every width', () => {
    // Framing used to be read from the frame's aspect ratio, which lived in JS
    // while the frame itself was a CSS class — so a phone could judge a photo
    // against the desktop shape and letterbox it for nothing. Nothing crops
    // now, so there is no viewport-dependent decision left to get wrong.
    useWideViewport();
    renderGallery();
    reportNaturalSize(slide(), 1600, 1200);
    expect(slide().className).toContain('object-contain');
  });
});

describe('the bars the fit leaves', () => {
  /** The blurred fill sits behind the photo, inside the same slide. */
  const backdrop = (): HTMLImageElement | null =>
    document.querySelector<HTMLImageElement>('img[aria-hidden="true"][class*="blur-3xl"]');

  it('is filled with a blurred copy of the same photo', () => {
    renderGallery();
    const fill = backdrop();
    expect(fill).not.toBeNull();
    // It must cover — a contained backdrop would leave the same bars it is
    // there to hide — and be this photo, not a generic placeholder.
    expect(fill!.className).toContain('object-cover');
    expect(fill!.getAttribute('src')).toContain('e_blur');
    expect(fill!.getAttribute('src')).toContain('/listing/p0');
    // A CSS blur samples past the element as transparent, so the fill has to
    // overflow by more than its blur radius or the edges fade back to black.
    expect(fill!.className).toContain('scale-150');
  });

  it('stands the photo in for its own fill when the CDN has no placeholder', () => {
    // An off-CDN photo has no LQIP to blur. Reusing the photo the slide is
    // already fetching costs no second request and keeps the bars off black.
    const external = 'https://example.com/listing/photo.jpg';
    renderGallery({ ...baseProperty, imageUrl: external } as Property);

    const fill = backdrop();
    expect(fill).not.toBeNull();
    expect(fill!.getAttribute('src')).toContain(encodeURIComponent(external));
  });
});
