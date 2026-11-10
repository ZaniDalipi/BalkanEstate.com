/**
 * TrafficCard — how busy the streets around the home typically are: the
 * level (from the class and distance of the nearest roads), the street it is
 * on, and when traffic peaks through the day on a map (TrafficExplorer).
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Car } from 'lucide-react';
import { useSurroundings } from '../../hooks/useSurroundings';
import type { Surroundings } from '../../api/surroundingsApi';
import InsightCard from './InsightCard';
import InsightStatus, { InsightSkeleton } from './InsightStatus';
import BandBadge from './BandBadge';
import { TRAFFIC_LEVELS } from './surroundingsLabels';
import { useSurroundingsLabels } from './useSurroundingsLabels';
import TrafficExplorer from './traffic/TrafficExplorer';

export interface TrafficCardProps {
  propertyId: string;
  lat: number;
  lng: number;
}

const TrafficCard: React.FC<TrafficCardProps> = ({ propertyId, lat, lng }) => {
  const { t } = useTranslation(['property']);
  const { data, isWaiting, gaveUp, error, refetch, isFetching } = useSurroundings(propertyId);

  const info = (
    <>
      <p>{t('property:areaInsights.traffic.explain', 'How busy it gets comes from the kind of roads around the home, how close they are, and the standard pattern of traffic through a weekday and a weekend day. It is a typical picture, not live or measured traffic.')}</p>
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
      sectionKey="traffic"
    >
      {isWaiting ? (
        <InsightSkeleton caption={t('property:areaInsights.loadingStreets', 'Checking the streets around this home…')} />
      ) : data?.status === 'ok' ? (
        <>
          <TypicalTraffic traffic={data.traffic} />
          <TrafficExplorer level={data.traffic.level} roads={data.roads} center={{ lat, lng }} />
        </>
      ) : (
        <InsightStatus
          failed={!!error || gaveUp}
          retrying={isFetching}
          onRetry={() => refetch()}
          message={gaveUp
            ? t('property:areaInsights.stillChecking', 'The map servers are busy, so this is taking longer than usual. Try again in a minute.')
            : error
            ? t('property:areaInsights.noise.loadError', "We couldn't load noise and traffic for this area right now.")
            : data?.status === 'no-location'
              ? t('property:areaInsights.traffic.noLocation', "This listing has no map location, so we can't show traffic.")
              : t('property:areaInsights.unavailable', "This information isn't available for this listing yet.")}
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
  const street = traffic.nearestStreet;
  // Name the home's own street unless it is the main road itself.
  const showStreet = street && !(road && street.kind === road.kind && street.name === road.name);
  return (
    <div>
      <BandBadge label={labels.trafficLevel(traffic.level)} badge={style.badge} dot={style.dot} />
      {showStreet && (
        <p className="mt-3 text-sm text-neutral-600">
          {street.name
            ? t('property:areaInsights.traffic.nearestStreet', 'Nearest street: {{street}} ({{kind}}), {{distance}} away', {
                street: street.name,
                kind: labels.sourceKind(street.kind),
                distance: labels.distance(street.distanceM),
              })
            : t('property:areaInsights.traffic.nearestStreetUnnamed', 'Nearest street: {{distance}} away', {
                distance: labels.distance(street.distanceM),
              })}
        </p>
      )}
      <p className={`${showStreet ? 'mt-1' : 'mt-3'} text-sm text-neutral-600`}>
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
