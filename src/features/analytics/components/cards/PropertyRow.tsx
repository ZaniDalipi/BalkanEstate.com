import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  SparklesIcon,
  MapPinIcon,
  BedIcon,
  UsersIcon,
  ClockIcon,
  HeartIcon,
  ChatBubbleLeftRightIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ChevronRightIcon,
  PhotoIcon,
} from '@/constants';
import { formatPrice } from '@/utils/currency';
import { optimizeCloudinaryUrl, cloudinarySrcSet } from '@/config/cloudinaryConfig';
import { ProgressBar } from '../charts';
import Sparkline from '../charts/Sparkline';
import {
  getPerformanceColor,
  formatDuration,
  calculateTrend,
} from '@/src/features/analytics/utils/helpers';

export interface PropertyRowData {
  propertyId: string;
  title: string;
  status?: string;
  isPromoted?: boolean;
  price?: number;
  periodViews: number;
  periodUniqueViews?: number;
  totalViews: number;
  avgDuration?: number;
  imageUrl?: string;
  city?: string;
  country?: string;
  beds?: number;
  sqft?: number;
  saves?: number;
  inquiries?: number;
  previousPeriodViews?: number;
  dailyViews?: number[];
}

export interface PropertyRowProps {
  property: PropertyRowData;
  rank: number;
  maxViews: number;
  /** Localized URL of the property page, so the row is a real link. */
  href?: string;
  onClick?: () => void;
}

const MEDALS = ['🥇', '🥈', '🥉'];

const RANK_RING = [
  'ring-yellow-400 bg-yellow-50',
  'ring-neutral-300 bg-neutral-50',
  'ring-orange-300 bg-orange-50',
];

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-500/90 text-white',
  sold: 'bg-neutral-800/80 text-white',
  rented: 'bg-blue-500/90 text-white',
  draft: 'bg-neutral-400/90 text-white',
};

const KNOWN_STATUSES = Object.keys(STATUS_STYLES);

/**
 * Property row component
 * A clickable listing summary: photo, location and price, the period's views
 * with a daily sparkline and trend, and engagement stats.
 */
