/**
 * resolveId must read the encoded id at the end of an SEO slug by length:
 * base64url ids can contain "_", so splitting on the last "_" cut them short
 * and the business page answered 404.
 */
process.env.SKIP_TEST_DB = 'true';

import { encodeId, resolveId } from '../utils/idObfuscation';

const HEX = 'a9c75a9a00844de651e14ea9';

describe('resolveId', () => {
  it('encodes this id with an underscore inside (the case that broke)', () => {
    expect(encodeId(HEX)).toBe('6_M28TTqCJUl1TrM');
  });

  it.each([
    ['a raw ObjectId', HEX],
    ['an encoded id', '6_M28TTqCJUl1TrM'],
    ['a slug whose id contains "_"', 'regina-group-construction-in-vlore-albania_6_M28TTqCJUl1TrM'],
    ['a slug whose id has no "_"', `acme_${encodeId('65f1a2b3c4d5e6f708192a3b')}`],
  ])('resolves %s', (_label, param) => {
    expect(resolveId(param)).toMatch(/^[a-f0-9]{24}$/);
  });

  it('gives the same id for the slug as for the bare encoded id', () => {
    expect(resolveId('regina-group-construction-in-vlore-albania_6_M28TTqCJUl1TrM')).toBe(HEX);
  });

  it('still returns null for something that is not an id', () => {
    expect(resolveId('regina-group-construction')).toBeNull();
    expect(resolveId('qkgXEcz8pju5t')).toBeNull();
  });
});
