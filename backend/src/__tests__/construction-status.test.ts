/**
 * Construction status — the storage rules.
 *
 * The client has its own copy of these rules, but the client is not the only
 * writer: the importer and any other API client reach the same collection. So
 * the pair "under construction + expected year" is settled here, on the way
 * into the database, and this suite pins what may be stored.
 *
 * Pure functions only — see `usesDatabase` in setup.ts.
 */

process.env.SKIP_TEST_DB = 'true';

import {
  COMPLETION_YEAR_HORIZON,
  MIN_COMPLETION_YEAR,
  isUsableCompletionYear,
  normalizeConstructionFields,
  normalizeConstructionStatus,
} from '../utils/constructionStatus';

const NOW = new Date('2026-06-15T00:00:00Z');
const YEAR = NOW.getFullYear();

describe('normalizeConstructionStatus', () => {
  it('reads a legacy document with no field as ready', () => {
    expect(normalizeConstructionStatus(undefined)).toBe('ready');
  });

  it('refuses to guess at anything else', () => {
    expect(normalizeConstructionStatus('UNDER-CONSTRUCTION')).toBe('ready');
    expect(normalizeConstructionStatus(1)).toBe('ready');
    expect(normalizeConstructionStatus('under-construction')).toBe('under-construction');
  });
});

describe('isUsableCompletionYear', () => {
  it('accepts any year in the window, including one already slipped', () => {
    expect(isUsableCompletionYear(YEAR, NOW)).toBe(true);
    expect(isUsableCompletionYear(YEAR - 1, NOW)).toBe(true);
    expect(isUsableCompletionYear(YEAR + COMPLETION_YEAR_HORIZON, NOW)).toBe(true);
    expect(isUsableCompletionYear(MIN_COMPLETION_YEAR, NOW)).toBe(true);
  });

  it('rejects only what is not a year', () => {
    expect(isUsableCompletionYear(MIN_COMPLETION_YEAR - 1, NOW)).toBe(false);
    expect(isUsableCompletionYear(YEAR + COMPLETION_YEAR_HORIZON + 1, NOW)).toBe(false);
    expect(isUsableCompletionYear('next spring', NOW)).toBe(false);
    expect(isUsableCompletionYear(2027.5, NOW)).toBe(false);
    expect(isUsableCompletionYear(null, NOW)).toBe(false);
  });
});

describe('normalizeConstructionFields', () => {
  it('clears a stray completion year from a ready listing instead of failing the write', () => {
    const result = normalizeConstructionFields(
      { constructionStatus: 'ready', expectedCompletionYear: YEAR + 2, yearBuilt: 2004 },
      NOW
    );
    expect(result).toEqual({
      ok: true,
      fields: { constructionStatus: 'ready', expectedCompletionYear: undefined },
    });
  });

  it('coerces an unknown status rather than trusting it', () => {
    const result = normalizeConstructionFields({ constructionStatus: 'planned', yearBuilt: 2004 }, NOW);
    expect(result).toEqual({
      ok: true,
      fields: { constructionStatus: 'ready', expectedCompletionYear: undefined },
    });
  });

  it('mirrors the completion year into yearBuilt', () => {
    const result = normalizeConstructionFields(
      { constructionStatus: 'under-construction', expectedCompletionYear: YEAR + 3, yearBuilt: YEAR },
      NOW
    );
    expect(result).toEqual({
      ok: true,
      fields: {
        constructionStatus: 'under-construction',
        expectedCompletionYear: YEAR + 3,
        yearBuilt: YEAR + 3,
      },
    });
  });

  it('stores "under construction" with no year — the date is optional', () => {
    const result = normalizeConstructionFields({ constructionStatus: 'under-construction', yearBuilt: 2004 }, NOW);
    expect(result).toEqual({
      ok: true,
      fields: { constructionStatus: 'under-construction', expectedCompletionYear: undefined },
    });
  });

  it('keeps a handover date that has already slipped', () => {
    const result = normalizeConstructionFields(
      { constructionStatus: 'under-construction', expectedCompletionYear: YEAR - 2 },
      NOW
    );
    expect(result.ok && result.fields.expectedCompletionYear).toBe(YEAR - 2);
  });

  it('rejects a value that is not a year and says what the window is', () => {
    const result = normalizeConstructionFields(
      { constructionStatus: 'under-construction', expectedCompletionYear: 'whenever' },
      NOW
    );
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error).toContain(String(MIN_COMPLETION_YEAR));
    expect(result.ok === false && result.error).toContain(String(YEAR + COMPLETION_YEAR_HORIZON));
  });

  it('takes a year that arrived as a string', () => {
    const result = normalizeConstructionFields(
      { constructionStatus: 'under-construction', expectedCompletionYear: String(YEAR + 1) },
      NOW
    );
    expect(result.ok && result.fields.expectedCompletionYear).toBe(YEAR + 1);
  });
});

