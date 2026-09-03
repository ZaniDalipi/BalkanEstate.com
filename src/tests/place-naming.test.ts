import { describe, it, expect } from 'vitest';
import {
  canonicalPlaceName,
  formatCityPlace,
  formatGeocodedPlace,
  formatPlace,
  formatPlaceLabel,
  formatPropertyPlace,
  isSamePlace,
  placeSearchValue,
} from '@/shared/geo';
import { BALKAN_LOCATIONS } from '@/utils/balkanLocations';
import { normalizePlaceName } from '@/shared/geo';

describe('canonicalPlaceName', () => {
  it('restores the local spelling of a city the app stores in ASCII', () => {
    expect(canonicalPlaceName('Vlore')).toBe('Vlorë');
    expect(canonicalPlaceName('Durres')).toBe('Durrës');
    expect(canonicalPlaceName('Niksic')).toBe('Nikšić');
    expect(canonicalPlaceName('Timisoara')).toBe('Timișoara');
  });

  it('resolves an alias to the one name the place is shown under', () => {
    expect(canonicalPlaceName('becici')).toBe('Bečići');
    expect(canonicalPlaceName('Medjugorje')).toBe('Međugorje');
  });

  it('leaves a name it holds no spelling for untouched', () => {
    expect(canonicalPlaceName('Rruga e Kavajës')).toBe('Rruga e Kavajës');
    expect(canonicalPlaceName('')).toBe('');
  });

  it('translates nothing — an English exonym stays as the app stores it', () => {
    expect(canonicalPlaceName('Belgrade')).toBe('Belgrade');
    expect(canonicalPlaceName('Tirana')).toBe('Tirana');
  });

  it('only ever adds marks to a name, never changes its letters', () => {
    // The guarantee that makes the spelling table safe to extend: fold the
    // canonical spelling back and it must be the stored name again.
    for (const country of BALKAN_LOCATIONS) {
      for (const city of country.cities) {
        expect(normalizePlaceName(canonicalPlaceName(city.name))).toBe(normalizePlaceName(city.name));
      }
    }
  });
});

describe('formatPlaceLabel', () => {
  it('splits a place into a name and just enough context', () => {
    const label = formatPlace({ name: 'Becici', city: 'Budva', country: 'Montenegro' });
    expect(label.primary).toBe('Bečići');
    expect(label.secondary).toBe('Budva, Montenegro');
    expect(label.full).toBe('Bečići, Budva, Montenegro');
  });

  it('never says the same place twice', () => {
    expect(formatPlace({ name: 'Budva', city: 'Budva', country: 'Montenegro' }).full)
      .toBe('Budva, Montenegro');
  });

  it('drops the administrative wrapper around a name it already showed', () => {
    // "Himarë, Bashkia Himarë, Vlorë County, 9425, Albania" is one place
    // named three times with a postcode in the middle.
    const label = formatPlaceLabel(['Himarë', 'Bashkia Himarë', 'Vlorë County', '9425', 'Albania']);
    expect(label.primary).toBe('Himarë');
    expect(label.secondary).toBe('Vlorë County, Albania');
  });

  it('keeps context that is real, even when it wears an administrative word', () => {
    const label = formatPlaceLabel(['Bečići', 'Opština Budva', 'Montenegro']);
    expect(label.full).toBe('Bečići, Budva, Montenegro');
  });

  it('trims a deep hierarchy to two levels plus the country', () => {
    const label = formatPlaceLabel([
      'Stari Grad', 'Budva', 'Coastal Region', 'Southern Montenegro', 'Montenegro',
    ]);
    expect(label.primary).toBe('Stari Grad');
    expect(label.secondary).toBe('Budva, Coastal Region, Montenegro');
  });

  it('has nothing to say about nothing', () => {
    expect(formatPlaceLabel([null, undefined, '  '])).toEqual({ primary: '', secondary: '', full: '' });
  });
});

describe('formatGeocodedPlace', () => {
  it('reads the structured address a geocoder returns, ignoring the postcode', () => {
    const label = formatGeocodedPlace({
      display_name: 'ignored',
      address: {
        road: 'Rruga Ismail Qemali',
        city: 'Vlorë',
        county: 'Vlorë County',
        country: 'Albania',
        postcode: '9401',
      },
    });

    expect(label.primary).toBe('Rruga Ismail Qemali');
    expect(label.secondary).toBe('Vlorë, Albania');
  });

  it('falls back to the display name when there is no structured address', () => {
    const label = formatGeocodedPlace({
      display_name: 'Sveti Stefan, Opština Budva, 85315, Montenegro',
    });

    expect(label.primary).toBe('Sveti Stefan');
    expect(label.secondary).toBe('Budva, Montenegro');
  });
});

describe('placeSearchValue', () => {
  it('puts a short, canonical label in the search box', () => {
    const label = formatPlace({ name: 'Palasa', city: 'Vlore', country: 'Albania' });
    expect(placeSearchValue(label)).toBe('Palasë, Vlorë');
  });

  it('leaves a place with no context as just its name', () => {
    expect(placeSearchValue(formatCityPlace('Montenegro'))).toBe('Montenegro');
  });
});

describe('formatPropertyPlace', () => {
  it('labels a listing by its address, then where it is', () => {
    const label = formatPropertyPlace({
      address: 'Jadranski Put 12',
      city: 'Budva',
      country: 'Montenegro',
    });
    expect(label.full).toBe('Jadranski Put 12, Budva, Montenegro');
  });
});

describe('isSamePlace', () => {
  it('sees through spelling', () => {
    expect(isSamePlace('Bečići', 'becici')).toBe(true);
    expect(isSamePlace('Budva', 'Bar')).toBe(false);
    expect(isSamePlace('', 'Budva')).toBe(false);
  });
});
