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
 *
 * ## Why these are functions
 *
 * Every value is read from `process.env` when it is asked for, not captured
 * when this module is first imported. Module-level capture is an invisible
 * ordering dependency: `dotenv` has to have run before the first import that
 * reaches this file, and when it has not, the variables come back empty. For
 * an upload that throws, which is findable. For the allowlists built on top of
 * these — the CSP's `imgSrc`, the Room Styler's SSRF check — an empty value
 * silently rejects everything instead, which is not.
 *
 * `config/loadEnv.ts` fixes the ordering; reading lazily means the ordering
 * cannot break it again.
 */

/** Read a variable, trimmed. Never cached — see the note above. */
const env = (name: string): string => (process.env[name] || '').trim();

/** Strip scheme and trailing slashes so a hostname is always a bare host. */
const asHostname = (value: string): string =>
  value.replace(/^https?:\/\//i, '').replace(/\/+$/, '');

/** Storage zone name — the first path segment of every storage API call. */
export const storageZone = (): string => env('BUNNY_STORAGE_ZONE');

/** Storage zone password. Full read/write/delete on the zone — backend only. */
export const storagePassword = (): string => env('BUNNY_STORAGE_PASSWORD');

/**
 * CDN hostname images are served from, without scheme.
 * e.g. `balkanestate.b-cdn.net`, or a custom domain pointed at the pull zone.
 */
export const pullZoneHost = (): string => asHostname(env('BUNNY_PULL_ZONE_HOST'));

/**
 * CDN hostname for private documents (agent licenses and credentials).
 *
 * A second pull zone over the *same* storage zone, with Token Authentication
 * switched on. Bunny applies token auth to a whole pull zone, so it cannot be
 * enabled on the hostname that serves listing photos to logged-out visitors —
 * doing that would make every image on the site require a signature.
 */
export const privatePullZoneHost = (): string =>
  asHostname(env('BUNNY_PRIVATE_PULL_ZONE_HOST'));

/**
 * Token authentication key of the private pull zone. Only needed if sensitive
 * documents are uploaded; without it `signBunnyUrl` refuses rather than handing
 * out a publicly readable one.
 */
export const tokenAuthKey = (): string => env('BUNNY_TOKEN_AUTH_KEY');

/** Base URL for the storage API, e.g. `https://storage.bunnycdn.com/my-zone`. */
export const storageBaseUrl = (): string => {
  const region = env('BUNNY_STORAGE_REGION').toLowerCase();
  return `https://${region ? `${region}.` : ''}storage.bunnycdn.com/${storageZone()}`;
};

/** Public base URL for delivery, e.g. `https://balkanestate.b-cdn.net`. */
export const cdnBaseUrl = (): string => `https://${pullZoneHost()}`;

/**
 * Base URL signed document URLs are issued against.
 *
 * Falls back to the public host, which is correct only if that zone has token
 * auth enabled. `signBunnyUrl` will not sign without a key either way.
 */
export const privateCdnBaseUrl = (): string =>
  `https://${privatePullZoneHost() || pullZoneHost()}`;

/**
 * True when uploads can actually happen.
 *
 * Checked rather than assumed because the ingest pipeline runs in development
 * against a backend with no Bunny credentials at all, and should reference
 * source URLs instead of failing.
 */
export const isBunnyConfigured = (): boolean =>
  Boolean(storageZone() && storagePassword() && pullZoneHost());

/** Throw with the missing names, so a misconfigured deploy says which. */
export const assertBunnyConfigured = (): void => {
  const missing = [
    !storageZone() && 'BUNNY_STORAGE_ZONE',
    !storagePassword() && 'BUNNY_STORAGE_PASSWORD',
    !pullZoneHost() && 'BUNNY_PULL_ZONE_HOST',
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new Error(
      `Bunny.net storage is not configured: missing ${missing.join(', ')}. ` +
      'Set them in backend/.env (see backend/.env.example) and restart the server.',
    );
  }
};
