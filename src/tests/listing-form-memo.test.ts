import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { UNRENDERED_LISTING_FIELDS, listingDataEqual } from
  '@/src/features/seller/components/ListingFormFields';
import { initialListingData } from '@/src/features/seller/components/ListingFormHelpers';

const SOURCE = fs.readFileSync(
  path.resolve(__dirname, '../features/seller/components/ListingFormFields.tsx'),
  'utf8',
);

/** Every `listingData.x` the component reads. */
const readFields = new Set(
  [...SOURCE.matchAll(/listingData\.([a-zA-Z_]+)/g)].map((match) => match[1]),
);

describe('the create-listing form re-renders when a field it shows changes', () => {
  /**
   * The invariant behind a whole class of "the input is frozen" bugs: this
   * component is memoised, so any field it renders must take part in the
   * comparison. When `openPlanArea` and `parkingType` were added and left out,
   * typing in them changed the state and nothing on screen moved.
   */
  it('never excludes a field the component actually reads', () => {
    const excludedButRead = [...UNRENDERED_LISTING_FIELDS].filter((field) => readFields.has(field));
    expect(excludedButRead).toEqual([]);
  });

  it('reports a change to every field it reads', () => {
    const bump = (value: unknown): unknown => {
      if (typeof value === 'number') return value + 1;
      if (typeof value === 'string') return `${value}x`;
      if (typeof value === 'boolean') return !value;
      return value;
    };

    const unnoticed: string[] = [];
    for (const field of readFields) {
      const before = initialListingData[field as keyof typeof initialListingData];
      const after = bump(before);
      // Arrays and objects are compared by identity, which a bump cannot
      // change meaningfully; the fields that matter here are all primitives.
      if (after === before) continue;

      const changed = { ...initialListingData, [field]: after };
      if (listingDataEqual(initialListingData, changed)) unnoticed.push(field);
    }

    expect(unnoticed).toEqual([]);
  });

  it('ignores the heavy fields it does not render, which is why the memo exists', () => {
    for (const field of ['description', 'image_tags', 'amenities']) {
      const changed = { ...initialListingData, [field]: 'something else' };
      expect(listingDataEqual(initialListingData, changed), field).toBe(true);
    }
  });

  it('treats the same object as equal without walking it', () => {
    expect(listingDataEqual(initialListingData, initialListingData)).toBe(true);
  });
});
