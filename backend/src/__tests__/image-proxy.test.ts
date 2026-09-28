/**
 * Image proxy: request validation, SSRF guard and the in-memory LRU.
 * No network — DNS is injected.
 */
process.env.SKIP_TEST_DB = 'true';

import { isNonPublicAddress, resolvePublicUrl, SsrfError } from '../utils/ssrfGuard';
import { snapProxyWidth, validateProxyRequest } from '../services/imageProxy/imageProxyService';
import { SizedLru } from '../services/imageProxy/imageProxyCache';

describe('validateProxyRequest', () => {
  it('accepts an https URL and snaps the width to a bucket', () => {
    const result = validateProxyRequest({ url: 'https://example.com/a.jpg', w: '300' });
    expect(result).toEqual({ isValid: true, value: { url: 'https://example.com/a.jpg', width: 320 } });
  });

  it('defaults the width', () => {
    expect(validateProxyRequest({ url: 'https://example.com/a.jpg' }).value?.width).toBe(800);
  });

  it('caps the width at 1920', () => {
    expect(snapProxyWidth(5000)).toBe(1920);
  });

  it.each([
    [{}, 'Missing url parameter'],
    [{ url: 'ftp://example.com/a.jpg' }, 'Only http/https URLs are allowed'],
    [{ url: 'javascript:alert(1)' }, 'Only http/https URLs are allowed'],
    [{ url: 'https://example.com/a b.jpg' }, 'URL contains invalid characters'],
    [{ url: `https://example.com/${'a'.repeat(2100)}` }, 'URL is too long'],
    [{ url: 'https://example.com/a.jpg', w: '-5' }, 'w must be a positive whole number'],
    [{ url: 'https://example.com/a.jpg', w: '12abc' }, 'w must be a positive whole number'],
    [{ url: 'https://example.com/a.jpg', w: ['1', '2'] }, 'w must be a positive whole number'],
  ])('rejects %j', (query, error) => {
    expect(validateProxyRequest(query as never)).toEqual({ isValid: false, error });
  });
});

describe('isNonPublicAddress', () => {
  it.each(['127.0.0.1', '10.1.2.3', '172.16.0.1', '192.168.1.1', '169.254.169.254', '100.64.0.1', '0.0.0.0', '::1', 'fc00::1', 'fe80::1', '::ffff:10.0.0.1', 'not-an-ip'])(
    'blocks %s',
    (address) => {
      expect(isNonPublicAddress(address)).toBe(true);
    }
  );

  it.each(['8.8.8.8', '151.101.1.140', '2606:4700::1111'])('allows %s', (address) => {
    expect(isNonPublicAddress(address)).toBe(false);
  });
});

describe('resolvePublicUrl', () => {
  const resolvesTo = (address: string, family = 4) => async () => [{ address, family }];

  it('accepts a host that resolves to a public address and pins it', async () => {
    const vetted = await resolvePublicUrl('https://photos.example.com/a.jpg', resolvesTo('93.184.216.34'));
    expect(vetted.address).toBe('93.184.216.34');
    await new Promise<void>((done) => {
      vetted.lookup('photos.example.com', {}, (err, address) => {
        expect(err).toBeNull();
        expect(address).toBe('93.184.216.34');
        done();
      });
    });
  });

  it('rejects a public name that resolves to a private address (DNS rebinding)', async () => {
    await expect(resolvePublicUrl('https://evil.example.com/x.jpg', resolvesTo('10.0.0.5'))).rejects.toBeInstanceOf(SsrfError);
  });

  it('rejects cloud metadata and loopback literals', async () => {
    await expect(resolvePublicUrl('http://169.254.169.254/latest/meta-data')).rejects.toBeInstanceOf(SsrfError);
    await expect(resolvePublicUrl('http://[::1]/x.jpg')).rejects.toBeInstanceOf(SsrfError);
  });

  it('rejects odd ports, credentials and other schemes', async () => {
    await expect(resolvePublicUrl('https://example.com:8080/a.jpg', resolvesTo('93.184.216.34'))).rejects.toThrow('ports');
    await expect(resolvePublicUrl('https://u:p@example.com/a.jpg', resolvesTo('93.184.216.34'))).rejects.toThrow('credentials');
    await expect(resolvePublicUrl('file:///etc/passwd')).rejects.toThrow('http and https');
  });

  it('rejects when any resolved address is private', async () => {
    const mixed = async () => [{ address: '93.184.216.34', family: 4 }, { address: '127.0.0.1', family: 4 }];
    await expect(resolvePublicUrl('https://example.com/a.jpg', mixed)).rejects.toBeInstanceOf(SsrfError);
  });
});

describe('SizedLru', () => {
  it('evicts the least recently used entry when over size', () => {
    const lru = new SizedLru<Buffer>(10, 60_000, (b) => b.length);
    lru.set('a', Buffer.alloc(4));
    lru.set('b', Buffer.alloc(4));
    lru.get('a'); // a is now most recent
    lru.set('c', Buffer.alloc(4));
    expect(lru.get('b')).toBeUndefined();
    expect(lru.get('a')).toBeDefined();
    expect(lru.get('c')).toBeDefined();
  });

  it('expires entries after the TTL', () => {
    jest.useFakeTimers();
    const lru = new SizedLru<string>(10, 1000, () => 1);
    lru.set('a', 'x');
    jest.advanceTimersByTime(1001);
    expect(lru.get('a')).toBeUndefined();
    jest.useRealTimers();
  });

  it('refuses a single entry larger than the whole cache', () => {
    const lru = new SizedLru<Buffer>(4, 60_000, (b) => b.length);
    lru.set('big', Buffer.alloc(8));
    expect(lru.get('big')).toBeUndefined();
  });
});
