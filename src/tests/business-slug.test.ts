import { describe, expect, it } from 'vitest';
import { businessIdFromSlug, generateBusinessSlug } from '../../utils/slug';

// A real encoded id that contains "_" (base64url uses it), as the API returns.
const ID_WITH_UNDERSCORE = '6_M28TTqCJUl1TrM';

describe('businessIdFromSlug', () => {
  it('reads the id back out of a generated slug, even when the id contains "_"', () => {
    const slug = generateBusinessSlug({ id: ID_WITH_UNDERSCORE, name: 'Regina Group', category: 'construction', city: 'Vlore', country: 'Albania' });
    expect(slug).toBe('regina-group-construction-in-vlore-albania_6_M28TTqCJUl1TrM');
    expect(businessIdFromSlug(slug)).toBe(ID_WITH_UNDERSCORE);
  });

  it('keeps ids without "_" working', () => {
    expect(businessIdFromSlug('acme-law-in-skopje_AbCdEfGhIjKlMnOp')).toBe('AbCdEfGhIjKlMnOp');
  });

  it('passes anything that is not a slug through for the API to resolve', () => {
    expect(businessIdFromSlug(ID_WITH_UNDERSCORE)).toBe(ID_WITH_UNDERSCORE);
    expect(businessIdFromSlug('regina-group-construction')).toBe('regina-group-construction');
    expect(businessIdFromSlug('a9c75a9a00844de651e14ea9')).toBe('a9c75a9a00844de651e14ea9');
  });
});
