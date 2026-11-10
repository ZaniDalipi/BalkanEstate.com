import React from 'react';
import { useTranslation } from 'react-i18next';
import type { SeasonAirQuality } from '../../api/airQualityApi';
import { aqiBand, seasonYears } from './airQualityBands';
import BandBadge from './BandBadge';

export interface SeasonAirQualityRowProps {
  season: SeasonAirQuality;
}

/** One season: its average AQI, the band it falls in, and the PM2.5 behind it. */
const SeasonAirQualityRow: React.FC<SeasonAirQualityRowProps> = ({ season }) => {
  const { t, i18n } = useTranslation(['property']);
  const years = seasonYears(season);
  const title = season.season === 'summer'
    ? t('property:areaInsights.airQuality.summer', 'Summer {{years}}', { years })
    : t('property:areaInsights.airQuality.winter', 'Winter {{years}}', { years });
  const number = (v: number) => new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 1 }).format(v);

  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{title}</h4>
      {season.aqi === null ? (
        <p className="mt-2 text-sm text-neutral-500">
          {t('property:areaInsights.airQuality.noSeason', 'No data for this season')}
        </p>
      ) : (
        <>
          <p className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl landscape:text-2xl font-bold tabular-nums text-neutral-900">{Math.round(season.aqi)}</span>
            <span className="text-sm font-medium text-neutral-500">
              {t('property:areaInsights.airQuality.aqiUnit', 'AQI')}
            </span>
          </p>
          <AqiBadge aqi={season.aqi} />
        </>
      )}
      {season.pm25 !== null && (
        <p className="mt-2 text-sm tabular-nums text-neutral-600">
          {t('property:areaInsights.airQuality.pm25', 'PM2.5 {{value}} µg/m³', { value: number(season.pm25) })}
        </p>
      )}
    </div>
  );
};

const AqiBadge: React.FC<{ aqi: number }> = ({ aqi }) => {
  const { t } = useTranslation(['property']);
  const band = aqiBand(aqi);
  return <BandBadge label={t(`property:areaInsights.airQuality.band.${band.key}`, band.label)} badge={band.badge} dot={band.dot} />;
};

export default SeasonAirQualityRow;
