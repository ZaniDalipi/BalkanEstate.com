import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { optimizeCloudinaryUrl } from '@/config/cloudinaryConfig';
import { useAdBanners, selectByPlacement } from '../hooks/useAdBanners';
import { trackClick, trackImpression } from '../api/adBannerApi';
import type { AdPage, AdPlacement } from '../types';

interface StickyAdBannerProps {
  /** Which page the visitor is currently on (drives which banners load). */
  page: AdPage;
  /** Which placement slot to render. Defaults to the sticky bottom bar. */
  placement?: AdPlacement;
}

const SESSION_DISMISS_PREFIX = 'ad-banner-dismissed:';

/**
 * Renders the highest-priority active banner for a page + placement as a
 * compact, self-contained card.
 *
 * Layout-critical properties (card height, image object-fit, positioning) use
 * inline styles rather than utility classes so the banner renders identically
 * regardless of the CSS build — an ad image can never blow past the card.
 */
const StickyAdBanner: React.FC<StickyAdBannerProps> = ({ page, placement = 'sticky-bottom' }) => {
  const { t } = useTranslation(['common']);
  const { data } = useAdBanners(page);
  const [dismissed, setDismissed] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const trackedRef = useRef<string | null>(null);

  const banner = useMemo(() => selectByPlacement(data, placement)[0], [data, placement]);

  // Track viewport so we can clear the mobile bottom nav on small screens.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  // Restore per-session dismissal for this specific banner.
  useEffect(() => {
    if (!banner) return;
    try {
      setDismissed(sessionStorage.getItem(`${SESSION_DISMISS_PREFIX}${banner.id}`) === '1');
    } catch {
      /* sessionStorage unavailable — treat as not dismissed */
    }
  }, [banner]);

  // Record one impression per banner per mount.
  useEffect(() => {
    if (!banner || dismissed) return;
    if (trackedRef.current === banner.id) return;
    trackedRef.current = banner.id;
    trackImpression(banner.id);
  }, [banner, dismissed]);

  if (!banner || dismissed) return null;

  const isSticky = placement === 'sticky-top' || placement === 'sticky-bottom';
  const isTop = placement === 'sticky-top';

  const handleClick = () => trackClick(banner.id);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(`${SESSION_DISMISS_PREFIX}${banner.id}`, '1');
    } catch {
      /* ignore */
    }
  };

  const imageSrc = optimizeCloudinaryUrl(banner.imageUrl, { width: 1000, quality: 'auto' });

  // Card height — fixed so any image (square logo or wide banner) fits neatly.
  const cardHeight = isDesktop ? 96 : 68;

  // Vertical anchor: clear the mobile bottom nav (3.5rem + safe area) on small
  // screens; float a small gap from the edge on desktop.
  const edgeOffset = isTop
    ? { top: isDesktop ? 12 : 'calc(env(safe-area-inset-top, 0px) + 8px)' }
    : { bottom: isDesktop ? 12 : 'calc(3.5rem + env(safe-area-inset-bottom, 0px) + 8px)' };

  const outerStyle: React.CSSProperties = isSticky
    ? {
        position: 'fixed',
        left: 0,
        right: 0,
        zIndex: 120,
        pointerEvents: 'none',
        padding: '0 12px',
        ...edgeOffset,
      }
    : { position: 'relative', width: '100%', padding: '8px 12px' };

  return (
    <div style={outerStyle} role="complementary" aria-label={t('ads.advertisement', 'Advertisement')}>
      <div
        style={{
          pointerEvents: 'auto',
          margin: '0 auto',
          maxWidth: 728,
          position: 'relative',
          height: cardHeight,
          background: '#ffffff',
          border: '1px solid rgba(0,0,0,0.1)',
          borderRadius: 14,
          boxShadow: '0 6px 24px rgba(0,0,0,0.16)',
          overflow: 'hidden',
        }}
      >
        {/* Sponsored label */}
        <span
          style={{
            position: 'absolute',
            top: 6,
            left: 6,
            zIndex: 2,
            background: 'rgba(0,0,0,0.6)',
            color: '#fff',
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            padding: '2px 6px',
            borderRadius: 5,
          }}
        >
          {t('ads.sponsored', 'Sponsored')}
        </span>

        <a
          href={banner.linkUrl}
          target="_blank"
          rel="noopener noreferrer sponsored"
          onClick={handleClick}
          aria-label={banner.title}
          style={{ display: 'block', width: '100%', height: '100%' }}
        >
          <img
            src={imageSrc}
            alt={banner.title}
            loading="lazy"
            style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover', background: '#fff' }}
          />
        </a>

        {/* Dismiss */}
        <button
          type="button"
          onClick={handleDismiss}
          aria-label={t('ads.close', 'Close advertisement')}
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            zIndex: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 24,
            height: 24,
            borderRadius: '9999px',
            background: 'rgba(0,0,0,0.5)',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            lineHeight: 0,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default StickyAdBanner;
