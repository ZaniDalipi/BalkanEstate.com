/**
 * LiveTrafficMap — Google's live traffic around the home. Loaded only when the
 * visitor asks for it: every map load is billed, and the page stays light.
 */

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { GoogleMap, MarkerF, TrafficLayerF } from '@react-google-maps/api';
import { useGoogleMapLoader, GOOGLE_MAPS_MAP_ID } from '@/src/features/map/hooks/useGoogleMapLoader';
import InsightStatus from './InsightStatus';

export interface LiveTrafficMapProps {
  lat: number;
  lng: number;
}

const CONTAINER_STYLE = { width: '100%', height: '100%' };

const LiveTrafficMap: React.FC<LiveTrafficMapProps> = ({ lat, lng }) => {
  const { t } = useTranslation(['property']);
  const { isLoaded, loadError } = useGoogleMapLoader();
  const center = useMemo(() => ({ lat, lng }), [lat, lng]);
  const options = useMemo<google.maps.MapOptions | undefined>(
    () => (isLoaded
      ? {
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: 'cooperative',
          clickableIcons: false,
          ...(GOOGLE_MAPS_MAP_ID ? { mapId: GOOGLE_MAPS_MAP_ID } : {}),
        }
      : undefined),
    [isLoaded]
  );

  if (loadError || !import.meta.env.VITE_GOOGLE_MAPS_KEY) {
    return <InsightStatus message={t('property:areaInsights.traffic.mapUnavailable', "The live traffic map isn't available right now.")} />;
  }

  return (
    <div>
      <div
        className="h-64 sm:h-72 landscape:h-48 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100"
        role="region"
        aria-label={t('property:areaInsights.traffic.mapLabel', 'Live traffic map around this home')}
      >
        {isLoaded ? (
          <GoogleMap mapContainerStyle={CONTAINER_STYLE} center={center} zoom={15} options={options}>
            <TrafficLayerF />
            <MarkerF position={center} />
          </GoogleMap>
        ) : (
          <div className="h-full w-full animate-pulse motion-reduce:animate-none" aria-hidden="true" />
        )}
      </div>
      <TrafficLegend />
    </div>
  );
};

/** Google's traffic colours: green flows, red crawls. */
const TrafficLegend: React.FC = () => {
  const { t } = useTranslation(['property']);
  const steps = ['bg-green-500', 'bg-yellow-400', 'bg-orange-500', 'bg-red-600', 'bg-red-900'];
  return (
    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-500">
      <span className="flex items-center gap-2">
        {t('property:areaInsights.traffic.fast', 'Fast')}
        <span className="flex overflow-hidden rounded-full" aria-hidden="true">
          {steps.map((c) => <span key={c} className={`h-2 w-5 ${c}`} />)}
        </span>
        {t('property:areaInsights.traffic.slow', 'Slow')}
      </span>
      <span>{t('property:areaInsights.traffic.liveSource', 'Live traffic by Google')}</span>
    </div>
  );
};

export default LiveTrafficMap;
