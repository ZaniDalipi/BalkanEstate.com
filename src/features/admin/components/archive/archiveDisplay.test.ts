import { describe, expect, it } from 'vitest';
import { archiveActorName, archivePlace, archivePrice } from './archiveDisplay';

describe('archivePrice', () => {
  it('prefers the final sale price', () => {
    expect(archivePrice({ price: 100000, salePrice: 95000, listingType: 'sale' }, 'en')).toBe('€95,000');
  });

  it('marks rents per month', () => {
    expect(archivePrice({ price: 600, listingType: 'rent' }, 'en')).toBe('€600/mo');
  });

  it('is empty when there was no price', () => {
    expect(archivePrice({ price: 0, listingType: 'sale' }, 'en')).toBeNull();
  });
});

describe('archivePlace', () => {
  it('drops placeholder parts', () => {
    expect(archivePlace({ address: 'Unknown', city: 'Tirana', country: 'Albania' })).toBe('Tirana, Albania');
  });
});

describe('archiveActorName', () => {
  it('uses the name, then the email', () => {
    expect(archiveActorName({ deletedBy: { kind: 'admin', name: ' ', email: 'a@x.com' } })).toBe('a@x.com');
    expect(archiveActorName({ deletedBy: { kind: 'owner', name: 'Ana' } })).toBe('Ana');
  });

  it('is empty for archives made before removals were attributed', () => {
    expect(archiveActorName({})).toBeNull();
  });
});
