import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { optimizeCloudinaryUrl } from '@/config/cloudinaryConfig';
import { useAdBanners, selectByPlacement } from '../hooks/useAdBanners';
import { trackClick, trackImpression } from '../api/adBannerApi';
import type { AdPage, AdPlacement } from '../types';

type Orientation = 'horizontal' | 'vertical';

interface AdSlotProps {
  /** Which page the visitor is on (drives which banners load). */
  page: AdPage;
  /** Which placement bucket this slot pulls from. Defaults to 'in-content'. */
  placement?: AdPlacement;
  /** Which banner within the placement to show (0-based). Lets one page host
   *  several independent slots from the same placement (e.g. left/right rails). */
  index?: number;
  /** 'horizontal' = leaderboard band; 'vertical' = skyscraper rail. */
  orientation?: Orientation;
  /** Extra wrapper class (e.g. spacing / column spans). */
  className?: string;
  /** Extra wrapper style. */
  style?: React.CSSProperties;
}

/**
 * Inline advertising slot rendered inside page content (not sticky).
 *
 * Renders the selected active banner for a page + placement as a contained,
 * fixed-size card. Layout-critical properties use inline styles so the image
 * can never overflow the card, regardless of the CSS build. Renders nothing
 * when no banner is configured, so empty slots collapse cleanly.
 */
const AdSlot: React.FC<AdSlotProps> = ({
  page,
  placement = 'in-content',
  index = 0,
  orientation = 'horizontal',
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

  if (!banner) return null;

  const isVertical = orientation === 'vertical';
  const imageSrc = optimizeCloudinaryUrl(banner.imageUrl, {
    width: isVertical ? 400 : 1000,
    quality: 'auto',
  });

  const cardStyle: React.CSSProperties = isVertical
    ? { width: '100%', height: 600, maxHeight: '80vh' }
    : { width: '100%', maxWidth: 970, height: 130, margin: '0 auto' };

  return (
    <div className={className} style={style} role="complementary" aria-label={t('ads.advertisement', 'Advertisement')}>
      <div
        style={{
          position: 'relative',
          background: '#ffffff',
          border: '1px solid rgba(0,0,0,0.08)',
          borderRadius: 14,
          boxShadow: '0 4px 18px rgba(0,0,0,0.08)',
          overflow: 'hidden',
          ...cardStyle,
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
            style={{ display: 'block', width: '100%', height: '100%', objectFit: 'contain', background: '#fafafa' }}
          />
        </a>
      </div>
    </div>
  );
};

export default AdSlot;
