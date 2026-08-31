import { useEffect, useState } from 'react';
import { useCookieConsent } from '@/shared/utils/cookieConsent';
import { ADSENSE_CLIENT, isAdSenseConfigured } from './adsConfig';

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

const SCRIPT_ID = 'adsbygoogle-js';
const SCRIPT_SRC = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';

type LoadState = 'idle' | 'loading' | 'ready' | 'failed';

/**
 * Module-level so the tag is requested once per page load however many slots
 * mount — a second <script> would re-initialise adsbygoogle and is the usual
 * cause of duplicated/stacked units.
 */
let loadState: LoadState = 'idle';
const listeners = new Set<(state: LoadState) => void>();

const setLoadState = (next: LoadState) => {
  loadState = next;
  listeners.forEach(fn => fn(next));
};

/** Injects the AdSense tag exactly once. Safe to call from every slot. */
const loadAdSenseScript = () => {
  if (typeof document === 'undefined') return;
  if (loadState === 'loading' || loadState === 'ready') return;
  if (!isAdSenseConfigured()) return;

  const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
  if (existing) {
    setLoadState('ready');
    return;
  }

  setLoadState('loading');

  const script = document.createElement('script');
  script.id = SCRIPT_ID;
  script.async = true;
  script.crossOrigin = 'anonymous';
  script.src = `${SCRIPT_SRC}?client=${encodeURIComponent(ADSENSE_CLIENT)}`;
  script.onload = () => setLoadState('ready');
  // An ad blocker (or an offline tab) is a completely normal outcome: the slots
  // stay collapsed rather than leaving reserved empty boxes behind.
  script.onerror = () => setLoadState('failed');

  document.head.appendChild(script);
};

/**
 * Loads the AdSense tag once marketing consent has been given, and reports
 * whether ads may render right now.
 *
 * Consent is a precondition, not an afterthought: nothing is requested from
 * Google until the visitor has opted into marketing cookies, which is what the
 * cookie policy on this site promises.
 */
export const useAdSense = (): { canServeAds: boolean; isReady: boolean } => {
  const consent = useCookieConsent();
  const [state, setState] = useState<LoadState>(loadState);

  const allowed = isAdSenseConfigured() && consent.marketing;

  useEffect(() => {
    const listener = (next: LoadState) => setState(next);
    listeners.add(listener);
    setState(loadState);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  useEffect(() => {
    if (allowed) loadAdSenseScript();
  }, [allowed]);

  return {
    canServeAds: allowed && state !== 'failed',
    isReady: allowed && state === 'ready',
  };
};

/**
 * Hands one <ins> element to AdSense to fill.
 *
 * Returns false when the push could not happen, so the caller can leave the
 * slot collapsed instead of holding empty space open.
 */
export const requestAd = (el: HTMLElement): boolean => {
  if (typeof window === 'undefined') return false;
  // A slot AdSense has already claimed must never be pushed twice — a second
  // push on the same element is what produces two ads drawn over each other.
  if (el.getAttribute('data-adsbygoogle-status')) return false;

  try {
    (window.adsbygoogle = window.adsbygoogle || []).push({});
    return true;
  } catch {
    return false;
  }
};
