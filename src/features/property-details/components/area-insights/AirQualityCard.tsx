/**
 * AirQualityCard — the average air quality at this home's location for the
 * latest summer and winter (Copernicus CAMS data, European AQI).
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Wind } from 'lucide-react';
import { useAirQuality } from '../../hooks/useAirQuality';
import SeasonAirQualityRow from './SeasonAirQualityRow';
import InsightCard from './InsightCard';
import InsightStatus, { InsightSkeleton } from './InsightStatus';
import { orderSeasons } from './airQualityBands';

export interface AirQualityCardProps {
  propertyId: string;
}

const AirQualityCard: React.FC<AirQualityCardProps> = ({ propertyId }) => {
  const { t } = useTranslation(['property']);
  const { data, isLoading, error, refetch, isFetching } = useAirQuality(propertyId);
  const ok = data?.status === 'ok';

  const info = (
    <>
      <p>
        {t(
          'property:areaInsights.airQuality.explain',
          'The European Air Quality Index runs from 0 (clean air) to over 100 (extremely poor). Winter values are often higher because of home heating.'
        )}
      </p>
      <p className="mt-2 text-xs text-neutral-500">
        {t('property:areaInsights.airQuality.source', 'Source: Copernicus Atmosphere Monitoring Service, via Open-Meteo')}
      </p>
    </>
  );

  return (
    <InsightCard
      icon={Wind}
      tone="emerald"
      title={t('property:areaInsights.airQuality.title', 'Air quality')}
      subtitle={t('property:areaInsights.airQuality.subtitle', 'Seasonal averages at this location')}
      info={info}
    >
      {isLoading ? (
        <InsightSkeleton />
      ) : ok ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 divide-y divide-neutral-200 sm:divide-y-0">
          {orderSeasons(data.seasons).map((s, i) => (
            <div key={s.season} className={i > 0 ? 'pt-4 sm:pt-0' : 'pb-4 sm:pb-0'}>
              <SeasonAirQualityRow season={s} />
            </div>
          ))}
        </div>
      ) : (
        <InsightStatus
          failed={!!error}
          retrying={isFetching}
          onRetry={() => refetch()}
          message={
            error
              ? t('property:areaInsights.airQuality.loadError', "We couldn't load air quality right now.")
              : data?.status === 'no-location'
                ? t('property:areaInsights.airQuality.noLocation', "This listing has no map location, so we can't show its air quality.")
                : t('property:areaInsights.airQuality.noData', 'No air quality data is available for this location yet.')
          }
        />
      )}
    </InsightCard>
  );
};

export default AirQualityCard;
