import { describe, it, expect } from 'vitest';
import { gallerySpotChanges, placedCount } from './unitPhotoSpots';

const A = { url: 'a', floorplanSpot: { x: 1, y: 2, angle: 90 } };
const B = { url: 'b' };
const C = { url: 'c', floorplanSpot: { x: 5, y: 5, angle: 0 } };

describe('gallerySpotChanges', () => {
  it('sends only added, moved and removed spots, by URL', () => {
    expect(gallerySpotChanges([A, B, C], [{ x: 1, y: 2, angle: 90 }, { x: 40, y: 60, angle: 180 }, undefined])).toEqual([
      { url: 'b', spot: { x: 40, y: 60, angle: 180 } },
      { url: 'c', spot: null },
    ]);
  });

  it('drops extra fields such as floor', () => {
    expect(gallerySpotChanges([B], [{ x: 1, y: 1, angle: 0, floor: 0 } as never])).toEqual([{ url: 'b', spot: { x: 1, y: 1, angle: 0 } }]);
  });

  it('is empty when nothing moved', () => {
    expect(gallerySpotChanges([A, B], [A.floorplanSpot, undefined])).toEqual([]);
  });
});

describe('placedCount', () => {
  it('counts photos with a spot', () => expect(placedCount([A, B, C])).toBe(2));
});
