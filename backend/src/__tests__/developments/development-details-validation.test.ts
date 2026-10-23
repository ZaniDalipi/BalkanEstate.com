import { normalizeAmenities, normalizeContact, MAX_AMENITIES } from '../../services/developments/developmentService';

describe('development details validation', () => {
  it('trims, drops blanks and de-duplicates amenities case-insensitively', () => {
    expect(normalizeAmenities([' Pool ', '', 'pool', 'Gym', 42])).toEqual(['Pool', 'Gym']);
    expect(normalizeAmenities(undefined)).toEqual([]);
  });

  it('rejects non-lists, overlong amenities and too many amenities', () => {
    expect(() => normalizeAmenities('Pool')).toThrow('amenities must be a list');
    expect(() => normalizeAmenities(['x'.repeat(61)])).toThrow(/at most 60/);
    expect(() => normalizeAmenities(Array.from({ length: MAX_AMENITIES + 1 }, (_, i) => `A${i}`))).toThrow(/At most/);
  });

  it('keeps only filled contact fields and checks the email', () => {
    expect(normalizeContact({ name: ' Sales ', email: 'sales@plaza.al', phone: '' })).toEqual({ name: 'Sales', email: 'sales@plaza.al' });
    expect(normalizeContact({ name: '', email: '', phone: '' })).toBeUndefined();
    expect(() => normalizeContact({ email: 'not-an-email' })).toThrow(/valid email/);
    expect(() => normalizeContact(['x'])).toThrow('contact must be an object');
  });
});
