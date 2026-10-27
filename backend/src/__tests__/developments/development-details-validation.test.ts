import { normalizeAmenities, normalizeContact, normalizeYearBuilt, timelineFor, MAX_AMENITIES } from '../../services/developments/developmentService';

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

  it('accepts a past build year and rejects future or malformed ones', () => {
    expect(normalizeYearBuilt('2019')).toBe(2019);
    expect(normalizeYearBuilt('')).toBeUndefined();
    expect(() => normalizeYearBuilt(new Date().getFullYear() + 1)).toThrow(/yearBuilt/);
    expect(() => normalizeYearBuilt(2019.5)).toThrow(/yearBuilt/);
    expect(() => normalizeYearBuilt(1700)).toThrow(/yearBuilt/);
  });

  it('keeps the build year only when completed, and the expected date only before that', () => {
    const values = { expectedCompletionDate: new Date('2027-06-30'), yearBuilt: 2019 };
    expect(timelineFor('completed', values)).toEqual({ expectedCompletionDate: undefined, yearBuilt: 2019 });
    expect(timelineFor('under_construction', values)).toEqual({ expectedCompletionDate: values.expectedCompletionDate, yearBuilt: undefined });
  });
});
