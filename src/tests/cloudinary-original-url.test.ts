import { describe, it, expect } from 'vitest';
import { cloudinaryOriginalUrl } from '@/config/cloudinaryConfig';

describe('cloudinaryOriginalUrl', () => {
  it('drops every transform before the version segment', () => {
    expect(
      cloudinaryOriginalUrl('https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_1600/v123/listings/room.jpg'),
    ).toBe('https://res.cloudinary.com/demo/image/upload/v123/listings/room.jpg');
  });

  it('leaves an untransformed upload URL as it is', () => {
    const url = 'https://res.cloudinary.com/demo/image/upload/v123/room.jpg';
    expect(cloudinaryOriginalUrl(url)).toBe(url);
  });

  it('leaves non-Cloudinary URLs as they are', () => {
    const url = 'https://example.com/room.jpg';
    expect(cloudinaryOriginalUrl(url)).toBe(url);
  });
});
