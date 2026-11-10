import React, { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { SHADES, hourLabel, type DayType, type TrafficShade } from './trafficProfile';

export interface HourControlsProps {
  day: DayType;
  hour: number;
  onDay: (day: DayType) => void;
  onHour: (hour: number) => void;
}

const DAYS: DayType[] = ['weekday', 'weekend'];
const SHADE_ORDER: TrafficShade[] = ['flowing', 'light', 'moderate', 'heavy', 'veryHeavy'];

/** Weekday/weekend switch, an hour slider and the colour key. */
const HourControls: React.FC<HourControlsProps> = ({ day, hour, onDay, onHour }) => {
  const { t } = useTranslation(['property']);
  const sliderId = useId();
  const dayName = (d: DayType) => (d === 'weekday'
    ? t('property:areaInsights.traffic.weekday', 'Weekdays')
    : t('property:areaInsights.traffic.weekend', 'Weekends'));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label={t('property:areaInsights.traffic.dayType', 'Day of the week')} className="inline-flex rounded-xl bg-neutral-100 p-1">
          {DAYS.map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={day === d}
              onClick={() => onDay(d)}
              className={`min-h-[44px] landscape:min-h-[32px] rounded-lg px-4 text-sm font-semibold transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                day === d ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              {dayName(d)}
            </button>
          ))}
        </div>
        <label htmlFor={sliderId} className="text-sm text-neutral-600">
          {t('property:areaInsights.traffic.timeOfDay', 'Time of day')}:{' '}
          <span className="font-semibold tabular-nums text-neutral-900">{hourLabel(hour)}</span>
        </label>
      </div>
      <input
        id={sliderId}
        type="range"
        min={0}
        max={23}
        step={1}
        value={hour}
        onChange={(e) => onHour(Number(e.target.value))}
        aria-valuetext={`${dayName(day)} ${hourLabel(hour)}`}
        className="h-11 landscape:h-8 w-full cursor-pointer accent-primary"
      />
      <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-neutral-600" aria-label={t('property:areaInsights.traffic.legend', 'Colour key')}>
        {SHADE_ORDER.map((s) => (
          <li key={s} className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className={`h-2 w-5 rounded-full ${SHADES[s].swatch}`} />
            {t(`property:areaInsights.traffic.shade.${s}`, SHADES[s].label)}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default HourControls;
