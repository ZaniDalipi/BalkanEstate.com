import React from 'react';
import { useTranslation } from 'react-i18next';
import type { TrafficLevel } from '../../../api/surroundingsApi';
import { SHADES, areaIntensity, busiestWindows, hourLabel, shadeFor, type DayType } from './trafficProfile';

export interface TrafficPatternChartProps {
  level: TrafficLevel;
  day: DayType;
  hour: number;
  onHour: (hour: number) => void;
}

const HOURS = Array.from({ length: 24 }, (_, h) => h);

/**
 * How busy the area typically is through the day: 24 bars, the chosen hour
 * outlined. Clicking a bar picks that hour; the slider in HourControls is the
 * keyboard and screen-reader control, so the bars are hidden from them.
 */
const TrafficPatternChart: React.FC<TrafficPatternChartProps> = ({ level, day, hour, onHour }) => {
  const { t } = useTranslation(['property']);
  const windows = busiestWindows(day)
    .map(([from, to]) => `${hourLabel(from)}–${hourLabel(to)}`)
    .join(', ');

  return (
    <div>
      <p className="text-sm text-neutral-700">
        {t('property:areaInsights.traffic.busiestAt', 'Busiest around {{times}}', { times: windows })}
      </p>
      <div className="mt-2 flex h-24 items-end gap-[2px]" aria-hidden="true">
        {HOURS.map((h) => {
          const intensity = areaIntensity(level, day, h);
          return (
            <div
              key={h}
              onClick={() => onHour(h)}
              className={`flex-1 cursor-pointer rounded-t ${h === hour ? 'ring-2 ring-neutral-900 ring-offset-1' : ''}`}
              style={{ height: `${Math.max(6, intensity * 100)}%`, backgroundColor: SHADES[shadeFor(intensity)].color }}
            />
          );
        })}
      </div>
      <div className="mt-1 flex justify-between text-[11px] tabular-nums text-neutral-500" aria-hidden="true">
        <span>00</span><span>06</span><span>12</span><span>18</span><span>24</span>
      </div>
    </div>
  );
};

export default TrafficPatternChart;
