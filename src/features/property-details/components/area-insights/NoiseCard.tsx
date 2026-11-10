/**
 * NoiseCard — the estimated sound level at this home by day and by night,
 * and what makes it: the roads, railways, airport or nightlife nearby.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Volume2 } from 'lucide-react';
import { useSurroundings } from '../../hooks/useSurroundings';
import type { NoiseLevel, NoiseSourceSummary } from '../../api/surroundingsApi';
import InsightCard from './InsightCard';
import InsightStatus, { InsightSkeleton } from './InsightStatus';
import BandBadge from './BandBadge';
import { NOISE_BANDS } from './surroundingsLabels';
import { useSurroundingsLabels } from './useSurroundingsLabels';

export interface NoiseCardProps {
  propertyId: string;
}

const NoiseCard: React.FC<NoiseCardProps> = ({ propertyId }) => {
  const { t } = useTranslation(['property']);
  const { data, isLoading, error, refetch, isFetching } = useSurroundings(propertyId);

  const info = (
    <>
      <p>{t('property:areaInsights.noise.explain', 'An estimate, not a measurement: worked out from the roads, railways, airports and nightlife around the home and how far away they are. The WHO advises road noise below 53 dB by day and 45 dB at night.')}</p>
      <p className="mt-2 text-xs text-neutral-500">{t('property:areaInsights.mapSource', 'Map data © OpenStreetMap contributors')}</p>
    </>
  );

  return (
    <InsightCard
      icon={Volume2}
      tone="sky"
      title={t('property:areaInsights.noise.title', 'Ambient noise')}
      subtitle={t('property:areaInsights.noise.subtitle', 'Estimated sound level at this home')}
      info={info}
      sectionKey="noise"
    >
      {isLoading ? (
        <InsightSkeleton caption={t('property:areaInsights.loadingStreets', 'Checking the streets around this home…')} />
      ) : data?.status === 'ok' ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 divide-y divide-neutral-200 sm:divide-y-0">
            <div className="pb-4 sm:pb-0">
              <NoiseLevelRow title={t('property:areaInsights.noise.day', 'Day · 07–23')} level={data.noise.day} />
            </div>
            <div className="pt-4 sm:pt-0">
              <NoiseLevelRow title={t('property:areaInsights.noise.night', 'Night · 23–07')} level={data.noise.night} />
            </div>
          </div>
          <NoiseSources sources={data.noise.sources} />
        </>
      ) : (
        <InsightStatus
          failed={!!error}
          retrying={isFetching}
          onRetry={() => refetch()}
          message={error
            ? t('property:areaInsights.noise.loadError', "We couldn't load noise and traffic for this area right now.")
            : data?.status === 'no-location'
              ? t('property:areaInsights.noise.noLocation', "This listing has no map location, so we can't estimate noise.")
              : t('property:areaInsights.unavailable', "This information isn't available for this listing yet.")}
        />
      )}
    </InsightCard>
  );
};

const NoiseLevelRow: React.FC<{ title: string; level: NoiseLevel }> = ({ title, level }) => {
  const { t } = useTranslation(['property']);
  const labels = useSurroundingsLabels();
  const style = NOISE_BANDS[level.band];
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{title}</h4>
      <p className="mt-1 flex items-baseline gap-1.5">
        <span className="text-2xl sm:text-3xl landscape:text-2xl font-bold tabular-nums text-neutral-900">{level.db}</span>
        <span className="text-sm font-medium text-neutral-500">{t('property:areaInsights.noise.unit', 'dB')}</span>
      </p>
      <BandBadge label={labels.noiseBand(level.band)} badge={style.badge} dot={style.dot} />
    </div>
  );
};

const NoiseSources: React.FC<{ sources: NoiseSourceSummary[] }> = ({ sources }) => {
  const { t } = useTranslation(['property']);
  const labels = useSurroundingsLabels();
  return (
    <div className="mt-4 border-t border-neutral-200 pt-3">
      <h4 className="text-sm font-semibold text-neutral-700">{t('property:areaInsights.noise.sourcesTitle', 'Main sources nearby')}</h4>
      {sources.length === 0 ? (
        <p className="mt-1 text-sm text-neutral-600">{t('property:areaInsights.noise.noSources', 'No busy roads, railways or nightlife close by.')}</p>
      ) : (
        <ul className="mt-1 space-y-1 text-sm text-neutral-600">
          {sources.map((s) => (
            <li key={`${s.kind}-${s.name ?? ''}-${s.distanceM}`} className="flex flex-wrap gap-x-1.5">
              <span className="font-medium text-neutral-800">{s.name ?? labels.sourceKind(s.kind)}</span>
              {s.name && <span>· {labels.sourceKind(s.kind)}</span>}
              <span className="tabular-nums">· {labels.distance(s.distanceM)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default NoiseCard;
