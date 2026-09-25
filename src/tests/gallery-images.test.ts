import { describe, it, expect } from 'vitest';
import { buildGalleryImages, groupGalleryImagesByTag } from '@/shared/property/galleryImages';

describe('buildGalleryImages', () => {
  it('keeps the seller-chosen tag on the cover photo', () => {
    const images = buildGalleryImages('a.jpg', [
      { url: 'a.jpg', tag: 'living_room' },
      { url: 'b.jpg', tag: 'wc' },
    ]);
    expect(images).toEqual([
      { url: 'a.jpg', tag: 'living_room' },
      { url: 'b.jpg', tag: 'wc' },
    ]);
  });

  it('adds a cover missing from images as exterior', () => {
    expect(buildGalleryImages('cover.jpg', [{ url: 'b.jpg', tag: 'kitchen' }])).toEqual([
      { url: 'cover.jpg', tag: 'exterior' },
      { url: 'b.jpg', tag: 'kitchen' },
    ]);
  });

  it('falls back to other for unknown or missing tags and drops duplicates', () => {
    expect(
      buildGalleryImages(undefined, [
        { url: 'a.jpg', tag: 'main' },
        { url: 'b.jpg' },
        { url: 'a.jpg', tag: 'kitchen' },
      ]),
    ).toEqual([
      { url: 'a.jpg', tag: 'other' },
      { url: 'b.jpg', tag: 'other' },
    ]);
  });
});

describe('groupGalleryImagesByTag', () => {
  it('groups in canonical tag order', () => {
    const groups = groupGalleryImagesByTag([
      { url: '1', tag: 'other' },
      { url: '2', tag: 'balcony' },
      { url: '3', tag: 'exterior' },
      { url: '4', tag: 'balcony' },
    ]);
    expect(Object.keys(groups)).toEqual(['exterior', 'balcony', 'other']);
    expect(groups.balcony).toHaveLength(2);
  });
});
