/**
 * Server-side check of a Cloudflare Turnstile token ("are you a human?").
 *
 * The browser widget hands the form a one-time token; only Cloudflare can say
 * whether it is genuine, so the server asks siteverify before it acts. The
 * fetch is injected so this is unit-tested without the network.
 *
 * Outcomes:
 * - ok           Cloudflare confirmed the token.
 * - missing      no token was sent.
 * - invalid      Cloudflare rejected it (forged, expired, already used).
 * - unavailable  Cloudflare could not be asked (timeout, outage). The caller
 *                decides what to do; a visitor must not be blamed for it.
 */
const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const TIMEOUT_MS = 5000;
/** Cloudflare documents tokens as at most 2048 characters. */
const MAX_TOKEN_LENGTH = 2048;

export type TurnstileOutcome =
  | { ok: true }
  | { ok: false; reason: 'missing' | 'invalid' | 'unavailable'; detail?: string };

export type FetchLike = (url: string, init: { method: string; headers: Record<string, string>; body: string; signal?: AbortSignal }) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}>;

interface SiteverifyBody {
  success?: unknown;
  'error-codes'?: unknown;
}

export const verifyTurnstileToken = async (params: {
  token: unknown;
  secret: string;
  remoteIp?: string;
  fetchImpl?: FetchLike;
}): Promise<TurnstileOutcome> => {
  const { token, secret, remoteIp } = params;
  if (typeof token !== 'string' || token.length === 0) return { ok: false, reason: 'missing' };
  if (token.length > MAX_TOKEN_LENGTH) return { ok: false, reason: 'invalid', detail: 'token-too-long' };

  const fetchImpl = params.fetchImpl ?? (globalThis.fetch as unknown as FetchLike);
  const form = new URLSearchParams({ secret, response: token });
  if (remoteIp) form.set('remoteip', remoteIp);

  let body: SiteverifyBody;
  try {
    const res = await fetchImpl(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return { ok: false, reason: 'unavailable', detail: `http-${res.status}` };
    body = ((await res.json()) ?? {}) as SiteverifyBody;
  } catch (err) {
    return { ok: false, reason: 'unavailable', detail: err instanceof Error ? err.name : 'error' };
  }

  if (body.success === true) return { ok: true };
  const codes = Array.isArray(body['error-codes']) ? body['error-codes'].map(String) : [];
  // A wrong secret is our misconfiguration, not the visitor's fault.
  if (codes.includes('invalid-input-secret') || codes.includes('missing-input-secret') || codes.includes('internal-error')) {
    return { ok: false, reason: 'unavailable', detail: codes.join(',') };
  }
  return { ok: false, reason: 'invalid', detail: codes.join(',') };
};
