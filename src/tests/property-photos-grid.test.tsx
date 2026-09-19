/**
 * The seller's listing preview shows a second thumbnail set below the gallery:
 * a grid of tiles. It used to ask the CDN for `c_fill` squares and cover them,
 * so a seller reviewing their own listing saw every photo cropped twice over —
 * once into a square, once again by the tile — and could not tell what a buyer
 * would actually get.
 *
 * It now uses the same card as everywhere else: 4:3, the photo whole, the bars
 * filled with a blurred copy of it.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { PropertyPhotos } from '@/src/components/property/PropertyPhotos';
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

const photo = (n: number) => `https://res.cloudinary.com/dh8tbq8wy/image/upload/v1700000000/listing/p${n}.jpg`;

const property = {
  id: 'p1',
  imageUrl: photo(0),
  images: [{ url: photo(1), tag: 'other' }],
  propertyType: 'apartment',
  city: 'Vlore',
  country: 'Albania',
} as unknown as Property;

const renderGrid = (overrides: Partial<Property> = {}) =>
  render(
    <PropertyPhotos
      property={{ ...property, ...overrides } as Property}
      activeCategory="all"
      currentImageIndex={0}
      onCategorySelect={() => {}}
      onImageSelect={() => {}}
    />
  );

/** The tiles are the only buttons carrying an `aspect-[…]` class. */
const tiles = (): HTMLElement[] =>
  Array.from(document.querySelectorAll<HTMLElement>('button[class*="aspect-["]'));

const reportNaturalSize = (img: HTMLImageElement, width: number, height: number) => {
  Object.defineProperty(img, 'naturalWidth', { value: width, configurable: true });
  Object.defineProperty(img, 'naturalHeight', { value: height, configurable: true });
  fireEvent.load(img);
};

beforeEach(() => {
  cleanup();
});

describe('seller listing preview — photo grid', () => {
  it('cuts its tiles to 4:3 rather than square', () => {
    renderGrid();
    expect(tiles()).toHaveLength(2);
    tiles().forEach((tile) => {
      expect(tile.className).toContain('aspect-[4/3]');
      expect(tile.className).not.toContain('aspect-square');
    });
  });

  it('asks the CDN not to crop', () => {
    renderGrid();
    // `c_fill` at a bare width crops to the requested box and upscales what is
    // smaller; `c_limit` does neither, leaving the framing to the tile.
    tiles().forEach((tile) => {
      // The photo itself, not the blurred fill behind it — the LQIP is a
      // 20px `c_fill` thumbnail by design.
      const src = tile.querySelector('img:not([aria-hidden="true"])')!.getAttribute('src')!;
      expect(src).toContain('c_limit');
      expect(src).not.toContain('c_fill');
    });
  });

  it('shows every photo whole, whatever shape it arrives in', () => {
    renderGrid();
    const photoOf = (tile: HTMLElement) =>
      tile.querySelector<HTMLImageElement>('img:not([aria-hidden="true"])')!;

    [[1600, 1200], [1920, 1080], [1080, 1920]].forEach(([w, h]) => {
      const img = photoOf(tiles()[0]);
      reportNaturalSize(img, w, h);
      expect(img.className).toContain('object-contain');
      expect(img.className).not.toContain('object-cover');
    });
  });

  it('fills the bars of an off-shape photo with a blurred copy of it', () => {
    renderGrid();
    const tile = tiles()[0];
    reportNaturalSize(tile.querySelector<HTMLImageElement>('img:not([aria-hidden="true"])')!, 1080, 1920);

    const fill = tile.querySelector<HTMLImageElement>('img[src*="e_blur"]');
    expect(fill).not.toBeNull();
    expect(fill!.className).toContain('object-cover');
    expect(fill!.getAttribute('src')).toContain('/listing/p0');
  });

  it('does not zoom the photo on hover', () => {
    // The tile clips its overflow, so scaling the photo inside it would crop
    // away exactly the edges this grid exists to show. The card's own ring and
    // lift carry the hover feedback instead.
    renderGrid();
    tiles().forEach((tile) => {
      expect(tile.innerHTML).not.toContain('group-hover:scale-110');
    });
  });

  it('falls back to a placeholder tile when a photo will not load', () => {
    renderGrid();
    const tile = tiles()[0];
    fireEvent.error(tile.querySelector<HTMLImageElement>('img:not([aria-hidden="true"])')!);

    // A dead URL used to leave the browser's broken-image glyph in the grid.
    expect(tile.querySelectorAll('img')).toHaveLength(0);
    expect(tile.querySelector('svg')).not.toBeNull();
    // The tile still says which photo it is, so its button keeps a name.
    expect(tile.textContent).toContain('Vlore');
  });
});
