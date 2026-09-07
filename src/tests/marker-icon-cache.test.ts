/**
 * Map markers are built from a template string wrapped in an `L.divIcon`, one
 * per listing. Cheap once, ruinous in bulk: the marker layer re-renders on every
 * hover, every poll that returns the same listings, every pan — and a *new* icon
 * object makes react-leaflet call `setIcon`, which throws the marker's DOM away
 * and parses fresh HTML for it. Several hundred listings turned each of those
 * renders into seconds of frozen main thread, which is what a back press onto
 * the search page used to land in.
 *
 * So an icon is shared by everything that looks the same. These tests pin down
 * both halves of that bargain: identical appearance gives back the identical
 * object, and anything a marker actually shows changes it.
 */
import { describe, it, expect } from 'vitest';
import { getMarkerIcon } from '@/src/components/map/MapPropertyMarker';
import type { Property } from '@/types';

const listing = {
  id: 'prop-1',
  title: 'Sea view apartment',
  address: 'Obala 4',
  city: 'Budva',
  country: 'Montenegro',
  price: 250000,
  beds: 2,
  baths: 1,
  sqft: 74,
  propertyType: 'apartment',
  listingType: 'sale',
  lat: 42.28,
  lng: 18.84,
  images: [],
} as unknown as Property;

const iconFor = (overrides: Partial<Property> = {}, zoom = 12, hovered = false, night = false) =>
  getMarkerIcon({ ...listing, ...overrides } as Property, zoom, hovered, night);

describe('marker icon cache', () => {
  it('hands back the same icon for the same listing', () => {
    expect(iconFor()).toBe(iconFor());
  });

  it('hands back the same icon across a fresh copy of the same listing', () => {
    // A poll returns new objects for unchanged rows; the markers must not care.
    expect(iconFor()).toBe(iconFor({ ...listing }));
  });

  it('builds a different icon per listing', () => {
    expect(iconFor()).not.toBe(iconFor({ id: 'prop-2' }));
  });

  it('rebuilds when the price changes, since the price is on the marker', () => {
    const before = iconFor();
    const after = iconFor({ price: 260000 });
    expect(after).not.toBe(before);
    expect(after.options.html).not.toBe(before.options.html);
  });

  it('rebuilds for hover, zoom and night mode, which all change how it looks', () => {
    const plain = iconFor();
    expect(iconFor({}, 12, true)).not.toBe(plain);
    expect(iconFor({}, 15)).not.toBe(plain);
    expect(iconFor({}, 12, false, true)).not.toBe(plain);
  });

  it('rebuilds when promotion or urgency changes the marker treatment', () => {
    const plain = iconFor();
    expect(iconFor({ hasUrgentBadge: true })).not.toBe(plain);
    expect(
      iconFor({ isPromoted: true, promotionTier: 'premium', promotionEndDate: Date.now() + 86_400_000 }),
    ).not.toBe(plain);
  });

  it('still produces a usable Leaflet icon', () => {
    const icon = iconFor();
    expect(typeof icon.options.html).toBe('string');
    expect(icon.options.html).toContain('<svg');
    expect(icon.options.iconSize).toBeDefined();
  });
});
