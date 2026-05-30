import { useEffect, useRef, useState } from 'react';
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser';

const PUBLISHER_ID = import.meta.env.VITE_ADSENSE_PUBLISHER_ID as string | undefined;

type ScriptState = 'idle' | 'loading' | 'ready' | 'error';

// Module-level singleton so the script is only injected once per page load.
let scriptState: ScriptState = 'idle';
const listeners = new Set<(state: ScriptState) => void>();

function notifyListeners(state: ScriptState) {
  scriptState = state;
  listeners.forEach((fn) => fn(state));
}

function loadScript(): void {
  if (scriptState !== 'idle') return;
  if (!PUBLISHER_ID) {
    // No publisher ID configured — stay idle (ads silently suppressed).
    return;
  }

  notifyListeners('loading');

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${PUBLISHER_ID}`;
  script.crossOrigin = 'anonymous';

  script.onload = () => notifyListeners('ready');
  script.onerror = () => notifyListeners('error');

  document.head.appendChild(script);
}

/**
 * Returns whether AdSense is ready to render and whether the current user
 * should see ads (free-tier and unauthenticated visitors).
 *
 * The AdSense script is loaded lazily on the first call from a component that
 * is eligible to show ads, so authenticated paid users never trigger the load.
 */
export function useAdSense(): { ready: boolean; shouldShowAds: boolean } {
  const { user, isLoading: userLoading } = useCurrentUser();
  const [adScriptState, setAdScriptState] = useState<ScriptState>(scriptState);
  const subscribedRef = useRef(false);

  const shouldShowAds =
    !userLoading &&
    (!user || user.subscription?.tier === 'free' || !user.subscription);

  useEffect(() => {
    if (!shouldShowAds) return;

    // Subscribe to script state changes before triggering load so we don't
    // miss the transition if the script loads synchronously (cache hit).
    if (!subscribedRef.current) {
      const handler = (s: ScriptState) => setAdScriptState(s);
      listeners.add(handler);
      subscribedRef.current = true;
      return () => {
        listeners.delete(handler);
        subscribedRef.current = false;
      };
    }
  }, [shouldShowAds]);

  useEffect(() => {
    if (!shouldShowAds) return;
    loadScript();
  }, [shouldShowAds]);

  return {
    ready: adScriptState === 'ready',
    shouldShowAds,
  };
}
