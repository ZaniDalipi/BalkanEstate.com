import { describe, it, expect } from 'vitest';
import { hasUnitMedia, planViewerPhotos, unitGallery, unitPhotos } from './unitGallery';

describe('unitGallery', () => {
  it('prefers the unit gallery', () => {
    expect(unitGallery({ gallery: [{ url: 'a' }] }, { id: 'l', images: [{ url: 'x' }] })).toEqual(['a']);
  });
  it('falls back to the primary listing photos, then its cover', () => {
    expect(unitGallery({ gallery: [] }, { id: 'l', images: [{ url: 'x' }] })).toEqual(['x']);
    expect(unitGallery({}, { id: 'l', images: [], imageUrl: 'cover' })).toEqual(['cover']);
    expect(unitGallery({}, undefined)).toEqual([]);
  });
});

describe('unitPhotos', () => {
  it('keeps the listing’s room tags so the showcase can label each photo', () => {
    expect(unitPhotos({}, { id: 'l', images: [{ url: 'x', tag: 'kitchen' }, { url: 'y' }] })).toEqual([{ url: 'x', tag: 'kitchen' }, { url: 'y' }]);
    expect(unitPhotos({ gallery: [{ url: 'a' }] }, { id: 'l', images: [{ url: 'x', tag: 'kitchen' }] })).toEqual([{ url: 'a' }]);
  });
});

describe('hasUnitMedia', () => {
  it('is true with a plan or any photo, false with neither', () => {
    expect(hasUnitMedia({ floorplan: { url: 'p' } })).toBe(true);
    expect(hasUnitMedia({}, { id: 'l', images: [], imageUrl: 'cover' })).toBe(true);
    expect(hasUnitMedia({ floorplan: { url: '' }, gallery: [{ url: '' }] }, { id: 'l', images: [] })).toBe(false);
  });
});

describe('planViewerPhotos', () => {
  const spot = { x: 10, y: 20, angle: 90 };
  it('keeps each own photo\'s floor plan spot', () => {
    expect(unitPhotos({ gallery: [{ url: 'a', floorplanSpot: spot }, { url: 'b' }] })).toEqual([{ url: 'a', floorplanSpot: spot }, { url: 'b' }]);
  });
  it('gives the viewer every photo once any is placed', () => {
    expect(planViewerPhotos([{ url: 'a', floorplanSpot: spot }, { url: 'b' }])).toEqual([
      { url: 'a', tag: 'other', floorplanSpot: spot },
      { url: 'b', tag: 'other' },
    ]);
  });
  it('is undefined when no photo is on the plan', () => {
    expect(planViewerPhotos([{ url: 'a' }])).toBeUndefined();
  });
});
