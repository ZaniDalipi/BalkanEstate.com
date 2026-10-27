import { describe, it, expect } from 'vitest';
import { residenceShareLinks } from './residenceShare';

describe('residenceShareLinks', () => {
  it('shares the residence page in the sharer’s language, without filters or open apartments', () => {
    expect(residenceShareLinks('https://balkanestateai.com/', 'sq', 'plaza-tirana', 'https://api.balkanestateai.com/api/')).toEqual({
      pageUrl: 'https://balkanestateai.com/sq/developments/plaza-tirana',
      cardUrl: 'https://api.balkanestateai.com/api/og/residence/plaza-tirana/image.jpg?lang=sq',
    });
  });

  it('encodes the slug', () => {
    expect(residenceShareLinks('https://x.test', 'en', 'a b', 'https://api.x.test/api').pageUrl).toBe('https://x.test/en/developments/a%20b');
  });
});
