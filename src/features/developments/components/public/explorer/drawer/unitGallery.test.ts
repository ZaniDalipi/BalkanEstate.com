import { describe, it, expect } from 'vitest';
import { unitGallery } from './unitGallery';

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
