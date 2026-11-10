/**
 * TrafficExplorer — when the streets around a home get busy: the day's
 * pattern, a day/hour picker, and the roads coloured for that hour on a map
 * that opens full screen. A typical pattern, never live traffic.
 */

import React, { Suspense, lazy, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Maximize2 } from 'lucide-react';
import type { RoadLine, TrafficLevel } from '../../../api/surroundingsApi';
import TrafficPatternChart from './TrafficPatternChart';
import HourControls from './HourControls';
import TrafficMapDialog from './TrafficMapDialog';
import { nowSlot, type DayType } from './trafficProfile';

const TypicalTrafficMap = lazy(() => import('./TypicalTrafficMap'));

export interface TrafficExplorerProps {
  level: TrafficLevel;
  roads: RoadLine[];
  center: { lat: number; lng: number };
}

const MapFallback: React.FC = () => (
  <div className="h-full w-full animate-pulse motion-reduce:animate-none bg-neutral-100" aria-hidden="true" />
);

const TrafficExplorer: React.FC<TrafficExplorerProps> = ({ level, roads, center }) => {
  const { t } = useTranslation(['property']);
  const [slot, setSlot] = useState(nowSlot);
  const [fullScreen, setFullScreen] = useState(false);
  const setDay = (day: DayType) => setSlot((s) => ({ ...s, day }));
  const setHour = (hour: number) => setSlot((s) => ({ ...s, hour }));
  const hasMap = roads.length > 0;

  const controls = <HourControls day={slot.day} hour={slot.hour} onDay={setDay} onHour={setHour} />;
  const map = (interactive: boolean) => (
    <Suspense fallback={<MapFallback />}>
      <TypicalTrafficMap center={center} roads={roads} day={slot.day} hour={slot.hour} interactive={interactive} />
    </Suspense>
  );

  return (
    <div className="mt-5 space-y-4">
      <h4 className="text-sm font-semibold text-neutral-800">
        {t('property:areaInsights.traffic.patternTitle', 'Typical traffic through the day')}
      </h4>
      <TrafficPatternChart level={level} day={slot.day} hour={slot.hour} onHour={setHour} />
      {controls}

      {hasMap && (
        <div>
          <div className="relative z-0 h-72 sm:h-96 landscape:h-56 overflow-hidden rounded-xl border border-neutral-200">
            {!fullScreen && map(false)}
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-neutral-500">
              {t('property:areaInsights.traffic.typicalNote', 'A typical pattern from the kind of roads and standard daily traffic — not live or measured traffic.')}
            </p>
            <button
              type="button"
              onClick={() => setFullScreen(true)}
              className="inline-flex min-h-[44px] landscape:min-h-[32px] items-center gap-2 rounded-xl border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Maximize2 aria-hidden="true" className="h-4 w-4" />
              {t('property:areaInsights.traffic.fullScreen', 'Open full-screen map')}
            </button>
          </div>
        </div>
      )}

      {fullScreen && <TrafficMapDialog onClose={() => setFullScreen(false)} map={map(true)} controls={controls} />}
    </div>
  );
};

export default TrafficExplorer;
