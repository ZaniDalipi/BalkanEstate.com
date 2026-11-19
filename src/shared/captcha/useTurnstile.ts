import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TurnstileWidgetProps } from './TurnstileWidget';
import { isCaptchaError, isTurnstileEnabled, TURNSTILE_SITE_KEY, turnstileHeaders } from './turnstileConfig';

/**
 * State for a form protected by Turnstile:
 *
 *   const captcha = useTurnstile('contact');
 *   <TurnstileWidget {...captcha.widgetProps} />
 *   const blocked = captcha.blockReason(); if (blocked) return setError(blocked);
 *   await send(data, captcha.headers);
 *   ...finally captcha.reset();            // tokens are single-use
 *   catch (err) setError(captcha.errorMessage(err) ?? otherMessage);
 *
 * or, for forms that show `err.message`, in one step:
 *
 *   await captcha.send((headers) => api(data, headers));
 */
export const useTurnstile = (action?: string, siteKey: string = TURNSTILE_SITE_KEY) => {
  const { t } = useTranslation('common');
  const enabled = isTurnstileEnabled(siteKey);
  const [token, setToken] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [resetCount, setResetCount] = useState(0);

  const reset = useCallback(() => {
    setToken(null);
    setResetCount((n) => n + 1);
  }, []);

  /** Null when the form may be sent; otherwise a translated reason to show. */
  const blockReason = useCallback((): string | null => {
    if (!enabled || token) return null;
    return loadFailed
      ? t('common:captcha.loadError', 'The security check could not load. Please allow challenges.cloudflare.com (turn off content blockers for this site) and try again.')
      : t('common:captcha.required', 'Please wait a moment for the security check to finish, then send again.');
  }, [enabled, token, loadFailed, t]);

  /** Translated text for a captcha refusal from the server, or null for any other error. */
  const errorMessage = useCallback(
    (err: unknown): string | null => {
      if (!isCaptchaError(err)) return null;
      return t('common:captcha.failed', 'The security check failed. Please try sending again.');
    },
    [t]
  );

  const headers = useMemo(() => turnstileHeaders(token), [token]);

  /**
   * Run a request with the token. Throws an Error with a translated message
   * when there is no token yet or the server refused it (keeping the server's
   * `code`), and always asks for a fresh token afterwards.
   */
  const send = useCallback(
    async <T,>(request: (captchaHeaders: Record<string, string>) => Promise<T>): Promise<T> => {
      const blocked = blockReason();
      if (blocked) throw Object.assign(new Error(blocked), { code: 'captcha_required' });
      try {
        return await request(headers);
      } catch (err) {
        const message = errorMessage(err);
        if (message) throw Object.assign(new Error(message), { code: (err as { code?: string }).code });
        throw err;
      } finally {
        reset();
      }
    },
    [blockReason, errorMessage, headers, reset]
  );

  const widgetProps: TurnstileWidgetProps = useMemo(
    () => ({
      siteKey: enabled ? siteKey : '',
      action,
      resetCount,
      onToken: (next: string | null) => {
        setToken(next);
        if (next) setLoadFailed(false);
      },
      onLoadError: () => setLoadFailed(true),
    }),
    [enabled, siteKey, action, resetCount]
  );

  return { enabled, token, headers, blockReason, errorMessage, reset, send, widgetProps };
};
