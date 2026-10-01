import dns from 'dns';
import net from 'net';
import ipaddr from 'ipaddr.js';

/**
 * SSRF guard for server-side fetches of user- or feed-supplied URLs.
 *
 * Checking the hostname string is not enough: a public name can resolve to a
 * private address, and a redirect can point anywhere. So:
 *  1. only http(s) on default ports,
 *  2. resolve the name and reject if ANY address is non-public,
 *  3. hand back a `lookup` that pins the connection to the vetted address,
 *     so a second DNS answer (rebinding) can't swap it.
 * Callers re-run `resolvePublicUrl` on every redirect hop.
 */

export class SsrfError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SsrfError';
  }
}

/** ipaddr.js range names that are safe to connect to. Everything else is blocked. */
const PUBLIC_RANGES = new Set(['unicast']);

/** True for loopback, private, link-local (incl. cloud metadata), CGNAT, multicast, reserved… */
export const isNonPublicAddress = (address: string): boolean => {
  if (!ipaddr.isValid(address)) return true;
  let parsed = ipaddr.parse(address);
  // ::ffff:10.0.0.1 is 10.0.0.1 in disguise.
  if (parsed.kind() === 'ipv6' && (parsed as ipaddr.IPv6).isIPv4MappedAddress()) {
    parsed = (parsed as ipaddr.IPv6).toIPv4Address();
  }
  return !PUBLIC_RANGES.has(parsed.range());
};

export interface VettedUrl {
  url: URL;
  address: string;
  family: 4 | 6;
  /** Pass as the http(s) agent `lookup` so the socket uses the vetted address. */
  lookup: net.LookupFunction;
}

const ALLOWED_PORTS = new Set(['', '80', '443']);

export const resolvePublicUrl = async (
  rawUrl: string,
  resolver: (host: string) => Promise<Array<{ address: string; family: number }>> = (host) =>
    dns.promises.lookup(host, { all: true, verbatim: true })
): Promise<VettedUrl> => {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new SsrfError('Invalid URL');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new SsrfError('Only http and https URLs are allowed');
  }
  if (url.username || url.password) {
    throw new SsrfError('URLs with credentials are not allowed');
  }
  if (!ALLOWED_PORTS.has(url.port)) {
    throw new SsrfError('Non-standard ports are not allowed');
  }

  const host = url.hostname.replace(/^\[|\]$/g, '');
  let addresses: Array<{ address: string; family: number }>;
  if (net.isIP(host)) {
    addresses = [{ address: host, family: net.isIP(host) }];
  } else {
    try {
      addresses = await resolver(host);
    } catch {
      throw new SsrfError('Host could not be resolved');
    }
  }

  if (addresses.length === 0) throw new SsrfError('Host could not be resolved');
  if (addresses.some((a) => isNonPublicAddress(a.address))) {
    throw new SsrfError('URL points to a non-public address');
  }

  const { address, family } = addresses[0];
  const pinnedFamily = family === 6 ? 6 : 4;
  const lookup = ((_hostname: string, options: unknown, callback?: unknown) => {
    const cb = (typeof options === 'function' ? options : callback) as (...args: unknown[]) => void;
    const wantsAll = typeof options === 'object' && options !== null && (options as { all?: boolean }).all;
    if (wantsAll) cb(null, [{ address, family: pinnedFamily }]);
    else cb(null, address, pinnedFamily);
  }) as net.LookupFunction;

  return { url, address, family: pinnedFamily, lookup };
};