/**
 * The schema hook, exercised without a database.
 *
 * `doc.validate()` runs the same `pre('validate')` middleware `save()` does,
 * so the rule that actually guards writes is covered here rather than only in
 * the pure helper above.
 */
describe("Property pre('validate')", () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Property = require('../models/Property').default;

  const base = () => ({
    sellerId: new (require('mongoose').Types.ObjectId)(),
    price: 150000,
    address: 'Bulevar 1',
    city: 'Podgorica',
    country: 'Montenegro',
    beds: 2,
    baths: 1,
    livingRooms: 1,
    sqft: 74,
    yearBuilt: 2010,
    description: 'A flat.',
    imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/a.jpg',
    lat: 42.44,
    lng: 19.26,
    propertyType: 'apartment',
    createdByName: 'Ana',
    createdByEmail: 'ana@example.com',
  });

  const nextYear = new Date().getFullYear() + 1;

  it('defaults a listing with no construction fields to ready', async () => {
    const doc = new Property(base());
    await doc.validate();
    expect(doc.constructionStatus).toBe('ready');
    expect(doc.expectedCompletionYear).toBeUndefined();
    expect(doc.yearBuilt).toBe(2010);
  });

  it('mirrors the completion year into yearBuilt on save', async () => {
    const doc = new Property({
      ...base(),
      constructionStatus: 'under-construction',
      expectedCompletionYear: nextYear,
    });
    await doc.validate();
    expect(doc.yearBuilt).toBe(nextYear);
    expect(doc.expectedCompletionYear).toBe(nextYear);
  });

  it('saves an under-construction listing with no completion year', async () => {
    const doc = new Property({ ...base(), constructionStatus: 'under-construction' });
    await doc.validate();
    expect(doc.constructionStatus).toBe('under-construction');
    expect(doc.expectedCompletionYear).toBeUndefined();
    expect(doc.yearBuilt).toBe(2010);
  });

  it('refuses a completion year that is not a year', async () => {
    const doc = new Property({
      ...base(),
      constructionStatus: 'under-construction',
      expectedCompletionYear: 12,
    });
    await expect(doc.validate()).rejects.toMatchObject({
      name: 'ValidationError',
      errors: { expectedCompletionYear: expect.anything() },
    });
  });

  // The client sends null when the seller clears the field; an omitted key
  // would read as "unchanged" and the old year would survive the edit.
  it('unsets a completion year the seller cleared', async () => {
    const doc = new Property({
      ...base(),
      constructionStatus: 'under-construction',
      expectedCompletionYear: nextYear,
    });
    await doc.validate();
    expect(doc.expectedCompletionYear).toBe(nextYear);

    doc.expectedCompletionYear = null;
    await doc.validate();
    expect(doc.constructionStatus).toBe('under-construction');
    expect(doc.expectedCompletionYear).toBeUndefined();
  });

  it('clears a stray completion year rather than failing a ready listing', async () => {
    const doc = new Property({ ...base(), expectedCompletionYear: nextYear });
    await doc.validate();
    expect(doc.constructionStatus).toBe('ready');
    expect(doc.expectedCompletionYear).toBeUndefined();
  });
});
