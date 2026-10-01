/**
 * Delivery presets registered as named transformations (strict mode), and the
 * helper that turns any delivery URL back into the always-allowed original.
 */
process.env.SKIP_TEST_DB = 'true';

import {
  buildPresetDefinitions,
  boxPresetName,
  LQIP_PRESET,
  OG_PRESET,
  PRESET_WIDTHS,
  snapPresetRatio,
  snapPresetWidth,
  widthPresetName,
} from '../config/cloudinaryPresets';
import { originalCloudinaryUrl } from '../utils/cloudinaryUrl';

describe('buildPresetDefinitions', () => {
  const presets = buildPresetDefinitions();

  it('defines a width preset and every box ratio for each width, plus placeholder and share card', () => {
    expect(Object.keys(presets)).toHaveLength(2 + PRESET_WIDTHS.length * 7);
    expect(presets[LQIP_PRESET]).toBe('f_auto,q_auto:eco,w_32,e_blur:400');
    expect(presets[OG_PRESET]).toBe('f_jpg,q_auto,w_1200,h_630,c_pad,b_white');
    expect(presets[widthPresetName(480)]).toBe('f_auto,q_auto,c_limit,w_480');
    expect(presets[boxPresetName('4x3', 320)]).toBe('f_auto,q_auto,c_fill,g_auto,ar_4:3,w_320');
  });

  it('uses names Cloudinary accepts for named transformations', () => {
    for (const name of Object.keys(presets)) expect(name).toMatch(/^[a-z0-9_]+$/);
  });
});

describe('snapping', () => {
  it('rounds widths up and caps at the master size', () => {
    expect(snapPresetWidth(1)).toBe(32);
    expect(snapPresetWidth(481)).toBe(640);
    expect(snapPresetWidth(5000)).toBe(1920);
  });

  it('picks the nearest ratio', () => {
    expect(snapPresetRatio(800, 400)).toBe('2x1');
    expect(snapPresetRatio(216, 300)).toBe('3x4');
    expect(snapPresetRatio(100, 100)).toBe('1x1');
    expect(snapPresetRatio(1920, 1080)).toBe('16x9');
  });
});

describe('originalCloudinaryUrl', () => {
  it.each([
    ['https://res.cloudinary.com/demo/image/upload/t_be_w1600/v1/room.jpg', 'https://res.cloudinary.com/demo/image/upload/v1/room.jpg'],
    ['https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_1600,c_limit/v12/a/b.jpg', 'https://res.cloudinary.com/demo/image/upload/v12/a/b.jpg'],
    ['https://res.cloudinary.com/demo/image/upload/v1/room.jpg?x=1', 'https://res.cloudinary.com/demo/image/upload/v1/room.jpg'],
  ])('%s → %s', (input, expected) => {
    expect(originalCloudinaryUrl(input)).toBe(expected);
  });

  it('rejects anything that is not a Cloudinary image upload', () => {
    expect(originalCloudinaryUrl('https://res.cloudinary.com/demo/video/upload/v1/a.mp4')).toBeNull();
    expect(originalCloudinaryUrl('https://example.com/image/upload/v1/a.jpg')).toBeNull();
  });
});