const PropertyRow: React.FC<PropertyRowProps> = ({ property, rank, maxViews, href, onClick }) => {
  const { t } = useTranslation(['analytics']);
  const [imageFailed, setImageFailed] = useState(false);

  const performanceLevel = maxViews > 0 ? property.periodViews / maxViews : 0;
  const { text: performanceColor, bar: barColor } = getPerformanceColor(performanceLevel);
  const trend =
    property.previousPeriodViews !== undefined
      ? calculateTrend(property.periodViews, property.previousPeriodViews)
      : null;
  const location = [property.city, property.country].filter(Boolean).join(', ');
  const imageSrc = imageFailed ? '' : optimizeCloudinaryUrl(property.imageUrl, { width: 320, height: 240 });
  // Active is the norm; only flag listings that are not live.
  const status =
    property.status && property.status !== 'active' && KNOWN_STATUSES.includes(property.status)
      ? property.status
      : undefined;

  const engagement: Array<{ icon: React.ReactNode; label: string }> = [];
  if (property.periodUniqueViews !== undefined) {
    engagement.push({
      icon: <UsersIcon className="h-3.5 w-3.5" />,
      label: t('analytics:properties.uniqueViews', { count: property.periodUniqueViews }),
    });
  }
  if (property.avgDuration) {
    engagement.push({
      icon: <ClockIcon className="h-3.5 w-3.5" />,
      label: t('analytics:properties.avgTime', { time: formatDuration(property.avgDuration) }),
    });
  }
  if (property.saves !== undefined) {
    engagement.push({
      icon: <HeartIcon className="h-3.5 w-3.5" />,
      label: t('analytics:properties.saves', { count: property.saves }),
    });
  }
  if (property.inquiries !== undefined) {
    engagement.push({
      icon: <ChatBubbleLeftRightIcon className="h-3.5 w-3.5" />,
      label: t('analytics:properties.inquiries', { count: property.inquiries }),
    });
  }

  // A plain left click navigates in-app; modified clicks (new tab) keep the link's default.
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!onClick) return;
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    onClick();
  };

  return (
    <a
      href={href}
      onClick={handleClick}
      aria-label={t('analytics:properties.openProperty', { title: property.title })}
      className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 hover:bg-neutral-50 focus-visible:bg-neutral-50 focus-visible:outline-none transition-colors group cursor-pointer"
    >
      {/* Photo with rank */}
      <div className="relative flex-shrink-0 w-20 h-16 sm:w-28 sm:h-20 rounded-lg overflow-hidden bg-neutral-100">
        {imageSrc ? (
          <img
            src={imageSrc}
            srcSet={cloudinarySrcSet(property.imageUrl, [320, 480]) || undefined}
            sizes="112px"
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setImageFailed(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-neutral-100 to-neutral-200">
            <PhotoIcon className="h-6 w-6 text-neutral-300" />
          </div>
        )}
        <span
          className={`absolute top-1 left-1 min-w-[22px] h-[22px] px-1 rounded-full flex items-center justify-center text-[11px] font-bold shadow-sm ${
            rank <= 3 ? `ring-2 ${RANK_RING[rank - 1]}` : 'bg-white/90 text-neutral-600'
          }`}
        >
          {rank <= 3 ? MEDALS[rank - 1] : rank}
        </span>
        {status && (
          <span
            className={`absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wide ${STATUS_STYLES[status]}`}
          >
            {t(`analytics:properties.${status}`, { defaultValue: status })}
          </span>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <h4 className="font-semibold text-neutral-900 text-sm truncate group-hover:text-primary transition-colors">
            {property.title}
          </h4>
          {property.isPromoted && (
            <span className="flex-shrink-0 px-1.5 py-0.5 text-[10px] font-semibold rounded bg-purple-100 text-purple-700 flex items-center gap-0.5">
              <SparklesIcon className="h-2.5 w-2.5" />
              PRO
            </span>
          )}
        </div>

        <div className="mt-0.5 flex items-center gap-x-3 gap-y-0.5 flex-wrap text-xs text-neutral-500">
          {property.price ? (
            <span className="font-semibold text-neutral-800">
              {formatPrice(property.price, property.country || 'Serbia')}
            </span>
          ) : null}
          {location && (
            <span className="flex items-center gap-1 min-w-0">
              <MapPinIcon className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">{location}</span>
            </span>
          )}
          {property.beds ? (
            <span className="hidden sm:flex items-center gap-1">
              <BedIcon className="h-3.5 w-3.5" />
              {property.beds}
            </span>
          ) : null}
          {property.sqft ? <span className="hidden sm:inline">{property.sqft} m²</span> : null}
        </div>

        {engagement.length > 0 && (
          <div className="mt-1.5 hidden sm:flex items-center gap-1.5 flex-wrap">
            {engagement.map((item, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-neutral-100 text-[11px] text-neutral-600"
              >
                {item.icon}
                {item.label}
              </span>
            ))}
          </div>
        )}

        <div className="mt-2 max-w-[220px]">
          <ProgressBar value={property.periodViews} max={maxViews} color={barColor} />
        </div>
      </div>

      {/* Views trend */}
      {property.dailyViews && property.dailyViews.length > 1 && (
        <Sparkline
          data={property.dailyViews}
          width={96}
          height={36}
          className={`hidden md:block flex-shrink-0 ${performanceLevel > 0.3 ? performanceColor : 'text-primary'}`}
        />
      )}

      {/* Views */}
      <div className="flex-shrink-0 text-right min-w-[64px]">
        <p className={`text-xl font-bold leading-tight ${performanceColor}`}>{property.periodViews}</p>
        {trend !== null && (
          <p
            className={`flex items-center justify-end gap-0.5 text-[11px] font-semibold ${
              trend >= 0 ? 'text-green-600' : 'text-red-500'
            }`}
            title={t('analytics:properties.vsPreviousPeriod')}
          >
            {trend >= 0 ? (
              <ArrowTrendingUpIcon className="h-3 w-3" />
            ) : (
              <ArrowTrendingDownIcon className="h-3 w-3" />
            )}
            {trend > 0 ? '+' : ''}
            {trend}%
          </p>
        )}
        <p className="text-[10px] text-neutral-400">
          {t('analytics:properties.totalViews', { count: property.totalViews })}
        </p>
      </div>

      <ChevronRightIcon className="hidden sm:block h-4 w-4 flex-shrink-0 text-neutral-300 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
    </a>
  );
};

export default PropertyRow;
