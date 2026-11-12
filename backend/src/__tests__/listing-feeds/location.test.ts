process.env.SKIP_TEST_DB = 'true';

import {
  acceptLocationGuesses, canonicalCity, countryFromPageSignals, findPlaceInText,
  fixSwappedCoordinates, isPlausiblePlaceName,
} from '../../services/listingAttributes/location';
import { resolveLocation } from '../../services/listingAttributes/resolveLocation';
import { geocodeListing, placeAtStartOfTitle } from '../../services/listingAttributes/geocodeListing';

describe('place names', () => {
  it('matches a known city however it is spelled', () => {
    expect(canonicalCity('Vlorë')).toBe('Vlorë');
    expect(canonicalCity('VLORE')).toBe('Vlorë');
    expect(canonicalCity('Durrës')).toBe('Durrës');
  });

  it('finds a known city and country inside a title or URL', () => {
    expect(findPlaceInText('Apartments For Sale In Marea Coast Radhime, Vlore Albania')).toEqual({ city: 'Vlorë', country: 'Albania' });
    expect(findPlaceInText('/en/properties/Durres-ALDS342/')).toMatchObject({ city: 'Durrës' });
    expect(findPlaceInText('Nice apartment with me')).toEqual({});
  });

  it('tells place names from button text', () => {
    expect(isPlausiblePlaceName('Banjole')).toBe(true);
    expect(isPlausiblePlaceName('Herceg Novi')).toBe(true);
    expect(isPlausiblePlaceName('Load More...')).toBe(false);
    expect(isPlausiblePlaceName('View details')).toBe(false);
    expect(isPlausiblePlaceName('12345')).toBe(false);
  });
});

describe('coordinates', () => {
  it('swaps a pair a site wrote the wrong way round', () => {
    expect(fixSwappedCoordinates(19.486741, 40.357529)).toEqual({ lat: 40.357529, lng: 19.486741 });
    expect(fixSwappedCoordinates(44.82, 13.86)).toEqual({ lat: 44.82, lng: 13.86 });
    // Outside our region both ways: leave it as given.
    expect(fixSwappedCoordinates(51.5, -0.12)).toEqual({ lat: 51.5, lng: -0.12 });
  });
});

describe('resolveLocation', () => {
  it("files a village under its city from the app's catalogue and keeps the village in the address", () => {
    const out = resolveLocation({ city: 'Radhime', country: 'AL', address: 'Rruga e Plazhit', title: 'Flat in Radhime, Vlore', lat: 19.48, lng: 40.35 });
    expect(out).toMatchObject({ city: 'Vlore', country: 'Albania', address: 'Rruga e Plazhit, Radhimë', lat: 40.35, lng: 19.48 });
  });

  it('keeps an unknown village as the city rather than losing it', () => {
    expect(resolveLocation({ city: 'Volme', pageCountry: 'Croatia' })).toMatchObject({ city: 'Volme', country: 'Croatia' });
  });

  it('never keeps button text as a city', () => {
    expect(resolveLocation({ city: 'Load More...' }).city).toBeUndefined();
  });

  it('reads the city from the URL when nothing else names it', () => {
    expect(resolveLocation({ title: 'Studio' }, 'https://x.example/en/properties/Sarande-ALSS945/')).toMatchObject({ city: 'Sarande' });
  });
});

describe('acceptLocationGuesses', () => {
  it('drops layout guesses that are UI text', () => {
    const target: Record<string, unknown> = {};
    acceptLocationGuesses(target, {}, { city: 'Load', country: 'More...' });
    expect(target).toEqual({});
  });

  it('keeps a labelled village, but a chip only when it is a known city', () => {
    const t1: Record<string, unknown> = {};
    acceptLocationGuesses(t1, { city: 'Volme' }, {});
    expect(t1.city).toBe('Volme');
    const t2: Record<string, unknown> = {};
    acceptLocationGuesses(t2, {}, { city: 'Volme', country: 'Hrvatska' });
    expect(t2).toEqual({ country: 'Croatia' });
  });
});

describe('countryFromPageSignals', () => {
  it('uses a local page language, then the domain, then the phone prefix', () => {
    expect(countryFromPageSignals('<html lang="hr-HR">')).toBe('Croatia');
    expect(countryFromPageSignals('<html lang="en">', 'https://agency.al/x')).toBe('Albania');
    expect(countryFromPageSignals('<html lang="en"><a href="tel:+385.98.22.33.97">call</a>', 'https://agency.com/')).toBe('Croatia');
    expect(countryFromPageSignals('<html lang="en">', 'https://agency.com/')).toBeUndefined();
  });
});

describe('geocodeListing', () => {
  const hit = { lat: 44.8, lng: 13.9 };

  it('tries the most precise query first', async () => {
    const structured = jest.fn().mockResolvedValue(hit);
    const freeform = jest.fn();
    await expect(geocodeListing({ address: 'Ulica 5', city: 'Pula', country: 'Croatia' }, { structured, freeform })).resolves.toEqual(hit);
    expect(structured).toHaveBeenCalledWith('Ulica 5', 'Pula', 'Croatia');
    expect(freeform).not.toHaveBeenCalled();
  });

  it('falls back to the city, then the place a title starts with', async () => {
    const structured = jest.fn().mockResolvedValue(null);
    const freeform = jest.fn(async (q: string) => (q === 'Banjole, Croatia' ? hit : null));
    const out = await geocodeListing({ country: 'Croatia', title: 'Banjole , kuća+bazen-na moru' }, { structured, freeform });
    expect(out).toEqual(hit);
  });

  it('takes a place from the start of a title only when it reads like one', () => {
    expect(placeAtStartOfTitle('Medulin - Ševe, poljoprivredno zemljište')).toBe('Medulin');
    expect(placeAtStartOfTitle('Load more listings in the area today, please')).toBeUndefined();
  });
});
