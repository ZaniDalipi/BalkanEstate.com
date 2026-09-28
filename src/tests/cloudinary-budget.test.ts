import { describe, it, expect } from 'vitest';
import {
  cloudinarySrcSet,
  optimizeCloudinaryUrl,
  snapCloudinaryWidth,
  CLOUDINARY_MAX_WIDTH,
  shouldProxyImage,
} from '../../config/cloudinaryConfig';

const SRC = 'https://res.cloudinary.com/demo/image/upload/v1/house.jpg';

/**
 * Cloudinary bills each distinct derivative, so the app must ask for a small,
 * fixed set of sizes rather than whatever width each component happens to want.
 */
describe('Cloudinary transformation budget', () => {
  it('rounds a width up to the next bucket', () => {
    expect(snapCloudinaryWidth(20)).toBe(32);
    expect(snapCloudinaryWidth(48)).toBe(64);
    expect(snapCloudinaryWidth(192)).toBe(240);
    expect(snapCloudinaryWidth(800)).toBe(800);
  });

  it('never asks for more than the stored master', () => {
    expect(snapCloudinaryWidth(2560)).toBe(CLOUDINARY_MAX_WIDTH);
    expect(optimizeCloudinaryUrl(SRC, { width: 2400 })).toContain(`w_${CLOUDINARY_MAX_WIDTH},c_limit`);
  });

  it('lets two components that want nearby sizes share one derivative', () => {
    expect(optimizeCloudinaryUrl(SRC, { width: 160, crop: 'fill' })).toBe(
      optimizeCloudinaryUrl(SRC, { width: 200, crop: 'fill' }),
    );
  });

  it('keeps an explicit width×height box exact', () => {
    expect(optimizeCloudinaryUrl(SRC, { width: 1200, height: 630, crop: 'pad' })).toContain('w_1200,h_630');
  });

  it('lists each srcSet candidate once after snapping', () => {
    const set = cloudinarySrcSet(SRC, [300, 320, 480]);
    expect(set.split(', ')).toHaveLength(2);
    expect(set).toContain(' 320w');
    expect(set).toContain(' 480w');
  });
});

describe('external images', () => {
  it('sends feed photos through the resizing proxy at a bucketed width', () => {
    const url = optimizeCloudinaryUrl('https://feed.example.com/photos/1.jpg', { width: 300 });
    expect(url).toContain('/image-proxy?url=https%3A%2F%2Ffeed.example.com%2Fphotos%2F1.jpg&w=320');
  });

  it('leaves hosts with their own CDN and SVGs alone', () => {
    expect(shouldProxyImage('https://upload.wikimedia.org/a.jpg')).toBe(false);
    expect(shouldProxyImage('https://images.unsplash.com/photo-1')).toBe(false);
    expect(shouldProxyImage('https://feed.example.com/logo.svg')).toBe(false);
    expect(shouldProxyImage('https://feed.example.com/a.jpg')).toBe(true);
  });
});
