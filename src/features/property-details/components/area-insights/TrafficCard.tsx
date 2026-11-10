/**
 * TrafficCard — how busy the streets around the home typically are (from the
 * class and distance of the nearest roads), and Google's live traffic on a
 * map that loads when the visitor asks for it.
 */

import React, { Suspense, lazy, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Car, Map as MapIcon } from 'lucide-react';
import { useSurroundings } from '../../hooks/useSurroundings';
import type { Surroundings } from '../../api/surroundingsApi';
import InsightCard from './InsightCard';
import InsightStatus, { InsightSkeleton } from './InsightStatus';
import BandBadge from './BandBadge';
import { TRAFFIC_LEVELS } from './surroundingsLabels';
import { useSurroundingsLabels } from './useSurroundingsLabels';

const LiveTrafficMap = lazy(() => import('./LiveTrafficMap'));

export interface TrafficCardProps {
  propertyId: string;
  lat: number;
  lng: number;
}

const TrafficCard: React.FC<TrafficCardProps> = ({ propertyId, lat, lng }) => {
  const { t } = useTranslation(['property']);
  const { data, isLoading, error, refetch, isFetching } = useSurroundings(propertyId);
  const [showMap, setShowMap] = useState(false);

  const info = (
    <>
      <p>{t('property:areaInsights.traffic.explain', 'The typical level comes from the kind of roads around the home and how close they are. The map shows Google’s live traffic right now.')}</p>
      <p className="mt-2 text-xs text-neutral-500">{t('property:areaInsights.mapSource', 'Map data © OpenStreetMap contributors')}</p>
    </>
  );

  return (
    <InsightCard
      icon={Car}
      tone="amber"
      title={t('property:areaInsights.traffic.title', 'Traffic')}
      subtitle={t('property:areaInsights.traffic.subtitle', 'Street traffic around this home')}
      info={info}
    >
      {isLoading ? (
        <InsightSkeleton />
      ) : data?.status === 'ok' ? (
        <>
          <TypicalTraffic traffic={data.traffic} />
          <div className="mt-4">
            {showMap ? (
              <Suspense fallback={<div className="h-64 sm:h-72 landscape:h-48 rounded-xl bg-neutral-100 animate-pulse motion-reduce:animate-none" aria-hidden="true" />}>
                <LiveTrafficMap lat={lat} lng={lng} />
              </Suspense>
            ) : (
              <button
                type="button"
                onClick={() => setShowMap(true)}
                className="inline-flex min-h-[44px] landscape:min-h-[32px] items-center gap-2 rounded-xl border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <MapIcon aria-hidden="true" className="h-4 w-4" />
                {t('property:areaInsights.traffic.showLive', 'Show live traffic')}
              </button>
            )}
          </div>
        </>
      ) : (
        <InsightStatus
          failed={!!error}
          retrying={isFetching}
          onRetry={() => refetch()}
          message={error
            ? t('property:areaInsights.noise.loadError', "We couldn't load noise and traffic for this area right now.")
            : t('property:areaInsights.traffic.noLocation', "This listing has no map location, so we can't show traffic.")}
        />
      )}
    </InsightCard>
  );
};

const TypicalTraffic: React.FC<{ traffic: Surroundings['traffic'] }> = ({ traffic }) => {
  const { t } = useTranslation(['property']);
  const labels = useSurroundingsLabels();
  const style = TRAFFIC_LEVELS[traffic.level];
  const road = traffic.nearestMainRoad;
  return (
    <div>
      <BandBadge label={labels.trafficLevel(traffic.level)} badge={style.badge} dot={style.dot} />
      <p className="mt-3 text-sm text-neutral-600">
        {!road
          ? t('property:areaInsights.traffic.noMainRoad', 'No main road within 500 m.')
          : road.name
            ? t('property:areaInsights.traffic.nearestRoad', 'Nearest main road: {{road}} ({{kind}}), {{distance}} away', {
                road: road.name,
                kind: labels.sourceKind(road.kind),
                distance: labels.distance(road.distanceM),
              })
            : t('property:areaInsights.traffic.nearestRoadUnnamed', 'Nearest main road: a {{kind}}, {{distance}} away', {
                kind: labels.sourceKind(road.kind).toLowerCase(),
                distance: labels.distance(road.distanceM),
              })}
      </p>
    </div>
  );
};

export default TrafficCard;
