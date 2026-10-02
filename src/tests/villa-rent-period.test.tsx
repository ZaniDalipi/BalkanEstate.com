import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Property } from '@/types';
import { villaRentSuffix } from '@/src/features/villas/utils/villaRentPeriod';

/**
 * A villa card quotes the rent in the period its owner priced it in. It used
 * to say "/ night" for every rental, so a €3,000 monthly let read as €3,000 a
 * night.
 */

const translate = (_key: string, fallback?: unknown) => (typeof fallback === 'string' ? fallback : _key);
vi.mock('react-i18next', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({ t: translate }),
}));

vi.mock('@/context/AppContext', () => ({
  useAppContext: () => ({
    state: { savedHomes: [], isAuthenticated: false, currentUser: null },
    dispatch: vi.fn(),
    toggleSavedHome: vi.fn(),
  }),
}));

const { default: LuxuryVillaCard } = await import('@/src/features/villas/components/LuxuryVillaCard');

const villa = (overrides: Partial<Property>): Property => ({
  id: 'v1',
  sellerId: 's1',
  title: 'Villa in Budva',
  address: 'Jadranski put 4',
  city: 'Budva',
  country: 'Montenegro',
  lat: 42.29,
  lng: 18.84,
  price: 3000,
  beds: 4,
  baths: 3,
  livingRooms: 1,
  sqft: 300,
  yearBuilt: 2020,
  parking: 1,
  description: '',
  specialFeatures: [],
  materials: [],
  amenities: [],
  imageUrl: '',
  propertyType: 'luxury-villa',
  listingType: 'rent',
  status: 'active',
  seller: { type: 'private', name: '', phone: '' } as Property['seller'],
  ...overrides,
});

describe('villaRentSuffix', () => {
  it('follows the period the rent was set in', () => {
    expect(villaRentSuffix('daily').fallback).toBe('/ night');
    expect(villaRentSuffix('weekly').fallback).toBe('/ week');
    expect(villaRentSuffix('monthly').fallback).toBe('/ month');
  });

  it('reads an unset period as monthly, as the server stores it', () => {
    expect(villaRentSuffix(undefined)).toEqual(villaRentSuffix('monthly'));
  });
});

describe('LuxuryVillaCard price', () => {
  it.each([
    ['daily', '/ night'],
    ['weekly', '/ week'],
    ['monthly', '/ month'],
  ] as const)('a villa let %s says %s', (rentPeriod, suffix) => {
    render(<LuxuryVillaCard property={villa({ rentPeriod })} />);
    expect(screen.getByText(suffix)).toBeTruthy();
    for (const other of ['/ night', '/ week', '/ month'].filter((s) => s !== suffix)) {
      expect(screen.queryByText(other)).toBeNull();
    }
  });

  it('a villa for sale has no rent period', () => {
    render(<LuxuryVillaCard property={villa({ listingType: 'sale', price: 900_000, rentPeriod: 'daily' })} />);
    expect(screen.queryByText(/^\/ (night|week|month)$/)).toBeNull();
  });
});
