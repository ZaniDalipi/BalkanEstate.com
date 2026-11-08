import { describe, expect, it } from 'vitest';
import { holeMask } from './holeMask';

describe('holeMask', () => {
  it('is an inline SVG covering the picture with the apartment cut out', () => {
    const mask = holeMask(1600, 900, [[100, 50], [200, 50], [200.04, 120]]);
    expect(mask.startsWith('url("data:image/svg+xml,')).toBe(true);
    const svg = decodeURIComponent(mask.slice('url("data:image/svg+xml,'.length, -2));
    expect(svg).toContain("viewBox='0 0 1600 900'");
    expect(svg).toContain("preserveAspectRatio='none'");
    expect(svg).toContain("fill-rule='evenodd'");
    expect(svg).toContain('M0 0H1600V900H0Z');
    expect(svg).toContain('M100 50L200 50L200 120Z');
  });
});
