/**
 * On a phone the hero frame was 16:9 — about 220px of picture across a 390px
 * screen, shorter than the controls stacked above and below it, so the listing's
 * own photos were the smallest thing on the page. The frame is now 4:3 up to
 * Tailwind's `sm` and 16:9 from there.
 *
 * The height is only half of it. The carousel decides whether to fill the frame
 * or show a photo whole from the frame's aspect ratio, and that number lives in
 * JS while the frame itself is a CSS class — so these tests pin both halves and,
 * more importantly, that they agree: a portrait that fits the taller phone frame
 * must actually fill it rather than be judged against the desktop shape.
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

describe('framing follows the frame the photo is drawn in', () => {
  it('fills the taller phone frame with a portrait the 16:9 frame would letterbox', () => {
    renderGallery();
    reportNaturalSize(slide(), 1200, 1600); // 3:4
    // Cropping 3:4 into 4:3 keeps well over half the photo; into 16:9 it does
    // not. Reading the desktop number on a phone is what put bars here.
    expect(slide().className).toContain('object-cover');
  });

  it('still shows that portrait whole in the 16:9 frame above sm', () => {
    useWideViewport();
    renderGallery();
    reportNaturalSize(slide(), 1200, 1600);
    expect(slide().className).toContain('object-contain');
  });

  it('shows a phone portrait whole at every width', () => {
    // 9:16 loses roughly two thirds either way — the taller frame is not a
    // licence to crop anything.
    renderGallery();
    reportNaturalSize(slide(), 1080, 1920);
    expect(slide().className).toContain('object-contain');
  });
});
