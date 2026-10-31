/**
 * Readable folder names: "{name}_{id}" — readable in the R2 dashboard, still
 * unique and findable by id after a rename.
 */
process.env.SKIP_TEST_DB = 'true';

import { namedSegment, safeId, slugify } from '../services/media/mediaNaming';

describe('slugify', () => {
  it('strips accents and punctuation', () => {
    expect(slugify('Ëndrit Hoxha')).toBe('endrit-hoxha');
    expect(slugify('Cozy 2BR in Tëtovo!')).toBe('cozy-2br-in-tetovo');
  });

  it('returns empty for nothing usable', () => {
    expect(slugify('!!!')).toBe('');
    expect(slugify(undefined)).toBe('');
  });

  it('caps the length without leaving a trailing dash', () => {
    expect(slugify('a'.repeat(39) + ' bbbb', 40)).toBe('a'.repeat(39));
  });
});

describe('namedSegment', () => {
  it('puts the name first and keeps the id', () => {
    expect(namedSegment('Zani Dalipi', '69a95232b8503c30a91e6842')).toBe('zani-dalipi_69a95232b8503c30a91e6842');
  });

  it('falls back to the id alone', () => {
    expect(namedSegment(undefined, '69a95232b8503c30a91e6842')).toBe('69a95232b8503c30a91e6842');
    expect(namedSegment('', undefined)).toBe('unknown');
  });

  it('never lets an id escape its folder', () => {
    expect(safeId('../../etc')).toBe('______etc');
  });
});
