import { describe, it, expect } from 'vitest';
import {
  ALL_PROPERTY_TYPES,
  PARKING_TYPES,
  TYPE_ATTRIBUTES,
  attributesForType,
  colorForType,
  isParkingType,
  statsForType,
  stripAttributesForType,
  typeHasAttribute,
} from '@/shared/property/typeAttributes';
import { validateTypeAttributes, MAX_ATTRIBUTE_COUNT } from '@/shared/utils/validation';
import { typeLabel } from '@/shared/constants/propertyTypes';

/** Stand-in for i18next: returns the fallback, which is what a missing key does. */
const translate = (_key: string, fallback?: string) => fallback ?? _key;

describe('what each type is described by', () => {
  it('does not ask a parking space about bedrooms', () => {
    expect(typeHasAttribute('parking', 'beds')).toBe(false);
    expect(typeHasAttribute('parking', 'baths')).toBe(false);
    expect(typeHasAttribute('parking', 'livingRooms')).toBe(false);
  });

  it('asks a parking space what it actually is: spaces and how it is arranged', () => {
    expect(attributesForType('parking')).toEqual(['parking', 'parkingType', 'floorNumber']);
  });

  it('describes business premises by working space, not by rooms to sleep in', () => {
    expect(typeHasAttribute('commercial', 'offices')).toBe(true);
    expect(typeHasAttribute('commercial', 'openPlanArea')).toBe(true);
    expect(typeHasAttribute('commercial', 'kitchens')).toBe(true);
    expect(typeHasAttribute('commercial', 'toilets')).toBe(true);

    expect(typeHasAttribute('commercial', 'beds')).toBe(false);
    expect(typeHasAttribute('commercial', 'baths')).toBe(false);
    expect(typeHasAttribute('commercial', 'livingRooms')).toBe(false);
  });

  it('still describes a home by its rooms', () => {
    for (const type of ['house', 'apartment', 'villa', 'luxury-villa'] as const) {
      expect(typeHasAttribute(type, 'beds'), type).toBe(true);
      expect(typeHasAttribute(type, 'baths'), type).toBe(true);
      expect(typeHasAttribute(type, 'livingRooms'), type).toBe(true);
    }
  });

  it('asks land nothing beyond its area', () => {
    expect(attributesForType('land')).toEqual([]);
  });

  it('keeps everything for a type it does not recognise, rather than guessing', () => {
    // 'other' exists precisely because we do not know what the listing is, so
    // hiding fields would be deciding on the seller's behalf.
    expect(attributesForType('other')).toEqual(TYPE_ATTRIBUTES);
    expect(attributesForType('a-type-from-the-future')).toEqual(TYPE_ATTRIBUTES);
    expect(attributesForType(undefined)).toEqual(TYPE_ATTRIBUTES);
  });

  it('has a row for every type, so adding one cannot be half-done', () => {
    for (const type of ALL_PROPERTY_TYPES) {
      expect(attributesForType(type), type).toBeDefined();
      expect(statsForType(type).length, type).toBeGreaterThan(0);
      expect(colorForType(type), type).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });
});

describe('what the search shows', () => {
  it('leads a parking space with its spaces, never with 0 Beds · 0 Baths', () => {
    expect(statsForType('parking')).toEqual(['sqft', 'parking', 'parkingType']);
    expect(statsForType('parking')).not.toContain('beds');
  });

  it('leads business premises with offices and open-plan area', () => {
    expect(statsForType('commercial')).toEqual(['sqft', 'offices', 'openPlanArea']);
  });

  it('gives every type its own colour', () => {
    const colors = ALL_PROPERTY_TYPES.map(colorForType);
    expect(new Set(colors).size).toBe(colors.length);
  });

  it('names a type the way the picker names it, not by its slug', () => {
    expect(typeLabel('parking', translate)).toBe('Parking Space');
    expect(typeLabel('luxury-villa', translate)).toBe('Luxury Villa');
    expect(typeLabel('commercial', translate)).toBe('Business / Commercial');
  });

  it('labels an unknown type as itself rather than dropping it', () => {
    expect(typeLabel('warehouse', translate)).toBe('warehouse');
  });
});

describe('stripAttributesForType', () => {
  const payload = {
    // Belongs to every listing.
    price: 50_000,
    sqft: 18,
    city: 'Budva',
    // Type-dependent.
    beds: 3,
    baths: 2,
    livingRooms: 1,
    parking: 1,
    parkingType: 'underground' as const,
  };

  it('drops the attributes a parking space does not have', () => {
    const result = stripAttributesForType('parking', payload);

    expect(result).not.toHaveProperty('beds');
    expect(result).not.toHaveProperty('baths');
    expect(result).not.toHaveProperty('livingRooms');
    expect(result.parking).toBe(1);
    expect(result.parkingType).toBe('underground');
  });

  it('never touches the fields every listing has', () => {
    const result = stripAttributesForType('parking', payload);
    expect(result).toMatchObject({ price: 50_000, sqft: 18, city: 'Budva' });
  });

  it('leaves a home untouched', () => {
    expect(stripAttributesForType('house', payload)).toMatchObject({ beds: 3, baths: 2 });
  });

  it('clears the old type\'s answers when a listing is re-typed', () => {
    // The seller filled in a flat, then changed the type to a garage. The
    // bathrooms must not travel with it.
    const wasAnApartment = { ...payload, propertyType: 'parking' };
    expect(stripAttributesForType('parking', wasAnApartment)).not.toHaveProperty('baths');
  });
});

describe('validateTypeAttributes', () => {
  it('accepts the counts a type actually has', () => {
    expect(validateTypeAttributes('commercial', { offices: 4, toilets: 2, openPlanArea: 45 }))
      .toEqual({ isValid: true });
  });

  it('ignores an attribute the type does not have, because the filter drops it', () => {
    // Sloppy, not hostile: rejecting the whole listing would help nobody.
    expect(validateTypeAttributes('parking', { beds: 3 })).toEqual({ isValid: true });
  });

  it('rejects a count that is not a count', () => {
    expect(validateTypeAttributes('commercial', { offices: -1 }).isValid).toBe(false);
    expect(validateTypeAttributes('commercial', { offices: 2.5 }).isValid).toBe(false);
    expect(validateTypeAttributes('commercial', { offices: 'lots' }).isValid).toBe(false);
    expect(validateTypeAttributes('commercial', { offices: MAX_ATTRIBUTE_COUNT + 1 }).isValid).toBe(false);
  });

  it('rejects a parking type that is not one of ours', () => {
    expect(validateTypeAttributes('parking', { parkingType: 'helipad' }).isValid).toBe(false);
    for (const value of PARKING_TYPES) {
      expect(validateTypeAttributes('parking', { parkingType: value }), value).toEqual({ isValid: true });
    }
  });

  it('treats an empty value as "not answered", which is allowed', () => {
    expect(validateTypeAttributes('commercial', { offices: undefined, toilets: null, kitchens: '' }))
      .toEqual({ isValid: true });
  });

  it('knows a parking type when it sees one', () => {
    expect(isParkingType('underground')).toBe(true);
    expect(isParkingType('helipad')).toBe(false);
    expect(isParkingType(undefined)).toBe(false);
  });
});
