import { describe, it, expect } from 'vitest';
import type { Development } from '../../../types';
import { changedFields, toDraft } from './detailsDraft';

const dev = {
  id: 'd1',
  name: 'Plaza',
  country: 'Albania',
  city: 'Tirana',
  address: 'Rr. Ismail Qemali',
  lat: 41.3275,
  lng: 19.8187,
  category: 'apartment_building',
  constructionStatus: 'under_construction',
  expectedCompletionDate: '2027-06-30T00:00:00.000Z',
  amenities: ['Pool'],
  contact: { email: 'sales@plaza.al' },
} as unknown as Development;

describe('residence details draft', () => {
  it('sends nothing when nothing changed', () => {
    expect(changedFields(toDraft(dev), dev)).toEqual({});
    expect(toDraft(dev).expectedCompletionDate).toBe('2027-06-30');
  });

  it('sends only the changed fields, trimmed', () => {
    const draft = { ...toDraft(dev), name: '  Plaza Tower ', municipality: 'Njësia 5', amenities: ['Pool', 'Gym'] };
    expect(changedFields(draft, dev)).toEqual({ name: 'Plaza Tower', municipality: 'Njësia 5', amenities: ['Pool', 'Gym'] });
  });

  it('sends both coordinates together and clears them with null', () => {
    expect(changedFields({ ...toDraft(dev), lat: '41.33' }, dev)).toEqual({ lat: 41.33, lng: 19.8187 });
    expect(changedFields({ ...toDraft(dev), lat: '', lng: '' }, dev)).toEqual({ lat: null, lng: null });
  });

  it('sends the whole contact, or null when it was emptied', () => {
    expect(changedFields({ ...toDraft(dev), contactPhone: '+355 69 000 0000' }, dev)).toEqual({
      contact: { name: '', email: 'sales@plaza.al', phone: '+355 69 000 0000' },
    });
    expect(changedFields({ ...toDraft(dev), contactEmail: '' }, dev)).toEqual({ contact: null });
  });
});
