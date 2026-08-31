import React, { useEffect, useRef } from 'react';
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

const slotForFormat = (format: AdFormat): string | undefined => {
  const tall = format === 'skyscraper' || format === 'halfpage';
  return (
    (tall ? import.meta.env.VITE_ADSENSE_SLOT_SIDEBAR : import.meta.env.VITE_ADSENSE_SLOT_LEADERBOARD) ||
    import.meta.env.VITE_ADSENSE_SLOT
  );
};

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
}

const NetworkAd: React.FC<NetworkAdProps> = ({ format }) => {
  const insRef = useRef<HTMLModElement>(null);
  const pushedRef = useRef(false);
  const slot = slotForFormat(format);

  useEffect(() => {
    if (!CLIENT || !slot) return;
    ensureAdsenseScript(CLIENT);
    if (pushedRef.current) return;
    pushedRef.current = true;
    try {
      // @ts-expect-error adsbygoogle is injected by the AdSense script
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      /* AdSense not ready / blocked — leave the empty ins in place */
    }
  }, [slot]);

  if (!CLIENT || !slot) return null;

  return (
    <ins
      ref={insRef}
      className="adsbygoogle"
      style={{ display: 'block', width: '100%', height: '100%' }}
      data-ad-client={CLIENT}
      data-ad-slot={slot}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  );
};

export default NetworkAd;
