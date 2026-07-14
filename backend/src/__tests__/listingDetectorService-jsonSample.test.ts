import { detectFromJsonSample } from '../services/listingDetectorService';

describe('detectFromJsonSample', () => {
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

  it('parses machine-generated JSON containing curly quotes when trusted=true', () => {
    const json = JSON.stringify(rows);
    const result = detectFromJsonSample(json, { trusted: true });
    expect(result.adapterType).toBe('jsonFeed');
    expect(result.sample).toMatchObject({ Title: "Owner's flat", City: 'Split' });
  });

  it('corrupts the same JSON when trusted is not set (documents legacy paste-cleanup behavior)', () => {
    const json = JSON.stringify(rows);
    expect(() => detectFromJsonSample(json)).toThrow(/Invalid JSON/);
  });

  it('still applies smart-quote/trailing-comma cleanup for genuinely hand-typed input', () => {
    // A human pasting from Word/Notes with curly quotes and a trailing comma —
    // this is the case the cleanup step exists for, and must keep working.
    const pasted = '[{ “title”: “Flat”, “price”: 1000, }]';
    const result = detectFromJsonSample(pasted);
    expect(result.sample).toMatchObject({ title: 'Flat', price: 1000 });
  });

  it('rejects empty input the same way regardless of trusted flag', () => {
    expect(() => detectFromJsonSample('   ')).toThrow(/paste a JSON sample/i);
    expect(() => detectFromJsonSample('   ', { trusted: true })).toThrow(/paste a JSON sample/i);
  });
});
