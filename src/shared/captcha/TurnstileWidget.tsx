import React, { useEffect, useRef } from 'react';
import { loadTurnstile } from './loadTurnstile';

export interface TurnstileWidgetProps {
  siteKey: string;
  /** Shown in Cloudflare's analytics, e.g. "property-inquiry". */
  action?: string;
  /** Bump to get a fresh token (tokens are single-use). */
  resetCount: number;
  onToken: (token: string | null) => void;
  onLoadError: () => void;
}

/**
 * Cloudflare Turnstile ("are you human?") check. In "interaction-only" mode it
 * takes no space and stays invisible for most visitors; it only shows a box
 * when Cloudflare wants the visitor to click.
 */
const TurnstileWidget: React.FC<TurnstileWidgetProps> = ({ siteKey, action, resetCount, onToken, onLoadError }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  // Latest callbacks, so the widget is not re-rendered when they change.
  const callbacks = useRef({ onToken, onLoadError });
  callbacks.current = { onToken, onLoadError };

  useEffect(() => {
    if (!siteKey) return undefined;
    let cancelled = false;
    loadTurnstile()
      .then((api) => {
        if (cancelled || !containerRef.current) return;
        widgetIdRef.current = api.render(containerRef.current, {
          sitekey: siteKey,
          action,
          appearance: 'interaction-only',
          size: 'flexible',
          callback: (token) => callbacks.current.onToken(token),
          'expired-callback': () => callbacks.current.onToken(null),
          'error-callback': () => callbacks.current.onToken(null),
        });
      })
      .catch(() => {
        if (!cancelled) callbacks.current.onLoadError();
      });
    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) window.turnstile.remove(widgetIdRef.current);
      widgetIdRef.current = null;
    };
  }, [siteKey, action]);

  useEffect(() => {
    if (resetCount > 0 && widgetIdRef.current && window.turnstile) window.turnstile.reset(widgetIdRef.current);
  }, [resetCount]);

  if (!siteKey) return null;
  return <div ref={containerRef} className="w-full empty:hidden" data-testid="turnstile-widget" />;
};

export default TurnstileWidget;
