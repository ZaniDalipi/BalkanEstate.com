/**
 * Under-construction listings.
 *
 * A listing that is still going up carries a promise ("finished in 2028")
 * instead of a fact ("built in 2019"). These tests pin the three rules that
 * keep the two apart: what the UI is allowed to say, what the form is allowed
 * to submit, and what gets persisted.
 */

import { describe, it, expect } from 'vitest';
import {
  COMPLETION_YEAR_HORIZON,
  MIN_COMPLETION_YEAR,
  buildConstructionFields,
  isUnderConstruction,
  normalizeConstructionStatus,
  resolveConstruction,
} from '../shared/property/construction';
import { validateCompletionYear, validateConstruction } from '../shared/utils/validation';
import { validateListing, initialListingData } from '../features/seller/components/ListingFormHelpers';

const NOW = new Date('2026-06-15T00:00:00Z');
const YEAR = NOW.getFullYear();

describe('normalizeConstructionStatus', () => {
  it('treats anything unrecognised as ready', () => {
    expect(normalizeConstructionStatus(undefined)).toBe('ready');
    expect(normalizeConstructionStatus(null)).toBe('ready');
    expect(normalizeConstructionStatus('Under-Construction')).toBe('ready');
    expect(normalizeConstructionStatus({ status: 'under-construction' })).toBe('ready');
  });

  it('keeps the one status it knows', () => {
    expect(normalizeConstructionStatus('under-construction')).toBe('under-construction');
    expect(normalizeConstructionStatus('ready')).toBe('ready');
  });
});

describe('resolveConstruction', () => {
  it('reads a legacy record with neither field as ready', () => {
    expect(resolveConstruction({ yearBuilt: 1998 } as never, NOW)).toEqual({ status: 'ready' });
    expect(resolveConstruction(null, NOW)).toEqual({ status: 'ready' });
  });

  it('returns the promised year when it is usable', () => {
    expect(
      resolveConstruction({ constructionStatus: 'under-construction', expectedCompletionYear: YEAR + 2 }, NOW)
    ).toEqual({ status: 'under-construction', expectedYear: YEAR + 2 });
  });

  it('accepts a year that arrived over the wire as a string', () => {
    expect(
      resolveConstruction({ constructionStatus: 'under-construction', expectedCompletionYear: String(YEAR + 1) }, NOW)
    ).toEqual({ status: 'under-construction', expectedYear: YEAR + 1 });
  });

  it('keeps a year the seller chose, however far out or already slipped', () => {
    for (const year of [YEAR - 1, YEAR + 12, YEAR + COMPLETION_YEAR_HORIZON, MIN_COMPLETION_YEAR]) {
      expect(resolveConstruction({ constructionStatus: 'under-construction', expectedCompletionYear: year }, NOW))
        .toEqual({ status: 'under-construction', expectedYear: year });
    }
  });

  it('stays under construction with no date when no year was given', () => {
    for (const expectedCompletionYear of [undefined, null, '', 0]) {
      expect(resolveConstruction({ constructionStatus: 'under-construction', expectedCompletionYear }, NOW))
        .toEqual({ status: 'under-construction', expectedYear: null });
    }
  });

  it('drops a value that is not a year', () => {
    const cases = ['soon', NaN, 2026.5, MIN_COMPLETION_YEAR - 1, YEAR + COMPLETION_YEAR_HORIZON + 1];
    for (const expectedCompletionYear of cases) {
      expect(resolveConstruction({ constructionStatus: 'under-construction', expectedCompletionYear }, NOW))
        .toEqual({ status: 'under-construction', expectedYear: null });
    }
  });

  it('ignores a stray year on a ready listing', () => {
    expect(resolveConstruction({ constructionStatus: 'ready', expectedCompletionYear: YEAR + 1 }, NOW))
      .toEqual({ status: 'ready' });
  });
});

describe('isUnderConstruction', () => {
  it('is false for legacy and ready records', () => {
    expect(isUnderConstruction(null)).toBe(false);
    expect(isUnderConstruction({})).toBe(false);
    expect(isUnderConstruction({ constructionStatus: 'ready' })).toBe(false);
  });

  it('is true only for the known status', () => {
    expect(isUnderConstruction({ constructionStatus: 'under-construction' })).toBe(true);
  });
});

describe('validateCompletionYear', () => {
  it('accepts whatever year the seller puts, near or far', () => {
    for (const year of [YEAR, YEAR + 1, YEAR + 20, YEAR + COMPLETION_YEAR_HORIZON, MIN_COMPLETION_YEAR]) {
      expect(validateCompletionYear(year, { now: NOW })).toEqual({ isValid: true });
    }
  });

  it('accepts a date that has already slipped — that is the seller to explain, not us', () => {
    expect(validateCompletionYear(YEAR - 3, { now: NOW })).toEqual({ isValid: true });
  });

  it('rejects only what is not a year', () => {
    expect(validateCompletionYear('not a year', { now: NOW }).isValid).toBe(false);
    expect(validateCompletionYear(2027.4, { now: NOW }).isValid).toBe(false);
    expect(validateCompletionYear(MIN_COMPLETION_YEAR - 1, { now: NOW }).isValid).toBe(false);
    expect(validateCompletionYear(YEAR + COMPLETION_YEAR_HORIZON + 1, { now: NOW }).isValid).toBe(false);
  });
});

