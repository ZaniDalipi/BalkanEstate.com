import React, { useEffect, useRef, useState } from 'react';
import { ADSENSE_CONFIG, AD_SLOTS, AD_SETTINGS, type AdSlot } from '@/config/adsConfig';

interface GoogleAdSenseProps {
  slot: keyof typeof AD_SLOTS;
  className?: string;
  style?: React.CSSProperties;
  fallback?: React.ReactNode;
}

/**
 * Google AdSense Display Ad Component
 *
 * Usage:
 * <GoogleAdSense slot="leaderboard" />
 * <GoogleAdSense slot="rectangle" className="my-4" />
 * <GoogleAdSense slot="inFeed" />
 *
 * Setup Instructions:
 * 1. Sign up for Google AdSense at https://www.google.com/adsense/
 * 2. Add your site and wait for approval
 * 3. Create ad units in your AdSense dashboard
 * 4. Set environment variables:
 *    - VITE_ADSENSE_CLIENT_ID=ca-pub-XXXXXXXXXXXXXXXX
 *    - VITE_ADSENSE_ENABLED=true
 *    - VITE_AD_SLOT_LEADERBOARD=your-slot-id
 *    - VITE_AD_SLOT_RECTANGLE=your-slot-id
 *    - etc.
 */
const GoogleAdSense: React.FC<GoogleAdSenseProps> = ({
  slot,
  className = '',
  style,
  fallback,
}) => {
  const adRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isVisible, setIsVisible] = useState(!AD_SETTINGS.adsense.lazyLoad);

  const adConfig: AdSlot = AD_SLOTS[slot];

  // Lazy loading with Intersection Observer
  useEffect(() => {
    if (!AD_SETTINGS.adsense.lazyLoad) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: `${AD_SETTINGS.adsense.lazyLoadThreshold}px`,
      }
    );

    if (adRef.current) {
      observer.observe(adRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Load AdSense script and initialize ad
  useEffect(() => {
    if (!isVisible || !ADSENSE_CONFIG.enabled) return;

    // Load AdSense script if not already loaded
    const loadAdSenseScript = () => {
      if (document.querySelector('script[src*="adsbygoogle"]')) {
        return Promise.resolve();
      }

      return new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CONFIG.clientId}`;
        script.async = true;
        script.crossOrigin = 'anonymous';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load AdSense script'));
        document.head.appendChild(script);
      });
    };

    loadAdSenseScript()
      .then(() => {
        // Push ad to queue
        try {
          // @ts-expect-error - AdSense global
          (window.adsbygoogle = window.adsbygoogle || []).push({});
          setIsLoaded(true);
        } catch (e) {
          console.warn('AdSense push error:', e);
        }
      })
      .catch(err => {
        console.warn('AdSense script load error:', err);
      });
  }, [isVisible]);

  // Don't render if AdSense is disabled
  if (!ADSENSE_CONFIG.enabled) {
    return fallback ? <>{fallback}</> : null;
  }

  // Test mode placeholder
  if (ADSENSE_CONFIG.testMode) {
    return (
      <div
        ref={adRef}
        className={`bg-gradient-to-br from-neutral-100 to-neutral-200 border-2 border-dashed border-neutral-300 rounded-lg flex items-center justify-center ${className}`}
        style={{
          minWidth: adConfig.minWidth,
          minHeight: adConfig.minHeight || 90,
          ...style,
        }}
      >
        <div className="text-center p-4">
          <div className="text-neutral-500 text-sm font-medium mb-1">
            Ad Placeholder
          </div>
          <div className="text-neutral-400 text-xs">
            {adConfig.format} • {adConfig.id}
          </div>
          <div className="text-neutral-400 text-xs mt-1">
            Slot: {adConfig.slotId}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={adRef}
      className={`overflow-hidden ${className}`}
      style={{
        minWidth: adConfig.minWidth,
        minHeight: adConfig.minHeight,
        ...style,
      }}
    >
      {isVisible && (
        <ins
          className="adsbygoogle"
          style={{
            display: 'block',
            width: '100%',
            height: adConfig.minHeight || 'auto',
          }}
          data-ad-client={ADSENSE_CONFIG.clientId}
          data-ad-slot={adConfig.slotId}
          data-ad-format={adConfig.format}
          data-full-width-responsive={adConfig.responsive ? 'true' : 'false'}
        />
      )}

      {/* Loading state */}
      {isVisible && !isLoaded && (
        <div
          className="animate-pulse bg-neutral-100 rounded"
          style={{
            minWidth: adConfig.minWidth,
            minHeight: adConfig.minHeight || 90,
          }}
        />
      )}
    </div>
  );
};

export default GoogleAdSense;

/**
 * In-Feed Ad Component - Special component for ads between property listings
 */
export const InFeedAd: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`py-4 ${className}`}>
      <GoogleAdSense slot="inFeed" className="rounded-lg overflow-hidden" />
    </div>
  );
};

/**
 * Sidebar Ad Component - Sticky ad for sidebars
 */
export const SidebarAd: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`sticky top-4 ${className}`}>
      <GoogleAdSense slot="sidebar" className="rounded-lg overflow-hidden" />
    </div>
  );
};

/**
 * Leaderboard Ad Component - Full-width horizontal ad
 */
export const LeaderboardAd: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`w-full ${className}`}>
      <GoogleAdSense slot="leaderboard" className="rounded-lg overflow-hidden" />
    </div>
  );
};

/**
 * Rectangle Ad Component - Standard 300x250 ad
 */
export const RectangleAd: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <GoogleAdSense slot="rectangle" className={`rounded-lg overflow-hidden ${className}`} />
  );
};
