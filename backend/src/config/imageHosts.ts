/**
 * Hosts a photo may be served from.
 *
 * The app serves its own single-page frontend (see `server.ts`), so the CSP in
 * `middleware/security.ts` governs every `<img>` a visitor loads. A host
 * missing from `imgSrc` fails silently — a blank frame, no console error a
 * curator would ever see — which makes a photo URL saved from an unlisted host
 * a setting that appears to work and doesn't.
 *
 * So the allowlist is stated once, here, and used twice: the CSP is built from
 * it, and the admin routes that accept a photo URL validate against it. An
 * admin then gets a sentence explaining the refusal at the moment they paste
 * the URL, instead of a picture that never appears.
 *
 * Adding a host means allowing every visitor's browser to fetch images from
 * it. Uploading through the app is the route that needs no entry at all: those
 * land on our own pull zone, which is already listed.
 */
import { pullZoneHost, privatePullZoneHost } from './bunny';

/**
 * Where our own uploads and transformations live: the Bunny pull zone.
 *
 * Read from the environment rather than hardcoded, because it differs per
 * deployment — and because a stale literal here would block every image on the
 * site in exactly the silent way this module exists to prevent.
 */
export const cdnImageHost = (): string => pullZoneHost();

/**
 * Hosts that may appear in a photo URL an admin sets by hand.
 *
 * Deliberately short. Wikimedia is here because the city-photo fallback chain
 * already ends at a Wikipedia summary image (`CityMarketCard`,
 * `CityDashboard`), so those URLs reach an `<img src>` whether or not anyone
 * pastes one.
 */
export const allowedPhotoHosts = (): readonly string[] => [
  cdnImageHost(),
  // Signed document URLs live on a second pull zone; listed only when one is
  // configured, so an empty variable cannot widen the policy to every host.
  privatePullZoneHost(),
  'upload.wikimedia.org',
].filter(Boolean);

/**
 * True when `url` is an `https` URL on an allowed host.
 *
 * Host-exact, never a suffix match: `our-zone.b-cdn.net.attacker.example`
 * ends with an allowed host but is not one.
 */
export function isAllowedPhotoUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:') return false;
  return allowedPhotoHosts().includes(parsed.hostname.toLowerCase());
}

/** The allowlist as a sentence, for an error an admin has to act on. */
export const allowedPhotoHostsHint = (): string => allowedPhotoHosts().join(', ');
