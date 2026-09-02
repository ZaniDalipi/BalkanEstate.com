import React, { useEffect, useRef } from 'react';
import { useCookieConsent } from '@/shared/utils/cookieConsent';
import { recordNetworkAdOutcome } from '../adsDebug';
import type { AdFormat } from './AdSlot';

/**
 * Third-party ad-network fill (Google AdSense) for slots with no direct
 * booking — this is what earns revenue on unsold inventory.
 *
 * The AdSense tag itself lives in index.html, so verification and Google's
 * crawler can always see it. This module owns the two things that decide
 * whether an ad is actually *requested*: consent, and a slot id.
 *
 * Configure via Vite env vars (set in the deploy environment):
 *   VITE_ADSENSE_CLIENT           = publisher id; defaults to this site's
 *   VITE_ADSENSE_SLOT             = default slot id
 *   VITE_ADSENSE_SLOT_LEADERBOARD = slot id for horizontal units (optional)
 *   VITE_ADSENSE_SLOT_SIDEBAR     = slot id for tall units (optional)
 *   VITE_ADSENSE_SLOT_STICKY      = slot id for the bottom bar (optional)
 *
 * With no slot id for a format, nothing renders and the caller shows its own
 * "Your Ad Here" placeholder instead.
 */

/**
 * This site's publisher id. Hard-coded as the default because it is public
 * anyway — it sits in ads.txt and in the tag in index.html — and because a
 * missing env var should not quietly turn ad revenue off. The env var still
 * overrides it, e.g. for a fork or a separate staging property.
 *
 * Keep in step with the client in index.html's AdSense tag.
 */
const DEFAULT_CLIENT = 'ca-pub-8280125236799216';

const CLIENT: string = import.meta.env.VITE_ADSENSE_CLIENT || DEFAULT_CLIENT;

/**
 * Ask AdSense for test ads instead of real ones.
 *
 * On by default while developing, and switchable on a deployed build with
 * VITE_ADSENSE_TEST_MODE=true — which is the only way to actually exercise the
 * connection, since AdSense does not serve to localhost and will not serve real
 * ads until the account is approved.
 *
 * It also protects the account: real ads loaded or clicked by the people
 * building the site are invalid traffic, and that is what gets AdSense accounts
 * suspended. Leave it off on the production build.
 */
const IS_TEST_MODE =
  import.meta.env.VITE_ADSENSE_TEST_MODE === 'true' || import.meta.env.DEV;

/**
 * Whether a network ad may actually be requested right now.
 *
 * Two things have to hold, and callers use the answer to decide between
 * network fill and the "Your Ad Here" placeholder:
 *
 *  - Marketing consent. AdSense sets advertising cookies, which the cookie
 *    policy promises are opt-in, so nothing is requested without it.
 *  - An ad unit to request. Pass the format to check there is a slot id for
 *    it; without that check a slot with no unit configured would sit there as
 *    an empty box instead of falling through to the placeholder.
 */
export const useNetworkAdFill = (format?: AdFormat): boolean => {
  const consent = useCookieConsent();
  if (!consent.marketing) return false;
  return format ? !!slotForFormat(format) : true;
};

const slotForFormat = (format: AdFormat): string | undefined => {
  const tall = format === 'skyscraper' || format === 'halfpage';
  return (
    (tall ? import.meta.env.VITE_ADSENSE_SLOT_SIDEBAR : import.meta.env.VITE_ADSENSE_SLOT_LEADERBOARD) ||
    import.meta.env.VITE_ADSENSE_SLOT
  );
};

/**
 * Slot id for the sticky bar. Its own id if one is set, otherwise the shared
 * horizontal id — so an unbooked sticky bar fills from AdSense like every other
 * empty slot, rather than sitting there earning nothing.
 */
export const stickyNetworkSlot = (): string | undefined =>
  import.meta.env.VITE_ADSENSE_SLOT_STICKY || slotForFormat('leaderboard');

