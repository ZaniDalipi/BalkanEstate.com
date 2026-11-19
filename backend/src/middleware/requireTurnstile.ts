import type { NextFunction, Request, Response } from 'express';
import { verifyTurnstileToken, type FetchLike } from '../services/turnstile/turnstileVerifier';
import { apiLogger } from '../utils/logger';

/** Header the web app sends the widget's one-time token in (works for JSON and file uploads alike). */
export const TURNSTILE_HEADER = 'x-turnstile-token';

let warnedUnconfigured = false;

/**
 * Require a valid Cloudflare Turnstile token on a public form endpoint.
 *
 * - TURNSTILE_SECRET_KEY unset: the check is off (local development, or before
 *   the keys are configured), logged once in production.
 * - Token missing → 403 captcha_required; rejected → 403 captcha_failed.
 * - Cloudflare unreachable: let the request through and log it. The route's
 *   rate limits and the inquiry sender rules still apply, and real visitors
 *   are not locked out by an outage they can't fix.
 */
export const requireTurnstile = (options: { fetchImpl?: FetchLike } = {}) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const secret = process.env.TURNSTILE_SECRET_KEY;
    if (!secret) {
      if (!warnedUnconfigured && process.env.NODE_ENV === 'production') {
        warnedUnconfigured = true;
        apiLogger.warn('[turnstile] TURNSTILE_SECRET_KEY is not set: captcha checks are OFF');
      }
      next();
      return;
    }

    const outcome = await verifyTurnstileToken({
      token: req.get(TURNSTILE_HEADER),
      secret,
      remoteIp: req.ip,
      fetchImpl: options.fetchImpl,
    });

    if (outcome.ok) {
      next();
      return;
    }
    if (outcome.reason === 'unavailable') {
      apiLogger.warn(`[turnstile] Verification unavailable (${outcome.detail ?? 'unknown'}), allowing ${req.method} ${req.originalUrl}`);
      next();
      return;
    }
    if (outcome.reason === 'missing') {
      res.status(403).json({ message: 'Please complete the verification check.', code: 'captcha_required' });
      return;
    }
    apiLogger.warn(`[turnstile] Rejected token on ${req.originalUrl} (${outcome.detail ?? ''})`);
    res.status(403).json({ message: 'Verification failed. Please try again.', code: 'captcha_failed' });
  };
