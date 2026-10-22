import { describe, it, expect } from 'vitest';
import { checkImageFile, slugifyViewKey, uniqueViewKey, MAX_IMAGE_BYTES } from './imageFile';

describe('scene image checks', () => {
  it('accepts jpeg/png/webp/avif up to 10 MB', () => {
    expect(checkImageFile({ type: 'image/jpeg', size: 1000 })).toBeNull();
    expect(checkImageFile({ type: 'image/avif', size: MAX_IMAGE_BYTES })).toBeNull();
    expect(checkImageFile({ type: 'image/gif', size: 1000 })).toBe('type');
    expect(checkImageFile({ type: 'image/png', size: MAX_IMAGE_BYTES + 1 })).toBe('size');
  });
});

describe('view keys', () => {
  it('slugifies names in Latin and Cyrillic', () => {
    expect(slugifyViewKey('Front façade — East')).toBe('front-facade-east');
    expect(slugifyViewKey('Предна страна')).toBe('predna-strana');
    expect(slugifyViewKey('Južna strana')).toBe('juzna-strana');
  });

  it('is unique per target and falls back sensibly', () => {
    expect(uniqueViewKey('Front', ['front'])).toBe('front-2');
    expect(uniqueViewKey('Front', ['front', 'front-2'])).toBe('front-3');
    expect(uniqueViewKey('', [])).toBe('main');
    expect(uniqueViewKey('Πρόσοψη', ['main'])).toBe('view');
  });
});