/**
 * Let AdSense start requesting ads.
 *
 * index.html sets `pauseAdRequests = 1` before the tag loads, so the tag is
 * present for verification and for Google's crawler while no ad — and so no
 * advertising cookie — is requested. Releasing the pause is the moment ads
 * actually begin, and it happens only once marketing consent is in hand.
 */
const resumeAdRequests = () => {
  if (typeof window === 'undefined') return;
  // adsbygoogle is an array that also carries config flags, so it must stay an
  // array — push({}) is called on it below.
  const w = window as unknown as { adsbygoogle?: unknown[] & { pauseAdRequests?: number } };
  w.adsbygoogle = w.adsbygoogle || ([] as unknown[] & { pauseAdRequests?: number });
  w.adsbygoogle.pauseAdRequests = 0;
};

interface NetworkAdProps {
  format: AdFormat;
  /** Called when AdSense reports it has no ad for this slot. */
  onUnfilled?: () => void;
  /** Override the slot id chosen from the format (used by the sticky bar). */
  slotId?: string;
}

const NetworkAd: React.FC<NetworkAdProps> = ({ format, onUnfilled, slotId }) => {
  const insRef = useRef<HTMLModElement>(null);
  const pushedRef = useRef(false);
  const recordedRef = useRef(false);
  const slot = slotId ?? slotForFormat(format);
  const canFill = useNetworkAdFill();

  useEffect(() => {
    if (!canFill || !CLIENT || !slot) return;
    resumeAdRequests();
    if (pushedRef.current) return;
    const el = insRef.current;
    // A slot AdSense has already claimed must not be pushed again — a second
    // push on the same element is what draws two ads over each other.
    if (el?.getAttribute('data-adsbygoogle-status')) return;
    pushedRef.current = true;
    try {
      // @ts-expect-error adsbygoogle is injected by the AdSense script
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      /* AdSense not ready / blocked — leave the empty ins in place */
    }
  }, [canFill, slot]);

  // AdSense stamps data-ad-status="unfilled" when it has nothing for the slot.
  // Telling the caller lets the space go back to being sellable instead of
  // sitting there as an empty grey box.
  useEffect(() => {
    const el = insRef.current;
    if (!canFill || !el || typeof MutationObserver === 'undefined') return;

    const check = () => {
      const status = el.getAttribute('data-ad-status');
      if (status !== 'filled' && status !== 'unfilled') return;
      // Recorded once per slot, before the unfilled branch collapses it, so the
      // diagnostic can still tell "Google said no" from "never asked".
      if (!recordedRef.current) {
        recordedRef.current = true;
        recordNetworkAdOutcome(status);
      }
      if (status === 'unfilled') onUnfilled?.();
    };
    const observer = new MutationObserver(check);
    observer.observe(el, { attributes: true, attributeFilter: ['data-ad-status'] });
    check();
    return () => observer.disconnect();
  }, [canFill, onUnfilled]);

  if (!canFill || !slot) return null;

  return (
    <ins
      ref={insRef}
      className="adsbygoogle"
      style={{ display: 'block', width: '100%', height: '100%' }}
      data-ad-client={CLIENT}
      data-ad-slot={slot}
      data-ad-format="auto"
      // Off deliberately. The wrapper is already reserved at a standard IAB
      // size; full-width-responsive lets AdSense ignore that and stretch the
      // unit to the screen, which is how banners end up oversized and sitting
      // over the content next to them.
      data-full-width-responsive="false"
      // Outside production, ask AdSense for test ads. Two reasons: the slots
      // can be exercised before the account serves real ads, and — more
      // importantly — loading or clicking your own live ads while developing
      // is invalid traffic, which is the fastest way to get an AdSense
      // account suspended. Never set this on a production build.
      {...(IS_TEST_MODE ? { 'data-adtest': 'on' } : {})}
    />
  );
};

export default NetworkAd;
