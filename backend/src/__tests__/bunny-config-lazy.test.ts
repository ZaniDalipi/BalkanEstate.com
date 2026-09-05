/**
 * The Bunny config must read `process.env` when asked, not when imported.
 *
 * This pins a bug that reached a running app. `dotenv.config()` sat in the
 * middle of `server.ts`, but ES imports are all evaluated before the importing
 * module's body runs — so every module above it had already been evaluated, and
 * `config/bunny.ts` had captured its variables while they were still unset.
 * Uploads then failed with "storage is not configured" against a `.env` that
 * was perfectly correct.
 *
 * `config/loadEnv.ts` fixes the ordering. Reading lazily, which is what these
 * cases check, means the ordering cannot break it again — and matters most for
 * the two allowlists built on top of this module, where empty does not throw:
 * the CSP's `imgSrc` and the Room Styler's SSRF check both silently reject
 * everything instead.
 */

// No collection is touched here — see `usesDatabase` in setup.ts.
process.env.SKIP_TEST_DB = 'true';

// Deliberately NOT set before the imports below. That is the whole point: a
// module that captured at load time would see nothing and stay that way.
delete process.env.BUNNY_STORAGE_ZONE;
delete process.env.BUNNY_STORAGE_PASSWORD;
delete process.env.BUNNY_PULL_ZONE_HOST;
delete process.env.BUNNY_PRIVATE_PULL_ZONE_HOST;
delete process.env.BUNNY_TOKEN_AUTH_KEY;
delete process.env.BUNNY_STORAGE_REGION;

import {
  isBunnyConfigured,
  assertBunnyConfigured,
  pullZoneHost,
  storageBaseUrl,
  cdnBaseUrl,
  privateCdnBaseUrl,
} from '../config/bunny';
import { allowedPhotoHosts, isAllowedPhotoUrl } from '../config/imageHosts';
import { buildBunnyUrl, isBunnyUrl } from '../utils/bunnyUrl';

const clear = () => {
  delete process.env.BUNNY_STORAGE_ZONE;
  delete process.env.BUNNY_STORAGE_PASSWORD;
  delete process.env.BUNNY_PULL_ZONE_HOST;
  delete process.env.BUNNY_PRIVATE_PULL_ZONE_HOST;
  delete process.env.BUNNY_TOKEN_AUTH_KEY;
  delete process.env.BUNNY_STORAGE_REGION;
};

const configure = () => {
  process.env.BUNNY_STORAGE_ZONE = 'late-zone';
  process.env.BUNNY_STORAGE_PASSWORD = 'late-password';
  process.env.BUNNY_PULL_ZONE_HOST = 'late-zone.b-cdn.net';
};

afterEach(clear);

describe('configuration read after import', () => {
  it('reports unconfigured while the variables are unset', () => {
    expect(isBunnyConfigured()).toBe(false);
    expect(() => assertBunnyConfigured()).toThrow(/BUNNY_STORAGE_ZONE/);
  });

  it('picks up variables set after this module was imported', () => {
    // Exactly the ordering that broke: the import happened first, dotenv second.
    configure();

    expect(isBunnyConfigured()).toBe(true);
    expect(() => assertBunnyConfigured()).not.toThrow();
    expect(pullZoneHost()).toBe('late-zone.b-cdn.net');
  });

  it('names what is missing, so a misconfigured deploy says which', () => {
    process.env.BUNNY_STORAGE_ZONE = 'late-zone';

    expect(() => assertBunnyConfigured()).toThrow(/BUNNY_STORAGE_PASSWORD/);
    expect(() => assertBunnyConfigured()).toThrow(/BUNNY_PULL_ZONE_HOST/);
    expect(() => assertBunnyConfigured()).not.toThrow(/BUNNY_STORAGE_ZONE,/);
  });

  it('builds URLs from the current value, not a remembered one', () => {
    configure();
    expect(cdnBaseUrl()).toBe('https://late-zone.b-cdn.net');

    process.env.BUNNY_PULL_ZONE_HOST = 'moved.b-cdn.net';
    expect(cdnBaseUrl()).toBe('https://moved.b-cdn.net');
  });

  it('applies the storage region when one is set later', () => {
    configure();
    expect(storageBaseUrl()).toBe('https://storage.bunnycdn.com/late-zone');

    process.env.BUNNY_STORAGE_REGION = 'ny';
    expect(storageBaseUrl()).toBe('https://ny.storage.bunnycdn.com/late-zone');
  });

  it('strips a scheme someone pasted into the hostname', () => {
    process.env.BUNNY_PULL_ZONE_HOST = 'https://late-zone.b-cdn.net/';
    expect(pullZoneHost()).toBe('late-zone.b-cdn.net');
  });

  it('falls back to the public zone for signing only when no private one is set', () => {
    configure();
    expect(privateCdnBaseUrl()).toBe('https://late-zone.b-cdn.net');

    process.env.BUNNY_PRIVATE_PULL_ZONE_HOST = 'docs.b-cdn.net';
    expect(privateCdnBaseUrl()).toBe('https://docs.b-cdn.net');
  });
});

describe('the allowlists built on top of it', () => {
  it('is empty before configuration — which is why it must not be captured', () => {
    // An empty allowlist does not throw. The CSP renders with no image host and
    // every photo on the site becomes a blank frame; the Room Styler rejects
    // every URL. Both are silent, which is what made the capture bug expensive.
    expect(allowedPhotoHosts()).not.toContain('');
    expect(isAllowedPhotoUrl('https://late-zone.b-cdn.net/a.webp')).toBe(false);
  });

  it('admits our CDN once the variables arrive', () => {
    configure();

    expect(allowedPhotoHosts()).toContain('late-zone.b-cdn.net');
    expect(isAllowedPhotoUrl('https://late-zone.b-cdn.net/a.webp')).toBe(true);
    // Still host-exact, still https-only.
    expect(isAllowedPhotoUrl('https://late-zone.b-cdn.net.evil.example/a.webp')).toBe(false);
    expect(isAllowedPhotoUrl('http://late-zone.b-cdn.net/a.webp')).toBe(false);
  });

  it('lists the private zone only when one is configured', () => {
    configure();
    expect(allowedPhotoHosts()).toHaveLength(2); // cdn + wikimedia

    process.env.BUNNY_PRIVATE_PULL_ZONE_HOST = 'docs.b-cdn.net';
    expect(allowedPhotoHosts()).toContain('docs.b-cdn.net');
  });
});

describe('URL helpers', () => {
  it('recognises our host only after configuration', () => {
    expect(isBunnyUrl('https://late-zone.b-cdn.net/a.webp')).toBe(false);

    configure();
    expect(isBunnyUrl('https://late-zone.b-cdn.net/a.webp')).toBe(true);
    expect(buildBunnyUrl('a.webp')).toBe('https://late-zone.b-cdn.net/a.webp');
  });
});
