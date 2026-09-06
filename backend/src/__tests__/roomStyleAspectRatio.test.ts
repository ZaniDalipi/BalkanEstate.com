import { nearestSupportedAspectRatio, restyleOutputSize } from '../services/geminiService';

/**
 * The room styler asks the image model for the aspect ratio closest to the
 * source photo — without it the model reframes the scene and the restyled room
 * comes back zoomed in on the original.
 */
describe('nearestSupportedAspectRatio', () => {
  it('returns the exact ratio for common camera formats', () => {
    expect(nearestSupportedAspectRatio(1600, 1200)).toBe('4:3');
    expect(nearestSupportedAspectRatio(1200, 1600)).toBe('3:4');
    expect(nearestSupportedAspectRatio(3000, 2000)).toBe('3:2');
    expect(nearestSupportedAspectRatio(1920, 1080)).toBe('16:9');
    expect(nearestSupportedAspectRatio(1080, 1920)).toBe('9:16');
    expect(nearestSupportedAspectRatio(1024, 1024)).toBe('1:1');
  });

  it('rounds an odd ratio to the nearest supported one', () => {
    expect(nearestSupportedAspectRatio(1600, 1010)).toBe('3:2');
    expect(nearestSupportedAspectRatio(1000, 1030)).toBe('1:1');
    expect(nearestSupportedAspectRatio(2560, 1060)).toBe('21:9');
  });

  it('treats portrait and landscape symmetrically', () => {
    expect(nearestSupportedAspectRatio(1500, 1000)).toBe('3:2');
    expect(nearestSupportedAspectRatio(1000, 1500)).toBe('2:3');
  });

  it('falls back to 4:3 when the dimensions are unusable', () => {
    expect(nearestSupportedAspectRatio(undefined, undefined)).toBe('4:3');
    expect(nearestSupportedAspectRatio(0, 800)).toBe('4:3');
    expect(nearestSupportedAspectRatio(-100, 100)).toBe('4:3');
  });
});

/**
 * The generated image is upscaled for download and, when the model's output is
 * only marginally off the requested ratio, squared up to the source photo's
 * proportions so the before/after slider overlays exactly.
 */
describe('restyleOutputSize', () => {
  it('upscales a landscape image to the HQ long edge, keeping its ratio', () => {
    expect(restyleOutputSize(1024, 768)).toEqual({ width: 2048, height: 1536 });
  });

  it('upscales a portrait image on its long edge', () => {
    expect(restyleOutputSize(768, 1024)).toEqual({ width: 1536, height: 2048 });
  });

  it('snaps a small drift back onto the source ratio', () => {
    // Model returned 1024x768 (4:3) for a 1600x1180 source — corrected.
    const { width, height } = restyleOutputSize(1024, 768, 1600 / 1180);
    expect(width).toBe(2048);
    expect(height).toBe(Math.round(2048 / (1600 / 1180)));
  });

  it('keeps the model framing when the ratios differ too much to stretch', () => {
    // A 1:1 output against a 16:9 source is far outside the tolerance.
    expect(restyleOutputSize(1024, 1024, 16 / 9)).toEqual({ width: 2048, height: 2048 });
  });

  it('does not downscale an image that is already larger than the HQ long edge', () => {
    expect(restyleOutputSize(3000, 2000)).toEqual({ width: 3000, height: 2000 });
  });

  it('returns the dimensions untouched when they are unusable', () => {
    expect(restyleOutputSize(0, 0)).toEqual({ width: 0, height: 0 });
  });
});
