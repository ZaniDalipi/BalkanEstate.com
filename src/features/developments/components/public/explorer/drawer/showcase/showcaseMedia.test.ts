import { describe, expect, it } from 'vitest';
import { SHOWCASE_PHOTOS, showcaseMedia } from './showcaseMedia';

describe('showcaseMedia', () => {
  it('shows the floor plan when there is one, keeping its shape', () => {
    expect(showcaseMedia({ floorplan: { url: 'https://m/p.png', width: 1200, height: 800 } }, ['https://m/a.jpg'])).toEqual({ kind: 'plan', url: 'https://m/p.png', ratio: 1.5 });
    expect(showcaseMedia({ floorplan: { url: 'https://m/p.png' } }, [])).toEqual({ kind: 'plan', url: 'https://m/p.png', ratio: 4 / 3 });
  });

  it('falls back to the photos, a handful at most', () => {
    const photos = Array.from({ length: 12 }, (_, i) => `https://m/${i}.jpg`);
    const media = showcaseMedia({}, ['', ...photos]);
    expect(media).toEqual({ kind: 'photos', urls: photos.slice(0, SHOWCASE_PHOTOS) });
  });

  it('is null when nothing was posted', () => {
    expect(showcaseMedia({ floorplan: { url: '' } }, [])).toBeNull();
  });
});
