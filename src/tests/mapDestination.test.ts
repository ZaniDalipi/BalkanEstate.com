/**
 * Map destination tests
 *
 * The property page's "Full Map" button both navigates and labels itself from
 * `resolveMapDestination`, so these cover the market rules and — just as
 * importantly — what happens when the property record is not the clean domain
 * object the types promise (missing fields, wrong casing, wrong type entirely).
 */

import { describe, it, expect } from 'vitest';
import {
  MAP_DESTINATIONS,
  resolveMapDestination,
  buildMapFocusTarget,
} from '../shared/map/mapDestination';

describe('resolveMapDestination', () => {
  it('sends a luxury villa to the villas map, whichever market it is in', () => {
    expect(resolveMapDestination({ propertyType: 'luxury-villa', listingType: 'rent' }).path).toBe('/villas');
    expect(resolveMapDestination({ propertyType: 'luxury-villa', listingType: 'sale' }).path).toBe('/villas');
    expect(resolveMapDestination({ propertyType: 'luxury-villa' }).market).toBe('villas');
  });

  it('sends a rental to the rentals map', () => {
    const destination = resolveMapDestination({ propertyType: 'apartment', listingType: 'rent' });
    expect(destination.path).toBe('/rent');
    expect(destination.labelFallback).toBe('Rentals Map');
  });

  it('sends a for-sale listing to the buy map', () => {
    const destination = resolveMapDestination({ propertyType: 'house', listingType: 'sale' });
    expect(destination.path).toBe('/search');
    expect(destination.labelFallback).toBe('For-Sale Map');
  });

  it('normalises casing and padding rather than falling through', () => {
    expect(resolveMapDestination({ propertyType: '  Luxury-Villa ' }).path).toBe('/villas');
    expect(resolveMapDestination({ listingType: 'RENT' }).path).toBe('/rent');
  });

  it('falls back to a neutrally-labelled buy map for an unknown or absent market', () => {
    for (const input of [{}, { listingType: 'auction' }, { listingType: 42 }, { propertyType: null }]) {
      const destination = resolveMapDestination(input);
      expect(destination.market).toBe('unknown');
      expect(destination.path).toBe('/search');
      expect(destination.labelFallback).toBe('Full Map');
    }
  });

  it('exposes destinations as frozen constants', () => {
    expect(Object.isFrozen(MAP_DESTINATIONS)).toBe(true);
    expect(Object.isFrozen(MAP_DESTINATIONS.villas)).toBe(true);
  });
});

describe('buildMapFocusTarget', () => {
  it('carries a valid coordinate and its address', () => {
    expect(buildMapFocusTarget({ lat: 40.16, lng: 19.66, address: 'Palasë' })).toEqual({
      lat: 40.16,
      lng: 19.66,
      address: 'Palasë',
    });
  });

  it('falls back to city and country when there is no street address', () => {
    expect(buildMapFocusTarget({ lat: 40.16, lng: 19.66, city: 'Himarë', country: 'Shqipëria' })?.address)
      .toBe('Himarë, Shqipëria');
  });

  it('returns null for a missing, non-numeric or out-of-range coordinate', () => {
    expect(buildMapFocusTarget({ address: 'Himarë' })).toBeNull();
    expect(buildMapFocusTarget({ lat: Number.NaN, lng: 19.66 })).toBeNull();
    expect(buildMapFocusTarget({ lat: '40.16', lng: '19.66' })).toBeNull();
    expect(buildMapFocusTarget({ lat: 91, lng: 19.66 })).toBeNull();
    expect(buildMapFocusTarget({ lat: 40.16, lng: 181 })).toBeNull();
  });

  it('strips markup out of an address that came from an API response', () => {
    expect(buildMapFocusTarget({ lat: 40.16, lng: 19.66, address: '<img src=x onerror=alert(1)>Palasë' })?.address)
      .not.toContain('<');
  });

  it('caps an unbounded address', () => {
    const address = buildMapFocusTarget({ lat: 40.16, lng: 19.66, address: 'a'.repeat(500) })?.address;
    expect(address).toHaveLength(120);
  });
});
