import { describe, expect, it } from 'vitest';
import { isWebUrl, stripScheme, toWebUrl } from './webAddress';

describe('web addresses typed without https://', () => {
  it('drops a typed or pasted scheme, and spaces', () => {
    expect(stripScheme('https://www.x.com')).toBe('www.x.com');
    expect(stripScheme('HTTP://x.com/path')).toBe('x.com/path');
    expect(stripScheme('//x.com')).toBe('x.com');
    expect(stripScheme(' https://https://x.com \n')).toBe('x.com');
    expect(stripScheme('www.x.com')).toBe('www.x.com');
    expect(stripScheme(undefined)).toBe('');
  });

  it('saves the address with https:// added, and nothing for an empty field', () => {
    expect(toWebUrl('www.x.com')).toBe('https://www.x.com');
    expect(toWebUrl('x.com')).toBe('https://x.com');
    expect(toWebUrl('http://x.com')).toBe('https://x.com');
    expect(toWebUrl('facebook.com/balkan')).toBe('https://facebook.com/balkan');
    expect(toWebUrl('   ')).toBe('');
  });

  it('accepts only a real https site', () => {
    expect(isWebUrl('https://www.x.com')).toBe(true);
    expect(isWebUrl('https://x.co.uk/a?b=1')).toBe(true);
    expect(isWebUrl(toWebUrl('javascript:alert(1)'))).toBe(false);
    expect(isWebUrl(toWebUrl('localhost'))).toBe(false);
    expect(isWebUrl(toWebUrl('user:pass@x.com'))).toBe(false);
    expect(isWebUrl(toWebUrl('x.c'))).toBe(false);
    expect(isWebUrl('http://x.com')).toBe(false);
  });
});
