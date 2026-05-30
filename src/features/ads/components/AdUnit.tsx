import React, { useEffect, useRef } from 'react';
import { useAdSense } from '../hooks/useAdSense';
import type { AdUnitProps } from '../types';

const PUBLISHER_ID = import.meta.env.VITE_ADSENSE_PUBLISHER_ID as string | undefined;

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

/**
 * Renders a single Google AdSense ad unit.
 *
 * - Silently renders nothing when:
 *   - The user has an active paid subscription (buyer/pro/agency)
 *   - `VITE_ADSENSE_PUBLISHER_ID` is not set (dev / test)
 *   - The `disabled` prop is true
 * - Calls `(adsbygoogle = window.adsbygoogle || []).push({})` exactly once
 *   per mount after the AdSense script is ready.
 */
const AdUnit: React.FC<AdUnitProps> = ({ slot, className = '', disabled = false }) => {
  const { ready, shouldShowAds } = useAdSense();
  const pushedRef = useRef(false);
  const insRef = useRef<HTMLModElement>(null);

  useEffect(() => {
    if (!ready || !shouldShowAds || disabled || pushedRef.current) return;
    if (!insRef.current) return;

    try {
      window.adsbygoogle = window.adsbygoogle || [];
      window.adsbygoogle.push({});
      pushedRef.current = true;
    } catch {
      // AdSense occasionally throws during push — swallow silently.
    }
  }, [ready, shouldShowAds, disabled]);

  if (!shouldShowAds || disabled || !PUBLISHER_ID) return null;

  return (
    <div
      className={`ad-unit overflow-hidden ${className}`}
      aria-hidden="true"
      data-testid="ad-unit"
    >
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={PUBLISHER_ID}
        data-ad-slot={slot.slotId}
        data-ad-format={slot.format}
        {...(slot.layout ? { 'data-ad-layout': slot.layout } : {})}
        {...(slot.responsive !== false ? { 'data-full-width-responsive': 'true' } : {})}
      />
    </div>
  );
};

export default AdUnit;
