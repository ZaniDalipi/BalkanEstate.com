import { describe, expect, it } from 'vitest';
import type { PublicSceneView } from '../../../../../types';
import { SHOWCASE_PHOTOS, showcaseMedia, showcaseModes } from './showcaseMedia';

const floorView = { viewKey: 'g', viewDirection: 'custom', sortOrder: 0, imageUrl: 'https://m/g.jpg', imageWidth: 1536, imageHeight: 1024, hotspots: [] } as PublicSceneView;

describe('showcaseMedia', () => {
  it('keeps the floor plan, keeping its shape', () => {
    expect(showcaseMedia({ floorplan: { url: 'https://m/p.png', width: 1200, height: 800 } }, [])).toEqual({ plan: { url: 'https://m/p.png', ratio: 1.5 } });
    expect(showcaseMedia({ floorplan: { url: 'https://m/p.png' } }, [])).toEqual({ plan: { url: 'https://m/p.png', ratio: 4 / 3 } });
  });

  it('gathers everything there is: plan, floor picture and photos (with their room tags, a handful at most)', () => {
    const photos = Array.from({ length: 12 }, (_, i) => ({ url: `https://m/${i}.jpg`, ...(i === 0 ? { tag: 'living_room' } : {}) }));
    const media = showcaseMedia({ floorplan: { url: 'https://m/p.png' } }, [{ url: '' }, ...photos], { view: floorView });
    expect(media).toEqual({ plan: { url: 'https://m/p.png', ratio: 4 / 3 }, floor: { view: floorView }, photos: photos.slice(0, SHOWCASE_PHOTOS) });
    expect(showcaseModes(media!)).toEqual(['plan', 'floor', 'photos']);
  });

  it('an apartment with only its floor picture shows that', () => {
    const media = showcaseMedia({}, [], { view: floorView });
    expect(showcaseModes(media!)).toEqual(['floor']);
  });

  it('is null when nothing was posted', () => {
    expect(showcaseMedia({ floorplan: { url: '' } }, [], null)).toBeNull();
  });
});
