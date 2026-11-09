import { describe, expect, it } from 'vitest';
import type { Hotspot, PublicSceneView } from '../../../../../types';
import { pickFloorShot, regionOutline } from './floorShot';

const region = (id: string, linkId: string, linkType: Hotspot['linkType'] = 'unit', points: number[][] = [[0.1, 0.1], [0.3, 0.3]]): Hotspot => ({
  id, shape: 'rect', points, linkType, linkId, z: 0,
});
const view = (viewKey: string, hotspots: Hotspot[], imageUrl = `https://media.test/${viewKey}.jpg`): PublicSceneView => ({
  viewKey, viewDirection: 'custom', sortOrder: 0, imageUrl, imageWidth: 1536, imageHeight: 1024, hotspots,
});
const rectOutline = [[0.1, 0.1], [0.3, 0.1], [0.3, 0.3], [0.1, 0.3]];

describe('pickFloorShot', () => {
  it('shows the apartment on the floor picture where it is marked (its own region, not a listing’s)', () => {
    const plain = view('plain', [region('x', 'other')]);
    const marked = view('marked', [region('l', 'u1', 'listing'), region('a', 'u1')]);
    expect(pickFloorShot([plain, marked], 'u1')).toEqual({ view: marked, region: rectOutline });
  });

  it('still shows the floor when the apartment is not marked on it', () => {
    const plain = view('plain', []);
    expect(pickFloorShot([plain], 'u1')).toEqual({ view: plain });
  });

  it('skips views without an image and a mark that cannot be drawn', () => {
    const empty = view('empty', [region('a', 'u1')], '');
    const broken = view('broken', [region('a', 'u1', 'unit', [[Number.NaN, 0], [0.2, 0.2]])]);
    expect(pickFloorShot([empty, broken], 'u1')).toEqual({ view: broken });
  });

  it('is null when the floor has no picture', () => {
    expect(pickFloorShot([], 'u1')).toBeNull();
    expect(pickFloorShot([view('empty', [], '')], 'u1')).toBeNull();
  });
});

describe('regionOutline', () => {
  it('turns a rectangle into its four corners and keeps a polygon', () => {
    expect(regionOutline({ shape: 'rect', points: [[0.1, 0.1], [0.3, 0.3]] })).toEqual(rectOutline);
    expect(regionOutline({ shape: 'polygon', points: [[0, 0], [1, 0], [0.5, 1]] })).toEqual([[0, 0], [1, 0], [0.5, 1]]);
  });

  it('keeps the outline on the picture', () => {
    expect(regionOutline({ shape: 'polygon', points: [[-0.2, 0], [1.4, 0], [0.5, 1]] })).toEqual([[0, 0], [1, 0], [0.5, 1]]);
  });

  it('refuses points that are not numbers and shapes that enclose nothing', () => {
    expect(regionOutline({ shape: 'polygon', points: [[0, 0], [1, Number.POSITIVE_INFINITY], [0.5, 1]] })).toBeNull();
    expect(regionOutline({ shape: 'polygon', points: [[0, 0], [1]] as number[][] })).toBeNull();
    expect(regionOutline({ shape: 'polygon', points: [[0, 0], [0.5, 0.5], [1, 1]] })).toBeNull();
    expect(regionOutline({ shape: 'rect', points: [[0.2, 0.2], [0.2, 0.6]] })).toBeNull();
  });
});
