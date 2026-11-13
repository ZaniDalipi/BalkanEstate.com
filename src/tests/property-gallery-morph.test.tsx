/**
 * The listing hero changes photo through the WebGL morph where it can, and
 * must drop back to the plain slide track wherever it cannot: no WebGL, a
 * context the browser refuses, or a photo that cannot be textured (no CORS).
 * Those fallbacks are the difference between "no effect" and "black box".
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, waitFor } from '@testing-library/react';
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

// Photos never finish loading in jsdom; each test decides how a load ends.
const loadTextureImage = vi.fn((_src: string) => new Promise<HTMLImageElement>(() => {}));
vi.mock('@/src/components/ui/morph-gallery/morphGl', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/src/components/ui/morph-gallery/morphGl')>();
  return { ...actual, loadTextureImage: (src: string) => loadTextureImage(src) };
});

/** Enough of a WebGL context for the program to "compile": every call succeeds. */
const fakeGl = () =>
  new Proxy({} as Record<string, unknown>, {
    get: (_t, prop: string) => {
      if (/^[A-Z_0-9]+$/.test(prop)) return 0;
      if (prop === 'getShaderParameter' || prop === 'getProgramParameter') return () => true;
      return () => ({});
    },
  });

const photo = (n: number) => `https://media.test/listing/p${n}/original.jpg`;

const property = {
  id: 'p1',
  imageUrl: photo(0),
  images: Array.from({ length: 4 }, (_, i) => ({ url: photo(i + 1), tag: 'other' })),
  propertyType: 'apartment',
  listingType: 'sale',
  city: 'Tirana',
  country: 'Albania',
  price: 215000,
  lat: 41.3,
  lng: 19.8,
} as unknown as Property;

const renderGallery = () =>
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

const slideImages = () => document.querySelectorAll('img[data-gallery-url]');
const morphStage = () => document.querySelector('[data-testid="listing-morph-stage"]');

const withWebGL = (context: unknown) => {
  vi.stubGlobal('WebGLRenderingContext', class {});
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as RenderingContext);
};

beforeEach(() => {
  cleanup();
  loadTextureImage.mockReset();
  loadTextureImage.mockImplementation(() => new Promise(() => {}));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('PropertyGallery morph transition', () => {
  it('keeps the slide track in a browser without WebGL', () => {
    renderGallery();
    expect(morphStage()).toBeNull();
    expect(slideImages().length).toBeGreaterThan(0);
  });

  it('draws the photos on the morph canvas when WebGL is there', () => {
    withWebGL(fakeGl());
    renderGallery();
    expect(morphStage()?.querySelector('canvas')).not.toBeNull();
    expect(slideImages()).toHaveLength(0);
  });

  it('loads textures for the visible photo and its neighbours only, sized and via the CDN', () => {
    withWebGL(fakeGl());
    renderGallery();
    const requested = loadTextureImage.mock.calls.map(([src]) => src);
    // 5 photos, radius 2 round photo 0: all of them, the visible one first.
    expect(requested).toHaveLength(5);
    expect(requested[0]).toContain('/listing/p0/');
    requested.forEach((src) => expect(src).toMatch(/^https:\/\/media\.test\/.*\/w\d+\.webp$/));
  });

  it('falls back to the slide track when the browser refuses a WebGL context', async () => {
    withWebGL(null);
    renderGallery();
    await waitFor(() => expect(slideImages().length).toBeGreaterThan(0));
    expect(morphStage()).toBeNull();
  });

  it('falls back to the slide track when a photo cannot be textured', async () => {
    withWebGL(fakeGl());
    loadTextureImage.mockImplementation(() => Promise.reject(new Error('no CORS')));
    renderGallery();
    await waitFor(() => expect(slideImages().length).toBeGreaterThan(0));
    expect(morphStage()).toBeNull();
  });
});
