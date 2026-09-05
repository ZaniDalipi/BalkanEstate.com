/**
 * The gallery used to render exactly one <img> and swap its `key` on every
 * navigation, so each photo change unmounted the current image and mounted a
 * fresh one — a new fetch and a new decode, with a blurred placeholder on
 * screen for the whole trip.
 *
 * These tests pin the replacement behaviour: neighbouring photos stay mounted
 * and none of them defers its fetch, so stepping between them is a transform on
 * an image that is already decoded.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { PropertyGallery } from '@/src/components/property/PropertyGallery';
import { GALLERY_WIDTHS } from '@/config/galleryImages';
import type { Property } from '@/types';

// The component calls t() both as t(key, 'fallback') and t(key, { defaultValue }).
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

const photo = (n: number) => `https://test-zone.b-cdn.net/balkan-estate/listing/p${n}.webp`;

const property = {
  id: 'p1',
  imageUrl: photo(0),
  images: Array.from({ length: 10 }, (_, i) => ({ url: photo(i + 1), tag: 'other' })),
  propertyType: 'apartment',
  listingType: 'sale',
  city: 'Tirana',
  country: 'Albania',
  price: 215000,
  lat: 41.3,
  lng: 19.8,
} as unknown as Property;

/** The main carousel photos, excluding LQIP backdrops and the thumbnail strip. */
const slideImages = (): HTMLImageElement[] =>
  Array.from(document.querySelectorAll<HTMLImageElement>('img[data-gallery-url]'));

const renderGallery = (currentImageIndex: number) =>
  render(
    <PropertyGallery
      property={property}
      onOpenEditor={() => {}}
      onOpenViewer={() => {}}
      activeCategory="all"
      currentImageIndex={currentImageIndex}
      onCategoryChange={() => {}}
      onImageIndexChange={() => {}}
    />
  );

beforeEach(() => {
  cleanup();
});

describe('PropertyGallery slide track', () => {
  it('keeps the neighbouring photos mounted, not just the visible one', () => {
    renderGallery(4);
    // The visible photo plus two either way: swiping or auto-rotating reaches
    // an element that is already in the DOM and already decoded.
    expect(slideImages().map((img) => img.dataset.galleryUrl)).toEqual([
      photo(2), photo(3), photo(4), photo(5), photo(6),
    ]);
  });

  it('wraps the window around the ends of the strip', () => {
    renderGallery(0);
    // Photo 0 is the property's own imageUrl, so the strip is p0, p1 … p10.
    expect(slideImages().map((img) => img.dataset.galleryUrl)).toEqual([
      photo(0), photo(1), photo(2), photo(9), photo(10),
    ]);
  });

  it('never defers a mounted slide with lazy loading', () => {
    renderGallery(4);
    // `loading="lazy"` on an off-screen-but-mounted slide would postpone
    // exactly the fetch the preload is racing to finish.
    slideImages().forEach((img) => expect(img.getAttribute('loading')).toBe('eager'));
  });

  it('prioritises the visible photo over the ones waiting in the wings', () => {
    renderGallery(4);
    const priorities = Object.fromEntries(
      slideImages().map((img) => [img.dataset.galleryUrl, img.getAttribute('fetchpriority')])
    );
    expect(priorities[photo(4)]).toBe('high');
    expect(priorities[photo(3)]).toBe('low');
    expect(priorities[photo(5)]).toBe('low');
  });

  it('offers the full candidate set and CORS mode the warm-up replays', () => {
    renderGallery(0);
    const active = slideImages().find((img) => img.dataset.galleryUrl === photo(0))!;
    GALLERY_WIDTHS.forEach((w) => expect(active.getAttribute('srcset')).toContain(`width=${w}`));
    // Must match the preloader, or the warmed bytes cannot satisfy this request.
    expect(active.getAttribute('crossorigin')).toBe('anonymous');
  });

  it('starts each photo hidden behind its blur and reveals it on load', () => {
    renderGallery(0);
    const active = slideImages().find((img) => img.dataset.galleryUrl === photo(0))!;
    expect(active.style.opacity).toBe('0');
    expect(active.style.transition).toContain('opacity');
  });

  it('shows a shimmer only while a photo is still in flight', () => {
    renderGallery(0);
    const shimmers = document.querySelectorAll('.gallery-shimmer');
    // One per mounted slide while nothing has loaded yet in jsdom.
    expect(shimmers.length).toBe(slideImages().length);
  });

  it('fetches the first screenful of thumbnails up front rather than on scroll', () => {
    renderGallery(0);
    const thumbs = Array.from(document.querySelectorAll<HTMLImageElement>('img')).filter((img) =>
      img.getAttribute('src')?.includes('width=390')
    );
    expect(thumbs).toHaveLength(11);
    // The strip scrolls horizontally, so a fully lazy strip pops in under the
    // user's finger. The visible run is eager; the tail off-screen stays lazy.
    expect(thumbs.slice(0, 6).map((t) => t.getAttribute('loading'))).toEqual(Array(6).fill('eager'));
    expect(thumbs.slice(6).every((t) => t.getAttribute('loading') === 'lazy')).toBe(true);
  });
});
