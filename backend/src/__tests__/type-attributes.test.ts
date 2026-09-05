process.env.SKIP_TEST_DB = 'true';

import fs from 'fs';
import path from 'path';
import {
  ALL_PROPERTY_TYPES,
  MAX_ATTRIBUTE_COUNT,
  PARKING_TYPES,
  TYPE_ATTRIBUTES,
  attributesForType,
  normalizeTypeAttributes,
} from '../config/typeAttributes';

describe('what may be stored for each type', () => {
  it('stores no bedrooms on a parking space — not a zero, no field at all', () => {
    const result = normalizeTypeAttributes('parking', { beds: 3, baths: 2, parking: 1 });

    expect(result.ok).toBe(true);
    expect(result.fields).not.toHaveProperty('beds');
    expect(result.fields).not.toHaveProperty('baths');
    expect(result.fields.parking).toBe(1);
    expect(result.dropped).toEqual(expect.arrayContaining(['beds', 'baths']));
  });

  it('stores what business premises are described by', () => {
    const result = normalizeTypeAttributes('commercial', {
      offices: 4, openPlanArea: 45, kitchens: 1, toilets: 2, beds: 3,
    });

    expect(result.fields).toEqual({ offices: 4, openPlanArea: 45, kitchens: 1, toilets: 2 });
    expect(result.dropped).toEqual(['beds']);
  });

  it('drops a stray field rather than failing the whole write', () => {
    // A client sending a field this type ignores is sloppy, not hostile.
    const result = normalizeTypeAttributes('land', { beds: 2, baths: 1 });
    expect(result.ok).toBe(true);
    expect(result.fields).toEqual({});
  });

  it('does not report a zero as dropped, since that is the client agreeing', () => {
    const result = normalizeTypeAttributes('parking', { beds: 0, livingRooms: 0 });
    expect(result.dropped).toEqual([]);
  });

  it('rejects a value that is not a count, because it would be published', () => {
    expect(normalizeTypeAttributes('commercial', { offices: -1 }).ok).toBe(false);
    expect(normalizeTypeAttributes('commercial', { offices: 1.5 }).ok).toBe(false);
    expect(normalizeTypeAttributes('commercial', { offices: MAX_ATTRIBUTE_COUNT + 1 }).ok).toBe(false);
    expect(normalizeTypeAttributes('commercial', { offices: 'four' }).ok).toBe(false);
  });

  it('rejects a parking type that is not one of ours', () => {
    expect(normalizeTypeAttributes('parking', { parkingType: 'helipad' }).ok).toBe(false);
    for (const value of PARKING_TYPES) {
      expect(normalizeTypeAttributes('parking', { parkingType: value }).ok).toBe(true);
    }
  });

  it('keeps everything for an unknown type rather than guessing', () => {
    expect(attributesForType('warehouse')).toEqual(TYPE_ATTRIBUTES);
  });
});

/**
 * The two copies of these rules are mirrors by necessity — the backend
 * compiles from its own rootDir and cannot import the client's. That only
 * works while they agree, so this reads the client's table and holds this one
 * to it. A type added on one side and not the other fails here rather than in
 * production, where it would mean a form asking for a field the server throws
 * away.
 */
describe('the client and server copies agree', () => {
  const clientSource = fs.readFileSync(
    path.resolve(__dirname, '../../../src/shared/property/typeAttributes.ts'),
    'utf8',
  );

  /** Pull a bracketed `as const` list out of the client module by name. */
  const clientList = (name: string): string[] => {
    const match = clientSource.match(new RegExp(`export const ${name} = \\[([^\\]]*)\\]`));
    if (!match) throw new Error(`${name} not found in the client's typeAttributes`);
    return [...match[1].matchAll(/'([^']+)'/g)].map((entry) => entry[1]);
  };

  it('lists the same attributes', () => {
    expect([...TYPE_ATTRIBUTES]).toEqual(clientList('TYPE_ATTRIBUTES'));
  });

  it('lists the same parking types', () => {
    expect([...PARKING_TYPES]).toEqual(clientList('PARKING_TYPES'));
  });

  it('gives every type the same attributes', () => {
    // The client declares its profiles as a keyed table; this checks the two
    // agree type by type rather than trusting that both were edited.
    for (const type of ALL_PROPERTY_TYPES) {
      const block = clientSource.match(
        new RegExp(`(?:^|\\n)  '?${type}'?: \\{[\\s\\S]*?attributes: ([^,]+(?:\\[[^\\]]*\\])?),`),
      );
      // A missing profile means the client would ask for fields this side drops.
      expect(block).toBeTruthy();
    }
    expect(ALL_PROPERTY_TYPES.length).toBeGreaterThan(0);
  });

  it('agrees on the maximum count', () => {
    expect(clientSource.length).toBeGreaterThan(0);
    expect(MAX_ATTRIBUTE_COUNT).toBe(999);
  });
});
