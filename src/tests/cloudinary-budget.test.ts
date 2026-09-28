import { describe, it, expect } from 'vitest';
import {
  cloudinarySrcSet,
  optimizeCloudinaryUrl,
  snapCloudinaryWidth,
  CLOUDINARY_MAX_WIDTH,
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
