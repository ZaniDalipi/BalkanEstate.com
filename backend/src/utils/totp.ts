import crypto from 'crypto';

/**
 * Authenticator-app codes (TOTP, RFC 6238 / RFC 4226), as used by Google
 * Authenticator, Authy, 1Password and Microsoft Authenticator: HMAC-SHA1,
 * 6 digits, a new code every 30 seconds. Pure; no state.
 */

export const TOTP_PERIOD_SECONDS = 30;
export const TOTP_DIGITS = 6;
const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(text: string): Buffer {
  const clean = text.toUpperCase().replace(/[\s=-]/g, '');
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = BASE32.indexOf(ch);
    if (idx === -1) throw new Error('Invalid base32 character');
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** A new random secret (160 bits, the RFC's recommended size), base32. */
export const generateTotpSecret = (): string => base32Encode(crypto.randomBytes(20));

/** The 30-second step a moment falls in. */
export const totpStep = (atMs: number): number => Math.floor(atMs / 1000 / TOTP_PERIOD_SECONDS);

/** The code for one step (HOTP over the step counter). */
export function totpCodeForStep(secretBase32: string, step: number, digits = TOTP_DIGITS): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const hmac = crypto.createHmac('sha1', base32Decode(secretBase32)).update(counter).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary = ((hmac[offset] & 0x7f) << 24) | (hmac[offset + 1] << 16) | (hmac[offset + 2] << 8) | hmac[offset + 3];
  return String(binary % 10 ** digits).padStart(digits, '0');
}

/**
 * Which step a typed code belongs to, allowing one step of clock drift either
 * way, or null when it matches none. Constant-time compare.
 */
export function matchTotpStep(secretBase32: string, code: string, atMs: number, drift = 1): number | null {
  const typed = code.replace(/\s/g, '');
  if (!/^\d{6}$/.test(typed)) return null;
  const now = totpStep(atMs);
  for (let s = now - drift; s <= now + drift; s++) {
    const expected = totpCodeForStep(secretBase32, s);
    if (crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(typed))) return s;
  }
  return null;
}

/** The link an authenticator app reads from the QR code. */
export function totpUri(secretBase32: string, accountName: string, issuer: string): string {
  const label = encodeURIComponent(`${issuer}:${accountName}`);
  const params = new URLSearchParams({ secret: secretBase32, issuer, algorithm: 'SHA1', digits: String(TOTP_DIGITS), period: String(TOTP_PERIOD_SECONDS) });
  return `otpauth://totp/${label}?${params.toString()}`;
}
