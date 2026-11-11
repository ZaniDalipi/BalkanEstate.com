/**
 * Typical traffic through the day. Pure.
 *
 * Not a measurement of this street: free per-street historical traffic does
 * not exist (TomTom and Google sell it). This is the standard shape of urban
 * traffic through a weekday and a weekend day, as published in European road
 * statistics (share of the day's traffic per hour: morning and evening peaks
 * on weekdays, one broad midday hump at weekends), scaled by how busy a road
 * of that class usually is.
 */

import type { RoadKind, TrafficLevel } from '../../../api/surroundingsApi';

export type DayType = 'weekday' | 'weekend';
export type MapRoadKind = RoadKind | 'street';

/** Share of a day's traffic in each hour (00–23), in approximate percent; only the shape matters. */
export const HOURLY_SHARE: Record<DayType, readonly number[]> = {
  weekday: [0.8, 0.5, 0.4, 0.4, 0.6, 1.5, 3.6, 6.8, 7.6, 5.9, 5.3, 5.5, 5.7, 5.8, 6.1, 7.0, 7.8, 8.2, 6.8, 4.9, 3.6, 2.9, 2.2, 1.4],
  weekend: [1.4, 1.0, 0.7, 0.5, 0.5, 0.7, 1.3, 2.3, 3.6, 5.2, 6.6, 7.5, 7.8, 7.6, 7.2, 7.0, 6.9, 6.6, 5.8, 4.8, 3.8, 3.1, 2.6, 1.9],
};

const PEAK_SHARE = Math.max(...HOURLY_SHARE.weekday, ...HOURLY_SHARE.weekend);

/** How busy a road of each class is at its peak, 0–1. */
export const ROAD_WEIGHT: Record<MapRoadKind, number> = {
  motorway: 1,
  trunk: 0.95,
  primary: 0.9,
  secondary: 0.75,
  tertiary: 0.55,
  street: 0.3,
};

/** How busy the area as a whole is at its peak, 0–1, from its traffic level. */
export const AREA_WEIGHT: Record<TrafficLevel, number> = { busy: 0.95, moderate: 0.7, calm: 0.4 };

/** How much traffic there is at an hour, relative to the busiest hour of any day (0–1). */
export const hourShare = (day: DayType, hour: number): number =>
  (HOURLY_SHARE[day][((Math.floor(hour) % 24) + 24) % 24] ?? 0) / PEAK_SHARE;

/** Typical busyness of a road of this class at this hour, 0–1. */
export const roadIntensity = (kind: MapRoadKind, day: DayType, hour: number): number =>
  ROAD_WEIGHT[kind] * hourShare(day, hour);

/** Typical busyness of the area at this hour, 0–1. */
export const areaIntensity = (level: TrafficLevel, day: DayType, hour: number): number =>
  AREA_WEIGHT[level] * hourShare(day, hour);

export type TrafficShade = 'flowing' | 'light' | 'moderate' | 'heavy' | 'veryHeavy';

/** Colours read like any traffic map: green flowing, through to dark red. */
export const SHADES: Record<TrafficShade, { color: string; label: string; swatch: string }> = {
  flowing: { color: '#16a34a', label: 'Flowing', swatch: 'bg-green-600' },
  light: { color: '#facc15', label: 'Light', swatch: 'bg-yellow-400' },
  moderate: { color: '#f97316', label: 'Moderate', swatch: 'bg-orange-500' },
  heavy: { color: '#dc2626', label: 'Heavy', swatch: 'bg-red-600' },
  veryHeavy: { color: '#7f1d1d', label: 'Very heavy', swatch: 'bg-red-900' },
};

export const shadeFor = (intensity: number): TrafficShade => {
  if (intensity < 0.3) return 'flowing';
  if (intensity < 0.5) return 'light';
  if (intensity < 0.65) return 'moderate';
  if (intensity < 0.8) return 'heavy';
  return 'veryHeavy';
};

/** "08:00" */
export const hourLabel = (hour: number): string => `${String(hour).padStart(2, '0')}:00`;

/**
 * The busiest stretches of the day: runs of hours within 85% of the day's
 * peak, as [from, to) hour pairs, e.g. [[7, 9], [16, 18]].
 */
export const busiestWindows = (day: DayType): Array<[number, number]> => {
  const shares = HOURLY_SHARE[day];
  const threshold = Math.max(...shares) * 0.85;
  const windows: Array<[number, number]> = [];
  let start: number | null = null;
  for (let h = 0; h <= 24; h++) {
    const busy = h < 24 && shares[h] >= threshold;
    if (busy && start === null) start = h;
    if (!busy && start !== null) {
      windows.push([start, h]);
      start = null;
    }
  }
  return windows;
};

/** The day type and hour to show first: now, in the visitor's time. */
export const nowSlot = (date: Date = new Date()): { day: DayType; hour: number } => ({
  day: date.getDay() === 0 || date.getDay() === 6 ? 'weekend' : 'weekday',
  hour: date.getHours(),
});
