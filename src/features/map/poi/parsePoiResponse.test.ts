import { describe, it, expect } from 'vitest';
import { parsePoiResponse } from './parsePoiResponse';

const good = { id: 'a', name: 'Spitali', category: 'health', lat: 41.3, lng: 19.8, rank: 1 };

describe('parsePoiResponse', () => {
  it('keeps well-formed places', () => {
    expect(parsePoiResponse({ pois: [good] })).toEqual([good]);
  });
  it('drops malformed ones instead of failing', () => {
    const bad = [null, 5, { ...good, name: ' ' }, { ...good, category: 'nope' }, { ...good, lat: 999 }, { ...good, lng: 'x' }, { ...good, id: 3 }];
    expect(parsePoiResponse({ pois: [...bad, good] })).toEqual([good]);
  });
  it('treats a missing or odd body as no places', () => {
    expect(parsePoiResponse(null)).toEqual([]);
    expect(parsePoiResponse({ pois: 'x' })).toEqual([]);
  });
});
