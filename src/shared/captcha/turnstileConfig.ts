/**
 * Cloudflare Turnstile settings shared by every public form. Without a site
 * key the widget is not shown and no token is sent (the server only demands
 * one when TURNSTILE_SECRET_KEY is set, so configure both together).
 */
export const TURNSTILE_SITE_KEY: string = import.meta.env.VITE_TURNSTILE_SITE_KEY ?? '';

export const isTurnstileEnabled = (siteKey: string = TURNSTILE_SITE_KEY): boolean => siteKey.trim().length > 0;

/** Header the backend reads the one-time token from (backend/src/middleware/requireTurnstile.ts). */
export const TURNSTILE_HEADER = 'X-Turnstile-Token';

/** Request headers carrying the token, or none when there is no token. */
export const turnstileHeaders = (token: string | null | undefined): Record<string, string> =>
  token ? { [TURNSTILE_HEADER]: token } : {};

/** Server error codes for a missing or rejected token. */
export const CAPTCHA_ERROR_CODES = ['captcha_required', 'captcha_failed'] as const;

export const isCaptchaError = (err: unknown): boolean => {
  const code = err && typeof err === 'object' ? (err as { code?: unknown }).code : undefined;
  return typeof code === 'string' && (CAPTCHA_ERROR_CODES as readonly string[]).includes(code);
};
