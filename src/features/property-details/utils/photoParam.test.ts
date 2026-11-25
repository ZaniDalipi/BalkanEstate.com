import { describe, expect, it } from 'vitest';
import { parsePhotoParam, resolveViewerImages, withPhotoParam } from './photoParam';

describe('parsePhotoParam', () => {
  it('reads the 1-based photo number as a 0-based index', () => {
    expect(parsePhotoParam('?photo=3', 7)).toBe(2);
  });
  it('ignores a missing, malformed or out-of-range photo', () => {
    expect(parsePhotoParam('', 7)).toBeNull();
    expect(parsePhotoParam('?photo=abc', 7)).toBeNull();
    expect(parsePhotoParam('?photo=0', 7)).toBeNull();
    expect(parsePhotoParam('?photo=8', 7)).toBeNull();
    expect(parsePhotoParam('?photo=1.5', 7)).toBeNull();
  });
});

describe('withPhotoParam', () => {
  it('sets the photo and keeps other params', () => {
    expect(withPhotoParam('?ref=share', 1)).toBe('?ref=share&photo=2');
  });
  it('removes the photo, leaving no stray "?"', () => {
    expect(withPhotoParam('?photo=2', null)).toBe('');
    expect(withPhotoParam('?photo=2&ref=x', null)).toBe('?ref=x');
  });
});

describe('resolveViewerImages', () => {
  const all = [{ url: 'a' }, { url: 'b' }, { url: 'c' }];
  it('pages through the current category when the photo is in it', () => {
    const category = [all[1], all[2]];
    expect(resolveViewerImages(all, category, 2)).toEqual({ images: category, start: 1 });
  });
  it('falls back to every photo when the category does not hold it', () => {
    expect(resolveViewerImages(all, [all[1]], 0)).toEqual({ images: all, start: 0 });
  });
});
