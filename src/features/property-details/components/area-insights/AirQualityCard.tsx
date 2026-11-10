/**
 * AirQualityCard — the average air quality at this home's location for the
 * latest summer and winter (Copernicus CAMS data, European AQI).
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Wind } from 'lucide-react';
import { useAirQuality } from '../../hooks/useAirQuality';
import type { SeasonAirQuality } from '../../api/airQualityApi';
import SeasonAirQualityRow from './SeasonAirQualityRow';
import HowMeasured from './HowMeasured';
import { orderSeasons } from './airQualityBands';

export interface AirQualityCardProps {
  propertyId: string;
}

const AirQualityCard: React.FC<AirQualityCardProps> = ({ propertyId }) => {
  const { t } = useTranslation(['property']);
  const { data, isLoading, error, refetch, isFetching } = useAirQuality(propertyId);

  if (isLoading) {
    return (
      <CardShell>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-pulse motion-reduce:animate-none" aria-hidden="true">
          <div className="h-24 rounded-xl bg-emerald-100/60" />
          <div className="h-24 rounded-xl bg-emerald-100/60" />
        </div>
      </CardShell>
    );
  }

  if (data?.status === 'ok') {
    return (
      <CardShell>
        <SeasonList seasons={data.seasons} />
        <AirQualityNotes />
      </CardShell>
    );
  }

  const message = error
    ? t('property:areaInsights.airQuality.loadError', "We couldn't load air quality right now.")
    : data?.status === 'no-location'
      ? t('property:areaInsights.airQuality.noLocation', "This listing has no map location, so we can't show its air quality.")
      : t('property:areaInsights.airQuality.noData', 'No air quality data is available for this location yet.');

  return (
    <CardShell>
      <div className="flex flex-wrap items-center gap-3">
        <p role={error ? 'alert' : undefined} className="text-sm text-neutral-600">{message}</p>
        {error && (
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="min-h-[44px] landscape:min-h-[32px] px-1 text-sm font-semibold text-primary hover:underline disabled:opacity-60 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {isFetching ? t('property:areaPrices.retrying', 'Retrying…') : t('property:areaPrices.retry', 'Try again')}
          </button>
        )}
      </div>
    </CardShell>
  );
};

const CardShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation(['property']);
  return (
    <section
      aria-labelledby="air-quality-title"
      className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/70 via-white to-white p-4 sm:p-6 landscape:p-3 shadow-sm"
    >
      <div className="mb-4 landscape:mb-2 flex items-start gap-3">
        <Wind aria-hidden="true" className="mt-0.5 h-6 w-6 flex-shrink-0 text-emerald-500" />
        <div>
          <h3 id="air-quality-title" className="text-lg sm:text-xl landscape:text-base font-bold text-neutral-800">
            {t('property:areaInsights.airQuality.title', 'Air quality')}
          </h3>
          <p className="text-sm text-neutral-500">
            {t('property:areaInsights.airQuality.subtitle', 'Seasonal averages at this location')}
          </p>
        </div>
      </div>
      {children}
    </section>
  );
};

const SeasonList: React.FC<{ seasons: SeasonAirQuality[] }> = ({ seasons }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 divide-y divide-neutral-200 sm:divide-y-0">
    {orderSeasons(seasons).map((s, i) => (
      <div key={s.season} className={i > 0 ? 'pt-4 sm:pt-0' : undefined}>
        <SeasonAirQualityRow season={s} />
      </div>
    ))}
  </div>
);

const AirQualityNotes: React.FC = () => {
  const { t } = useTranslation(['property']);
  return (
    <HowMeasured>
      <p>
        {t(
          'property:areaInsights.airQuality.explain',
          'The European Air Quality Index runs from 0 (clean air) to over 100 (extremely poor). Winter values are often higher because of home heating.'
        )}
      </p>
      <p>{t('property:areaInsights.airQuality.source', 'Source: Copernicus Atmosphere Monitoring Service, via Open-Meteo')}</p>
    </HowMeasured>
  );
};

export default AirQualityCard;
