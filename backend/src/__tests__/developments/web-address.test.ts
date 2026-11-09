process.env.SKIP_TEST_DB = 'true';

import { withHttps } from '../../services/developments/webAddress';
import { normalizeBuilderText } from '../../services/developments/builderProfile';
import { normalizeWebsite } from '../../services/developments/developmentService';

describe('web addresses typed without https://', () => {
  it('adds https:// only when there is no scheme', () => {
    expect(withHttps('www.x.com')).toBe('https://www.x.com');
    expect(withHttps(' x.com/a ')).toBe('https://x.com/a');
    expect(withHttps('//x.com')).toBe('https://x.com');
    expect(withHttps('https://x.com')).toBe('https://x.com');
    expect(withHttps('javascript:alert(1)')).toBe('javascript:alert(1)');
    expect(withHttps('')).toBe('');
  });

  it('the residence website: saved with https://, refused when it is not a real site', () => {
    expect(normalizeWebsite('www.aria.mk')).toBe('https://www.aria.mk');
    expect(normalizeWebsite('http://aria.mk')).toBe('http://aria.mk');
    expect(normalizeWebsite('')).toBeUndefined();
    for (const bad of ['javascript:alert(1)', 'aria', 'user:pw@aria.mk', 'aria .mk', 42, 'x'.repeat(301)]) {
      expect(() => normalizeWebsite(bad)).toThrow(expect.objectContaining({ code: 'URL_INVALID' }));
    }
  });

  it('the builder: website and socials saved with https://, a social link only on its network', () => {
    const out = normalizeBuilderText({ name: 'B', website: 'www.b.mk', socials: { instagram: 'instagram.com/b' } });
    expect(out).toMatchObject({ website: 'https://www.b.mk', socials: { instagram: 'https://instagram.com/b' } });
    expect(() => normalizeBuilderText({ name: 'B', socials: { facebook: 'balkanestateai.com' } })).toThrow(expect.objectContaining({ code: 'SOCIAL_HOST' }));
  });
});
