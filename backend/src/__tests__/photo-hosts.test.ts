/**
 * Photo host allowlist
 *
 * This app serves its own frontend, so the CSP in `middleware/security.ts`
 * governs every `<img>` a visitor loads. A photo URL on an unlisted host saves
 * cleanly and then renders as a blank frame with nothing in the UI to explain
 * it — which is exactly the failure this allowlist, shared between the CSP and
 * the admin routes, exists to make impossible.
 */

// No collection is touched here — see `usesDatabase` in setup.ts.
process.env.SKIP_TEST_DB = 'true';

import {
  ALLOWED_PHOTO_HOSTS,
  CLOUDINARY_IMAGE_HOST,
  isAllowedPhotoUrl,
  allowedPhotoHostsHint,
} from '../config/imageHosts';

describe('isAllowedPhotoUrl', () => {
  it('accepts our own uploads', () => {
    expect(isAllowedPhotoUrl('https://res.cloudinary.com/demo/image/upload/v1/city.jpg')).toBe(true);
  });

  it('accepts Wikimedia, where the automatic photo chain already ends', () => {
    expect(isAllowedPhotoUrl('https://upload.wikimedia.org/wikipedia/commons/a/ab/Tirana.jpg')).toBe(true);
  });

  it('refuses a host nobody allowed', () => {
    expect(isAllowedPhotoUrl('https://images.example/city.jpg')).toBe(false);
  });

  it('matches the host exactly rather than as a suffix', () => {
    // A suffix match would accept this: it ends with an allowed host without
    // being one.
    expect(isAllowedPhotoUrl('https://res.cloudinary.com.attacker.example/x.jpg')).toBe(false);
    expect(isAllowedPhotoUrl('https://notres.cloudinary.com/x.jpg')).toBe(false);
  });

  it('is case-insensitive on the host, as DNS is', () => {
    expect(isAllowedPhotoUrl('https://RES.CLOUDINARY.COM/demo/image/upload/x.jpg')).toBe(true);
  });

  it('requires https', () => {
    expect(isAllowedPhotoUrl('http://res.cloudinary.com/demo/image/upload/x.jpg')).toBe(false);
  });

  it('refuses a scheme that is not a photo at all', () => {
    for (const url of ['javascript:alert(1)', 'data:image/png;base64,AAA', 'file:///etc/passwd', '']) {
      expect(isAllowedPhotoUrl(url)).toBe(false);
    }
  });

  it('refuses a value that is not a URL instead of throwing', () => {
    expect(isAllowedPhotoUrl('not a url')).toBe(false);
    expect(isAllowedPhotoUrl('   ')).toBe(false);
  });
});

describe('the allowlist itself', () => {
  it('names Cloudinary, so an upload through the app always passes', () => {
    expect(ALLOWED_PHOTO_HOSTS).toContain(CLOUDINARY_IMAGE_HOST);
  });

  it('lists bare hostnames — the CSP prefixes the scheme itself', () => {
    for (const host of ALLOWED_PHOTO_HOSTS) {
      expect(host).not.toMatch(/:\/\//);
      expect(host).toBe(host.toLowerCase());
    }
  });

  it('renders a hint an admin can act on', () => {
    expect(allowedPhotoHostsHint()).toContain(CLOUDINARY_IMAGE_HOST);
  });
});
