import { describe, it, expect } from 'vitest';
import {
  canonicalPlaceName,
  formatCityPlace,
  formatGeocodedPlace,
  formatPlace,
  formatPlaceLabel,
  formatPropertyPlace,
  isSamePlace,
  normalizePlaceName,
  placeSearchValue,
} from '@/shared/geo';
import { BALKAN_LOCATIONS } from '@/utils/balkanLocations';

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

describe('the label is <place>, <city>, <country> and nothing else', () => {
  it('writes a village inside a city', () => {
    expect(formatPlace({ name: 'Becici', city: 'Budva', country: 'Montenegro' }).full)
      .toBe('Bečići, Budva, Montenegro');
  });

  it('writes a city as city and country', () => {
    expect(formatPlace({ name: 'Budva', city: 'Budva', country: 'Montenegro' }).full)
      .toBe('Budva, Montenegro');
    expect(formatCityPlace('Vlore', 'Albania').full).toBe('Vlorë, Albania');
  });

  it('writes a country as itself', () => {
    expect(formatCityPlace(null, 'Montenegro').full).toBe('Montenegro');
  });

  it('splits the label into a bold name and a grey context line', () => {
    const label = formatPlace({ name: 'Krani', city: 'Resen', country: 'North Macedonia' });
    expect(label.primary).toBe('Krani');
    expect(label.secondary).toBe('Resen, North Macedonia');
  });

  it('never keeps a county, district, region or postcode', () => {
    // Whatever a geocoder calls the levels between a place and its country,
    // this format has no room for them.
    const label = formatGeocodedPlace({
      address: {
        village: 'Krani',
        municipality: 'Resen',
        county: 'Resen Municipality',
        state: 'Southwestern Region',
        postcode: '7310',
        country: 'North Macedonia',
      },
    });

    expect(label.full).toBe('Krani, Resen, North Macedonia');
  });

  it('strips the administrative wrapper off a municipality', () => {
    expect(formatPlace({ name: 'Bečići', city: 'Opština Budva', country: 'Montenegro' }).full)
      .toBe('Bečići, Budva, Montenegro');
  });

  it('has nothing to say about nothing', () => {
    expect(formatPlaceLabel({ name: null, city: undefined, country: '  ' }))
      .toEqual({ primary: '', secondary: '', full: '' });
  });
});

describe('the city the user chose anchors the label', () => {
  it('writes a far-away place under the city being listed in', () => {
    // Himarë is 45km down the coast from Vlorë but inside its listing area.
    // Filed under Vlorë, so it is written under Vlorë — not under whichever
    // county the geocoder files it in.
    const label = formatGeocodedPlace(
      {
        address: {
          town: 'Himarë',
          municipality: 'Bashkia Himarë',
          county: 'Vlorë County',
          country: 'Albania',
        },
      },
      { context: { city: 'Vlore', country: 'Albania' } }
    );

    expect(label.full).toBe('Himarë, Vlorë, Albania');
  });

  it('writes a suburb under the city being listed in', () => {
    const label = formatGeocodedPlace(
      { address: { village: 'Krani', county: 'Resen Municipality', country: 'North Macedonia' } },
      { context: { city: 'Resen', country: 'North Macedonia' } }
    );

    expect(label.full).toBe('Krani, Resen, North Macedonia');
  });

  it('still says the city only once when the place is the city', () => {
    const label = formatGeocodedPlace(
      { address: { city: 'Vlorë', county: 'Vlorë County', country: 'Albania' } },
      { context: { city: 'Vlore', country: 'Albania' } }
    );

    expect(label.full).toBe('Vlorë, Albania');
  });

  it('overrides the parent the gazetteer holds, because the listing decides', () => {
    const label = formatPlace(
      { name: 'Trpejca', city: 'Ohrid', country: 'North Macedonia' },
      { context: { city: 'Resen', country: 'North Macedonia' } }
    );

    expect(label.full).toBe('Trpejca, Resen, North Macedonia');
  });
});

describe('country names outside the Latin alphabet', () => {
  it('keeps a Cyrillic or Greek country in the label', () => {
    // These used to vanish: the place normaliser only knew Latin, so any name
    // in another script folded to the empty string and was dropped as a
    // duplicate of nothing.
    expect(formatPlaceLabel({ name: 'Moa Center', city: 'Ohrid', country: 'Северна Македонија' }).full)
      .toBe('Moa Center, Ohrid, Северна Македонија');
    expect(formatPlaceLabel({ name: 'Kafe', city: 'Athens', country: 'Ελλάδα' }).full)
      .toBe('Kafe, Athens, Ελλάδα');
  });

  it('resolves a known place written in Cyrillic to the app\'s own spelling', () => {
    // A useful consequence of the normaliser knowing more than Latin: the
    // spelling table is reachable from any script, so a place arriving as
    // "Скопје" is shown under the one name the app uses everywhere — and
    // recognised as the same place as the city beside it, not repeated.
    expect(formatPlaceLabel({ name: 'Скопје', city: 'Skopje', country: 'North Macedonia' }).full)
      .toBe('Skopje, North Macedonia');
    expect(canonicalPlaceName('Скопје')).toBe('Skopje');
    // And the rule that only marks are restored still holds across scripts:
    // "Београд" folds to `beograd`, which is a different name from
    // "Belgrade", not a different spelling of it, so it is left alone.
    expect(canonicalPlaceName('Београд')).toBe('Београд');
  });
});

describe('formatGeocodedPlace', () => {
  it('reads a street from the structured address', () => {
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

    expect(label.full).toBe('Rruga Ismail Qemali, Vlorë, Albania');
  });

  it('falls back to the display name, keeping only the place and the country', () => {
    const label = formatGeocodedPlace({
      display_name: 'Sveti Stefan, Opština Budva, 85315, Montenegro',
    });

    expect(label.full).toBe('Sveti Stefan, Budva, Montenegro');
  });

  it('reads a bare two-part display name', () => {
    expect(formatGeocodedPlace({ display_name: 'Ksamil, Albania' }).full).toBe('Ksamil, Albania');
  });
});

describe('placeSearchValue', () => {
  it('is the whole label, because the label is the address', () => {
    const label = formatPlace({ name: 'Palasa', city: 'Vlore', country: 'Albania' });
    expect(placeSearchValue(label)).toBe('Palasë, Vlorë, Albania');
  });
});

describe('formatPropertyPlace', () => {
  it('labels a listing by its address, then where it is filed', () => {
    expect(formatPropertyPlace({
      address: 'Jadranski Put 12',
      city: 'Budva',
      country: 'Montenegro',
    }).full).toBe('Jadranski Put 12, Budva, Montenegro');
  });
});

describe('isSamePlace', () => {
  it('sees through spelling', () => {
    expect(isSamePlace('Bečići', 'becici')).toBe(true);
    expect(isSamePlace('Budva', 'Bar')).toBe(false);
    expect(isSamePlace('', 'Budva')).toBe(false);
  });
});
