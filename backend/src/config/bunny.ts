/**
 * Bunny.net configuration.
 *
 * Two separate services, two separate credentials, and it matters which is
 * which:
 *
 *  - **Storage Zone** — where bytes live. Written to over a plain HTTP API at
 *    `{region}storage.bunnycdn.com/{zone}/{path}` using the zone's *password*
 *    (FTP & API password in the dashboard). This key can delete everything in
 *    the zone, so it never leaves the backend.
 *
 *  - **Pull Zone** — where bytes are read from. A CDN hostname
 *    (`{something}.b-cdn.net`, or a custom domain) pointed at the storage
 *    zone, with Bunny Optimizer enabled so `?width=…&quality=…` resizes on the
 *    edge. Public by design: this hostname is what ends up in every `<img
 *    src>`.
 *
 * The pull zone's *token authentication key* is a third credential, used only
 * to sign URLs for the documents that must not be publicly readable (agent
 * licenses and credentials). See `signBunnyUrl`.
 */

/** Storage region prefix. Empty string = Falkenstein (DE), Bunny's default. */
const REGION_PREFIX = (process.env.BUNNY_STORAGE_REGION || '').trim().toLowerCase();

/** Storage zone name — the first path segment of every storage API call. */
export const BUNNY_STORAGE_ZONE = (process.env.BUNNY_STORAGE_ZONE || '').trim();

/** Storage zone password. Full read/write/delete on the zone — backend only. */
export const BUNNY_STORAGE_PASSWORD = (process.env.BUNNY_STORAGE_PASSWORD || '').trim();

/**
 * CDN hostname images are served from, without scheme or trailing slash.
 * e.g. `balkanestate.b-cdn.net`, or a custom domain pointed at the pull zone.
 */
export const BUNNY_PULL_ZONE_HOST = (process.env.BUNNY_PULL_ZONE_HOST || '')
  .trim()
  .replace(/^https?:\/\//i, '')
  .replace(/\/+$/, '');

/**
 * CDN hostname for private documents (agent licenses and credentials).
 *
 * A second pull zone over the *same* storage zone, with Token Authentication
 * switched on. Bunny applies token auth to a whole pull zone, so it cannot be
 * enabled on the hostname that serves listing photos to logged-out visitors —
 * doing that would make every image on the site require a signature.
 *
 * Falls back to the public host, which is correct only if that zone has token
 * auth enabled. `signBunnyUrl` will not sign without a key either way.
 */
export const BUNNY_PRIVATE_PULL_ZONE_HOST = (process.env.BUNNY_PRIVATE_PULL_ZONE_HOST || '')
  .trim()
  .replace(/^https?:\/\//i, '')
  .replace(/\/+$/, '');

/**
 * Token authentication key of the private pull zone. Only needed if sensitive
 * documents are uploaded; without it `signBunnyUrl` refuses rather than handing
 * out a URL that would be readable by anyone who guessed the path.
 */
export const BUNNY_TOKEN_AUTH_KEY = (process.env.BUNNY_TOKEN_AUTH_KEY || '').trim();

/** Base URL for the storage API, e.g. `https://storage.bunnycdn.com/my-zone`. */
export const BUNNY_STORAGE_BASE_URL =
  `https://${REGION_PREFIX ? `${REGION_PREFIX}.` : ''}storage.bunnycdn.com/${BUNNY_STORAGE_ZONE}`;

/** Public base URL for delivery, e.g. `https://balkanestate.b-cdn.net`. */
export const BUNNY_CDN_BASE_URL = `https://${BUNNY_PULL_ZONE_HOST}`;

/** Base URL signed document URLs are issued against. */
export const BUNNY_PRIVATE_CDN_BASE_URL =
  `https://${BUNNY_PRIVATE_PULL_ZONE_HOST || BUNNY_PULL_ZONE_HOST}`;

/**
 * True when uploads can actually happen.
 *
 * Checked rather than assumed because the ingest pipeline runs in development
 * against a backend with no Bunny credentials at all, and should reference
 * source URLs instead of failing.
 */
export const isBunnyConfigured = (): boolean =>
  Boolean(BUNNY_STORAGE_ZONE && BUNNY_STORAGE_PASSWORD && BUNNY_PULL_ZONE_HOST);

/** Throw with the missing names, so a misconfigured deploy says which. */
export const assertBunnyConfigured = (): void => {
  const missing = [
    !BUNNY_STORAGE_ZONE && 'BUNNY_STORAGE_ZONE',
    !BUNNY_STORAGE_PASSWORD && 'BUNNY_STORAGE_PASSWORD',
    !BUNNY_PULL_ZONE_HOST && 'BUNNY_PULL_ZONE_HOST',
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new Error(`Bunny.net storage is not configured: missing ${missing.join(', ')}`);
  }
};
