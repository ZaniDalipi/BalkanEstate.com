process.env.SKIP_TEST_DB = 'true';

import {
  findCataloguePlaceInText, lookupCataloguePlace, nearestCataloguePlace, textMentionsPlace,
} from '../../services/listingAttributes/placeCatalog';
import { cleanListingAddress, resolveLocation } from '../../services/listingAttributes/resolveLocation';

/**
 * Imported listings must land on a city the app offers in its city picker,
 * spelled the same way — otherwise the listing form opens with no city.
 */
describe("the app's place catalogue", () => {
  it("returns the catalogue's own spelling of a city", () => {
    expect(lookupCataloguePlace('Vlorë')).toMatchObject({ city: 'Vlore', country: 'Albania' });
    expect(lookupCataloguePlace('Saranda')).toMatchObject({ city: 'Sarande' });
    expect(lookupCataloguePlace('DURRËS')).toMatchObject({ city: 'Durres' });
  });

  it('files a village or resort under its city', () => {
    expect(lookupCataloguePlace('Radhima')).toMatchObject({ city: 'Vlore', locality: 'Radhimë' });
    expect(lookupCataloguePlace('Banjole', 'Croatia')).toMatchObject({ city: 'Pula', locality: 'Banjole' });
    expect(lookupCataloguePlace('Lalzit Bay')).toMatchObject({ city: 'Durres', locality: 'Gjiri i Lalzit' });
  });

  it('knows when an address already names a place under another of its names', () => {
    const lalzit = lookupCataloguePlace('Gjiri i Lalzit')!;
    expect(textMentionsPlace('Perla Resort, Lalzi Bay, Durres 2001', lalzit)).toBe(true);
    expect(textMentionsPlace('Rruga Butrinti 12', lalzit)).toBe(false);
  });

  it('finds multi-word places in a title', () => {
    expect(findCataloguePlaceInText('Apartments for Sale at Muse Residence, Gjiri i Lalzit, Albania'))
      .toMatchObject({ city: 'Durres', locality: 'Gjiri i Lalzit' });
    expect(findCataloguePlaceInText('Villa For Sale At Perla Resort In Lalzi Bay Albania')).toMatchObject({ city: 'Durres' });
  });

  it('uses the country to tell same-named places apart, and skips everyday words', () => {
    expect(findCataloguePlaceInText('Stan na moru, Bar', 'Montenegro')).toMatchObject({ city: 'Bar', country: 'Montenegro' });
    expect(findCataloguePlaceInText('Apartment with sea view near the bar and the park')).toBeUndefined();
  });

  it('gives the city of a map position: a village within a few km, else the nearest city', () => {
    expect(nearestCataloguePlace(44.8212, 13.8431, 'Croatia')).toMatchObject({ city: 'Pula', locality: 'Banjole' });
    expect(nearestCataloguePlace(44.8249, 13.8985, 'Croatia')).toMatchObject({ city: 'Medulin', locality: 'Pomer' });
    // Tušilović is not in the catalogue; Duga Resa is the nearest listed town.
    expect(nearestCataloguePlace(45.3939, 15.6155, 'Croatia')).toMatchObject({ city: 'Duga Resa' });
    expect(nearestCataloguePlace(51.5, -0.12)).toBeUndefined();
  });
});

describe('resolveLocation with the catalogue', () => {
  it('keeps an unlisted village in the address and files it under the nearest city', () => {
    const out = resolveLocation({ city: 'Tušilović', lat: 45.393883, lng: 15.615526, pageCountry: 'Croatia' });
    expect(out).toMatchObject({ city: 'Duga Resa', country: 'Croatia', address: 'Tušilović' });
  });

  it('gives an approximate position (the village centre) for the map', () => {
    expect(resolveLocation({ city: 'Radhima', country: 'Albania' })).toMatchObject({ city: 'Vlore', approxLat: 40.3838, approxLng: 19.4553 });
  });

  it('leaves a listing abroad on its own city', () => {
    expect(resolveLocation({ city: 'Ljubljana', country: 'Slovenia' })).toMatchObject({ city: 'Ljubljana', country: 'Slovenia' });
  });

  it('strips sales copy from an address', () => {
    expect(cleanListingAddress('Apartment For Sale In Gjiri i Lalzit, Durres, Albania')).toBe('Gjiri i Lalzit, Durres, Albania');
    expect(cleanListingAddress('Vila na prodaju u Puli')).toBe('Puli');
    expect(cleanListingAddress('Rruga Butrinti 12')).toBe('Rruga Butrinti 12');
  });
});
