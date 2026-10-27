process.env.SKIP_TEST_DB = 'true';

import {
  resolveEffectiveAvailability,
  availabilityFromListingStatus,
} from '../../services/developments/unitAvailability';

describe('availabilityFromListingStatus', () => {
  it.each([
    ['active', 'available'],
    ['pending', 'reserved'],
    ['sold', 'sold'],
    ['rented', 'rented'],
  ])('maps a %s listing to %s', (status, expected) => {
    expect(availabilityFromListingStatus(status)).toBe(expected);
  });

  it.each([['draft'], [undefined], [null], ['archived']])('ignores a %p listing', (status) => {
    expect(availabilityFromListingStatus(status)).toBeNull();
  });
});

describe('resolveEffectiveAvailability — most restrictive wins', () => {
  it('uses the declared state when nothing is attached', () => {
    expect(resolveEffectiveAvailability('available')).toEqual({ availability: 'available', source: 'unit' });
  });

  it('shows a unit sold when its listing sold, even if the unit was never updated', () => {
    expect(resolveEffectiveAvailability('available', ['sold'])).toEqual({ availability: 'sold', source: 'listing' });
  });

  it('keeps a developer reservation over an active listing', () => {
    expect(resolveEffectiveAvailability('reserved', ['active'])).toEqual({ availability: 'reserved', source: 'unit' });
  });

  it('keeps a declared sale over a listing an agent forgot to close', () => {
    expect(resolveEffectiveAvailability('sold', ['active'])).toEqual({ availability: 'sold', source: 'unit' });
  });

  it('treats a pending listing as a reservation', () => {
    expect(resolveEffectiveAvailability('available', ['pending'])).toEqual({ availability: 'reserved', source: 'listing' });
  });

  it('does not let an active listing promote a coming-soon unit to available', () => {
    expect(resolveEffectiveAvailability('not_released', ['active'])).toEqual({ availability: 'not_released', source: 'unit' });
  });

  it('ignores draft listings entirely', () => {
    expect(resolveEffectiveAvailability('available', ['draft'])).toEqual({ availability: 'available', source: 'unit' });
  });

  it('takes the most restrictive across several listings', () => {
    expect(resolveEffectiveAvailability('available', ['active', 'pending', 'sold'])).toEqual({
      availability: 'sold',
      source: 'listing',
    });
  });

  it('lets an unavailable declaration outrank a pending listing', () => {
    expect(resolveEffectiveAvailability('unavailable', ['pending'])).toEqual({ availability: 'unavailable', source: 'unit' });
  });
});
