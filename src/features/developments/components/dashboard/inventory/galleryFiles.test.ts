import { describe, it, expect } from 'vitest';
import { checkGalleryFiles } from './galleryFiles';

const file = (type = 'image/jpeg', size = 1000) => {
  const f = new File(['x'], 'a', { type });
  Object.defineProperty(f, 'size', { value: size });
  return f;
};

describe('checkGalleryFiles', () => {
  it('accepts jpeg/png/webp/avif within limits', () => {
    expect(checkGalleryFiles([file(), file('image/png'), file('image/webp'), file('image/avif')], 0)).toBeNull();
  });
  it('rejects other types, oversized files, big batches and full galleries', () => {
    expect(checkGalleryFiles([file('image/gif')], 0)).toBe('type');
    expect(checkGalleryFiles([file('image/jpeg', 11 * 1024 * 1024)], 0)).toBe('size');
    expect(checkGalleryFiles(Array.from({ length: 11 }, () => file()), 0)).toBe('batch');
    expect(checkGalleryFiles([file(), file()], 29)).toBe('full');
    expect(checkGalleryFiles([file()], 29)).toBeNull();
  });
});
