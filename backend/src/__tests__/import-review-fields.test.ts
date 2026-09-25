process.env.SKIP_TEST_DB = 'true';

import {
  detectIssues,
  diffReviewFields,
  hashReviewFields,
  sanitizeDraftPatch,
} from '../services/importReviewFields';

/**
 * A synced feed item is compared with the live listing to decide whether the
 * owner has to review a change. The comparison must ignore noise (a missing
 * value vs 0, re-hosted image URLs) or every sync would re-queue every listing.
 */
const listing = (overrides: Record<string, unknown> = {}) => ({
  title: 'Sea view apartment',
  description: 'Two bedrooms',
  price: 120000,
  city: 'Budva',
  country: 'Montenegro',
  address: 'Obala 1',
  beds: 2,
  baths: 1,
  sqft: 70,
  listingType: 'sale',
  propertyType: 'apartment',
  images: [{ url: 'https://src.example/a.jpg' }, { url: 'https://src.example/b.jpg' }],
  sourceMetadata: { originalImages: ['https://src.example/a.jpg', 'https://src.example/b.jpg'] },
  ...overrides,
});

describe('diffReviewFields', () => {
  it('reports nothing for an unchanged listing', () => {
    expect(diffReviewFields(listing(), listing())).toEqual([]);
  });

  it('names the fields the feed changed', () => {
    expect(diffReviewFields(listing({ price: 99000, sqft: 72 }), listing())).toEqual(['price', 'sqft']);
  });

  it('treats a missing value and an empty one as the same', () => {
    expect(diffReviewFields(listing({ parking: 0, address: '' }), listing({ address: undefined }))).toEqual([]);
  });

  it('compares photos by the source URLs, so re-hosting is not a change', () => {
    const live = listing({ images: [{ url: 'https://cdn.example/x.jpg' }, { url: 'https://cdn.example/y.jpg' }] });
    expect(diffReviewFields(listing(), live)).toEqual([]);
  });

  it('notices a photo added at the source', () => {
    const incoming = listing({
      sourceMetadata: { originalImages: ['https://src.example/a.jpg', 'https://src.example/b.jpg', 'https://src.example/c.jpg'] },
    });
    expect(diffReviewFields(incoming, listing())).toEqual(['images']);
  });
});

describe('hashReviewFields', () => {
  it('is stable for equal values and changes when a reviewed field does', () => {
    expect(hashReviewFields(listing())).toBe(hashReviewFields(listing()));
    expect(hashReviewFields(listing({ price: 1 }))).not.toBe(hashReviewFields(listing()));
  });

  it('ignores fields outside the review set', () => {
    expect(hashReviewFields(listing({ views: 10 }))).toBe(hashReviewFields(listing()));
  });
});

describe('detectIssues', () => {
  it('flags what parsing typically misses', () => {
    expect(detectIssues({ title: ' ', price: 0, images: [] })).toEqual(
      expect.arrayContaining(['missingTitle', 'missingPrice', 'missingCity', 'missingImages'])
    );
  });

  it('does not ask for a price on a negotiable listing', () => {
    expect(detectIssues(listing({ price: 0, isNegotiable: true, lat: 1, lng: 1 }))).toEqual([]);
  });
});

describe('sanitizeDraftPatch', () => {
  const current = listing();

  it('accepts corrected values', () => {
    const result = sanitizeDraftPatch({ price: '135000', city: ' Kotor ', beds: 3 }, current);
    expect(result).toEqual({ ok: true, set: { price: 135000, city: 'Kotor', beds: 3 } });
  });

  it('rejects fields that are not editable', () => {
    expect(sanitizeDraftPatch({ sellerId: 'x' }, current)).toMatchObject({ ok: false });
    expect(sanitizeDraftPatch({ status: 'active' }, current)).toMatchObject({ ok: false });
  });

  it('rejects out-of-range and malformed numbers', () => {
    expect(sanitizeDraftPatch({ price: -1 }, current)).toMatchObject({ ok: false });
    expect(sanitizeDraftPatch({ beds: 2.5 }, current)).toMatchObject({ ok: false });
    expect(sanitizeDraftPatch({ sqft: 'lots' }, current)).toMatchObject({ ok: false });
  });

  it('validates enums', () => {
    expect(sanitizeDraftPatch({ listingType: 'lease' }, current)).toMatchObject({ ok: false });
    expect(sanitizeDraftPatch({ propertyType: 'castle' }, current)).toMatchObject({ ok: false });
    expect(sanitizeDraftPatch({ propertyType: 'villa' }, current)).toEqual({ ok: true, set: { propertyType: 'villa' } });
  });

  it('lets photos be removed and reordered, updating the cover image', () => {
    const result = sanitizeDraftPatch({ images: ['https://src.example/b.jpg'] }, current);
    expect(result).toEqual({
      ok: true,
      set: { images: [{ url: 'https://src.example/b.jpg' }], imageUrl: 'https://src.example/b.jpg' },
    });
  });

  it('does not let an edit add photos the feed never had', () => {
    expect(sanitizeDraftPatch({ images: ['https://evil.example/x.jpg'] }, current)).toMatchObject({ ok: false });
  });
});
