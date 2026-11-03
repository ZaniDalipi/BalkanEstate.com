import { describe, expect, it } from 'vitest';
import { movePhoto, residencePhotos } from './residencePhotos';

describe('residencePhotos', () => {
  it('puts the cover first, then the gallery, without repeats', () => {
    expect(residencePhotos({ coverImage: 'c', gallery: [{ url: 'a' }, { url: 'c' }, { url: 'b' }] })).toEqual(['c', 'a', 'b']);
    expect(residencePhotos({ gallery: [{ url: 'a' }] })).toEqual(['a']);
    expect(residencePhotos({})).toEqual([]);
  });
});

describe('movePhoto', () => {
  it('moves one photo, staying inside the list', () => {
    expect(movePhoto(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c']);
    expect(movePhoto(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']);
    expect(movePhoto(['a', 'b', 'c'], 2, 5)).toEqual(['a', 'b', 'c']);
    expect(movePhoto(['a', 'b', 'c'], -1, 0)).toEqual(['a', 'b', 'c']);
  });
});