describe('validateConstruction', () => {
  it('passes a ready listing whatever year tags along', () => {
    expect(validateConstruction({ constructionStatus: 'ready' }, { now: NOW })).toEqual({ isValid: true });
    expect(validateConstruction({ constructionStatus: 'ready', expectedCompletionYear: 1900 }, { now: NOW }))
      .toEqual({ isValid: true });
  });

  it('lets an under-construction listing go out with no year at all', () => {
    for (const expectedCompletionYear of [undefined, null, '']) {
      expect(validateConstruction({ constructionStatus: 'under-construction', expectedCompletionYear }, { now: NOW }))
        .toEqual({ isValid: true });
    }
  });

  it('applies the year rules only to a year that was actually given', () => {
    expect(
      validateConstruction({ constructionStatus: 'under-construction', expectedCompletionYear: YEAR + 1 }, { now: NOW })
    ).toEqual({ isValid: true });
    expect(
      validateConstruction({ constructionStatus: 'under-construction', expectedCompletionYear: 'whenever' }, { now: NOW })
        .isValid
    ).toBe(false);
  });
});

describe('buildConstructionFields', () => {
  it('leaves a finished listing alone', () => {
    expect(buildConstructionFields({ constructionStatus: 'ready', yearBuilt: 2011 }, NOW)).toEqual({
      yearBuilt: 2011,
      constructionStatus: 'ready',
    });
  });

  it('mirrors the completion year into yearBuilt so year sorts stay right', () => {
    expect(
      buildConstructionFields(
        { constructionStatus: 'under-construction', expectedCompletionYear: YEAR + 3, yearBuilt: YEAR },
        NOW
      )
    ).toEqual({
      yearBuilt: YEAR + 3,
      constructionStatus: 'under-construction',
      expectedCompletionYear: YEAR + 3,
    });
  });

  it('keeps the status when no year was given, rather than republishing it as finished', () => {
    expect(
      buildConstructionFields({ constructionStatus: 'under-construction', yearBuilt: 2020 }, NOW)
    ).toEqual({ yearBuilt: 2020, constructionStatus: 'under-construction' });
  });

  it('drops a year that is not a year but keeps the status', () => {
    expect(
      buildConstructionFields(
        { constructionStatus: 'under-construction', expectedCompletionYear: 'soon', yearBuilt: 2020 },
        NOW
      )
    ).toEqual({ yearBuilt: 2020, constructionStatus: 'under-construction' });
  });

  it('clears a stale year when the listing goes back to ready', () => {
    const fields = buildConstructionFields(
      { constructionStatus: 'ready', expectedCompletionYear: YEAR + 2, yearBuilt: 2015 },
      NOW
    );
    expect(fields.expectedCompletionYear).toBeUndefined();
  });
});

describe('validateListing — construction pair', () => {
  const t = (key: string, fallback?: string) => fallback ?? key;

  const base = {
    listingData: {
      ...initialListingData,
      title: 'New build by the marina',
      description: 'Two bedrooms, handover next year.',
      price: 180000,
      propertyType: 'apartment' as const,
      totalFloors: 6,
      floorNumber: 2,
      hasElevator: true,
      lat: 42.44,
      lng: 19.26,
    },
    imageCount: 2,
    selectedCountry: 'Montenegro',
    selectedCity: 'Podgorica',
  };

  it('publishes a ready listing without asking for a completion year', () => {
    expect(validateListing(base, t)).toEqual({});
  });

  it('publishes an under-construction listing with no year picked', () => {
    const errors = validateListing(
      { ...base, listingData: { ...base.listingData, constructionStatus: 'under-construction' } },
      t
    );
    expect(errors).toEqual({});
  });

  it('flags a completion year that is not a year', () => {
    const errors = validateListing(
      {
        ...base,
        listingData: {
          ...base.listingData,
          constructionStatus: 'under-construction',
          expected_completion_year: 12,
        },
      },
      t
    );
    expect(errors.expectedCompletionYear).toBe(
      'Please enter a valid completion year, or leave it empty.'
    );
  });

  it('publishes once a year is entered', () => {
    const errors = validateListing(
      {
        ...base,
        listingData: {
          ...base.listingData,
          constructionStatus: 'under-construction',
          expected_completion_year: new Date().getFullYear() + 1,
        },
      },
      t
    );
    expect(errors).toEqual({});
  });
});
