import { detectFromJsonSample, detectFromParsedListingData } from '../services/listingDetectorService';

const rows = [
  {
    Title: "Owner's flat",
    Description: 'Spacious, 5” windows, close to the sea',
    Price: 95000,
    City: 'Split',
  },
  {
    Title: 'Modern house',
    Description: "Kid's room, quiet street",
    Price: 150000,
    City: 'Zagreb',
  },
];

describe('detectFromParsedListingData', () => {
  it('analyzes already-parsed rows (e.g. from a CSV/Excel upload) with no text parsing involved', () => {
    // Values contain curly quotes/apostrophes that would corrupt the human-paste
    // cleanup path if this ever got funneled through JSON.stringify + text cleanup.
    const result = detectFromParsedListingData(rows);
    expect(result.adapterType).toBe('jsonFeed');
    expect(result.sample).toMatchObject({ Title: "Owner's flat", City: 'Split' });
  });

  it('rejects a primitive value', () => {
    expect(() => detectFromParsedListingData('just a string')).toThrow(/object or array/i);
  });

  it('rejects data with no listing-shaped objects', () => {
    expect(() => detectFromParsedListingData([{ foo: 'bar' }])).toThrow(/none look like real-estate listings/i);
  });
});

describe('detectFromJsonSample (human "Paste JSON" textarea)', () => {
  it('parses well-formed JSON text', () => {
    const result = detectFromJsonSample(JSON.stringify(rows));
    expect(result.sample).toMatchObject({ Title: "Owner's flat" });
  });

  it('cleans up smart quotes and trailing commas from hand-typed/pasted text', () => {
    const pasted = '[{ “title”: “Flat”, “price”: 1000, }]';
    const result = detectFromJsonSample(pasted);
    expect(result.sample).toMatchObject({ title: 'Flat', price: 1000 });
  });

  it('rejects empty input', () => {
    expect(() => detectFromJsonSample('   ')).toThrow(/paste a JSON sample/i);
  });

  it('surfaces a helpful error for malformed JSON', () => {
    expect(() => detectFromJsonSample('{ not json')).toThrow(/Invalid JSON/);
  });
});
