import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { optimizeCloudinaryUrl } from '@/config/cloudinaryConfig';
import { useAdBanners, selectByPlacement } from '../hooks/useAdBanners';
import { trackClick, trackImpression } from '../api/adBannerApi';
import type { AdPage, AdPlacement } from '../types';

/**
 * Standard IAB display-ad units. Slots reserve the exact aspect ratio so the
 * layout doesn't shift and correctly-sized creatives fill edge to edge — the
 * same approach the major listing portals use.
 */
export const AD_FORMATS = {
  billboard: { w: 970, h: 250 },   // large in-content leaderboard
  leaderboard: { w: 728, h: 90 },  // classic thin leaderboard
  rectangle: { w: 300, h: 250 },   // medium rectangle (MPU)
  skyscraper: { w: 160, h: 600 },  // wide skyscraper (narrow side rail)
  halfpage: { w: 300, h: 600 },    // half-page (wide sidebar)
} as const;

export type AdFormat = keyof typeof AD_FORMATS;

interface AdSlotProps {
  /** Which page the visitor is on (drives which banners load). */
  page: AdPage;
  /** Which placement bucket this slot pulls from. Defaults to 'in-content'. */
  placement?: AdPlacement;
  /** Which banner within the placement to show (0-based). Lets one page host
   *  several independent slots from the same placement (e.g. left/right rails). */
  index?: number;
  /** IAB ad format. Defaults to a billboard leaderboard. */
  format?: AdFormat;
  /** Extra wrapper class (e.g. spacing / column spans). */
  className?: string;
  /** Extra wrapper style. */
  style?: React.CSSProperties;
}

/**
 * Inline advertising slot rendered inside page content (not sticky).
 *
 * Renders the selected active banner for a page + placement as a contained
 * card sized to a standard IAB ad unit. Layout-critical properties use inline
 * styles so the slot is exact regardless of the CSS build. Renders nothing
 * when no banner is configured, so empty slots collapse cleanly.
 */
const AdSlot: React.FC<AdSlotProps> = ({
  page,
  placement = 'in-content',
  index = 0,
  format = 'billboard',
  className,
  style,
}) => {
  const { t } = useTranslation(['common']);
  const { data } = useAdBanners(page);
  const trackedRef = useRef<string | null>(null);

  const banner = selectByPlacement(data, placement)[index];

  useEffect(() => {
    if (!banner) return;
    if (trackedRef.current === banner.id) return;
    trackedRef.current = banner.id;
    trackImpression(banner.id);
  }, [banner]);

  const { w, h } = AD_FORMATS[format];
  const isTall = h > w;

  const baseBoxStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    maxWidth: w,
    aspectRatio: `${w} / ${h}`,
    margin: '0 auto',
    borderRadius: 12,
    overflow: 'hidden',
  };

  // No banner configured — show a "Your Ad Here" placeholder so the ad space
  // is always visible and sellable, sized to the real ad slot.
  if (!banner) {
    return (
      <div className={className} style={style} role="complementary" aria-label={t('ads.advertisement', 'Advertisement')}>
        <div
          style={{
            ...baseBoxStyle,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            textAlign: 'center',
            padding: 12,
            background: '#f8fafc',
            border: '2px dashed rgba(0,0,0,0.14)',
            color: '#94a3b8',
          }}
        >
          <span style={{ fontWeight: 700, fontSize: isTall ? 14 : 16, color: '#64748b' }}>
            {t('ads.yourAdHere', 'Your Ad Here')}
          </span>
          <span style={{ fontSize: 11 }}>{t('ads.advertiseWithUs', 'Advertise with us')}</span>
        </div>
      </div>
    );
  }

  const imageSrc = optimizeCloudinaryUrl(banner.imageUrl, {
    width: isTall ? 400 : 1000,
    quality: 'auto',
  });

  return (
    <div className={className} style={style} role="complementary" aria-label={t('ads.advertisement', 'Advertisement')}>
      <div
        style={{
          ...baseBoxStyle,
          background: '#ffffff',
          border: '1px solid rgba(0,0,0,0.08)',
          boxShadow: '0 4px 18px rgba(0,0,0,0.08)',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 6,
            left: 6,
            zIndex: 2,
            background: 'rgba(0,0,0,0.55)',
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
          onClick={() => trackClick(banner.id)}
          aria-label={banner.title}
          style={{ display: 'block', width: '100%', height: '100%' }}
        >
          <img
            src={imageSrc}
            alt={banner.title}
            loading="lazy"
            style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover', background: '#fafafa' }}
          />
        </a>
      </div>
    </div>
  );
};

export default AdSlot;
