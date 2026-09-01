import React, { useEffect, useRef } from 'react';
import { useCookieConsent } from '@/shared/utils/cookieConsent';
import type { AdFormat } from './AdSlot';

/**
 * Third-party ad-network fill (Google AdSense) for slots with no direct
 * booking — this is what earns revenue on unsold inventory.
 *
 * Configure via Vite env vars (set in the deploy environment):
 *   VITE_ADSENSE_CLIENT           = "ca-pub-XXXXXXXXXXXXXXXX"   (required)
 *   VITE_ADSENSE_SLOT             = default responsive slot id
 *   VITE_ADSENSE_SLOT_LEADERBOARD = slot id for horizontal units (optional)
 *   VITE_ADSENSE_SLOT_SIDEBAR     = slot id for tall units (optional)
 *
 * When no client id is set, nothing renders and the caller shows its own
 * "Your Ad Here" placeholder instead.
 */

const CLIENT: string | undefined = import.meta.env.VITE_ADSENSE_CLIENT;

/** True when an AdSense publisher id is configured, so network fill is possible. */
export const isNetworkAdConfigured = (): boolean => !!CLIENT;

/**
 * Whether a network ad may actually be requested right now.
 *
 * Being configured is not enough: AdSense sets advertising cookies, which the
 * cookie policy promises are opt-in, so nothing is requested from Google until
 * the visitor has consented to marketing. Callers use this to decide between
 * network fill and the "Your Ad Here" placeholder.
 */
export const useNetworkAdFill = (): boolean => {
  const consent = useCookieConsent();
  return isNetworkAdConfigured() && consent.marketing;
};

const slotForFormat = (format: AdFormat): string | undefined => {
  const tall = format === 'skyscraper' || format === 'halfpage';
  return (
    (tall ? import.meta.env.VITE_ADSENSE_SLOT_SIDEBAR : import.meta.env.VITE_ADSENSE_SLOT_LEADERBOARD) ||
    import.meta.env.VITE_ADSENSE_SLOT
  );
};

/**
 * The sticky bar has its own slot id and no fallback, deliberately: a bar
 * pinned over every page is the most intrusive unit on the site, so it stays
 * off until someone sets VITE_ADSENSE_SLOT_STICKY on purpose. The other slots
 * sit in the page flow and can safely fall back to the shared ids above.
 */
export const stickyNetworkSlot = (): string | undefined =>
  import.meta.env.VITE_ADSENSE_SLOT_STICKY;

let scriptRequested = false;
const ensureAdsenseScript = (client: string) => {
  if (scriptRequested || typeof document === 'undefined') return;
  scriptRequested = true;
  if (document.querySelector('script[data-adsense]')) return;
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`;
  s.crossOrigin = 'anonymous';
  s.setAttribute('data-adsense', '1');
  document.head.appendChild(s);
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
  const slot = slotId ?? slotForFormat(format);
  const canFill = useNetworkAdFill();

  useEffect(() => {
    if (!canFill || !CLIENT || !slot) return;
    ensureAdsenseScript(CLIENT);
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
      if (el.getAttribute('data-ad-status') === 'unfilled') onUnfilled?.();
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
    />
  );
};

export default NetworkAd;
