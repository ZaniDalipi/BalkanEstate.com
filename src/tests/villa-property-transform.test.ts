/**
 * Luxury-villa field round-trip through the property transformers.
 *
 * Regression guard: the seven daily-rental fields were collected by the seller
 * form, modelled in Mongo and rendered on the card, but neither transformer
 * copied them — so they were silently dropped on every write and every read.
 * Nothing failed loudly, which is exactly why this is worth a test.
 */

import { describe, it, expect } from 'vitest';
import {
  transformBackendProperty,
  transformToBackendProperty,
} from '../features/properties/api/propertyApi';
import type { Property } from '@/types';

const VILLA_FIELDS = [
  'checkInTime',
  'checkOutTime',
  'cleaningFee',
  'cancellationPolicy',
  'breakfastIncluded',
  'towelsIncluded',
  'parkingIncluded',
] as const;

const rentalVilla = {
  propertyType: 'luxury-villa',
  listingType: 'rent',
  checkInTime: '15:00',
  checkOutTime: '10:30',
  cleaningFee: 85,
  cancellationPolicy: 'moderate',
  breakfastIncluded: true,
  towelsIncluded: true,
  parkingIncluded: false,
} as unknown as Property;

describe('luxury-villa property transformers', () => {
  it('sends every daily-rental field to the backend', () => {
    const body = transformToBackendProperty(rentalVilla);
    for (const field of VILLA_FIELDS) {
      expect(body, `${field} must reach the API`).toHaveProperty(field);
    }
    expect(body.checkInTime).toBe('15:00');
    expect(body.checkOutTime).toBe('10:30');
    expect(body.cleaningFee).toBe(85);
    expect(body.cancellationPolicy).toBe('moderate');
    expect(body.breakfastIncluded).toBe(true);
    expect(body.towelsIncluded).toBe(true);
    expect(body.parkingIncluded).toBe(false);
  });

  it('only sends them for a villa listed for rent, mirroring the backend', () => {
    const saleVilla = { ...rentalVilla, listingType: 'sale' } as Property;
    const body = transformToBackendProperty(saleVilla);
    expect(body.checkInTime).toBeUndefined();
    expect(body.cleaningFee).toBeUndefined();

    const plainRental = { ...rentalVilla, propertyType: 'apartment' } as Property;
    expect(transformToBackendProperty(plainRental).checkInTime).toBeUndefined();
  });

  it('preserves isNegotiable and the seller reference id', () => {
    const body = transformToBackendProperty({
      ...rentalVilla,
      isNegotiable: true,
      propertyId: 'REF-4412',
    } as Property);
    expect(body.isNegotiable).toBe(true);
    expect(body.propertyId).toBe('REF-4412');
  });

  it('reads every daily-rental field back off the API response', () => {
    const parsed = transformBackendProperty({
      _id: 'abc123',
      ...rentalVilla,
    });
    for (const field of VILLA_FIELDS) {
      expect(parsed, `${field} must survive the read path`).toHaveProperty(field);
    }
    expect(parsed.checkOutTime).toBe('10:30');
    expect(parsed.cancellationPolicy).toBe('moderate');
    expect(parsed.parkingIncluded).toBe(false);
  });
});
