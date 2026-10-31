import { describe, expect, it } from 'vitest';
import { mailHref, safeWebHref, siteLabel, telHref, yearsActive } from './builderLinks';

describe('builder links', () => {
  it('only plain http(s) web links become links', () => {
    expect(safeWebHref('https://balkanbuild.mk/about')).toBe('https://balkanbuild.mk/about');
    expect(safeWebHref('javascript:alert(1)')).toBeUndefined();
    expect(safeWebHref('data:text/html,x')).toBeUndefined();
    expect(safeWebHref('not a link')).toBeUndefined();
    expect(safeWebHref(undefined)).toBeUndefined();
  });
  it('phone and email links are clean', () => {
    expect(telHref('+389 2 123-4567')).toBe('tel:+38921234567');
    expect(telHref('(02) 555 1234')).toBe('tel:025551234');
    expect(telHref('12')).toBeUndefined();
    expect(mailHref('sales@balkanbuild.mk')).toBe('mailto:sales@balkanbuild.mk');
    expect(mailHref('sales@')).toBeUndefined();
  });
  it('labels a site by its name and counts the years', () => {
    expect(siteLabel('https://www.balkanbuild.mk/x')).toBe('balkanbuild.mk');
    expect(yearsActive(2004, new Date('2026-05-01'))).toBe(22);
    expect(yearsActive(2030, new Date('2026-05-01'))).toBeUndefined();
  });
});
