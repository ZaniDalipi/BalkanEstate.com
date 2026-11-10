/**
 * An estimate of the sound level at a home, day and night, from the roads,
 * railways, airports and nightlife around it. Pure.
 *
 * Not a measurement: a screening model in the spirit of strategic noise maps.
 *   - roads and railways are line sources: a reference level at 10 m, minus
 *     3 dB per doubling of distance, minus 2 dB per 100 m for the buildings
 *     and ground in between
 *   - airports and venues are point sources: 6 dB per doubling of distance
 *   - levels add on an energy basis, over a background of a quiet town
 * Levels are A-weighted equivalent levels (LAeq, dB) for day (07–23) and
 * night (23–07). WHO guidance: road traffic below 53 dB Lden, 45 dB at night.
 */

import type { NoiseSource, RoadKind, SourceKind } from './osmSources';
import { ROAD_KINDS } from './osmSources';

export type NoiseBand = 'quiet' | 'moderate' | 'noisy' | 'veryNoisy';
export type Period = 'day' | 'night';
export type TrafficLevel = 'calm' | 'moderate' | 'busy';

interface SourceProfile {
  /** LAeq by day at the reference distance. */
  dayDb: number;
  /** Night level relative to day. */
  nightOffset: number;
  shape: 'line' | 'point';
  referenceM: number;
}

export const SOURCE_PROFILES: Record<SourceKind, SourceProfile> = {
  motorway: { dayDb: 77, nightOffset: -7, shape: 'line', referenceM: 10 },
  trunk: { dayDb: 74, nightOffset: -8, shape: 'line', referenceM: 10 },
  primary: { dayDb: 71, nightOffset: -9, shape: 'line', referenceM: 10 },
  secondary: { dayDb: 67, nightOffset: -10, shape: 'line', referenceM: 10 },
  tertiary: { dayDb: 63, nightOffset: -10, shape: 'line', referenceM: 10 },
  street: { dayDb: 56, nightOffset: -10, shape: 'line', referenceM: 10 },
  railway: { dayDb: 70, nightOffset: -5, shape: 'line', referenceM: 10 },
  tram: { dayDb: 64, nightOffset: -12, shape: 'line', referenceM: 10 },
  airport: { dayDb: 62, nightOffset: -10, shape: 'point', referenceM: 1000 },
  nightclub: { dayDb: 45, nightOffset: 13, shape: 'point', referenceM: 20 },
  bar: { dayDb: 45, nightOffset: 7, shape: 'point', referenceM: 20 },
};

export const BACKGROUND_DB: Record<Period, number> = { day: 42, night: 33 };

/** Upper bounds (exclusive) of quiet, moderate and noisy; above is very noisy. */
export const BAND_LIMITS: Record<Period, [number, number, number]> = {
  day: [45, 55, 65],
  night: [35, 45, 55],
};

/** Excess attenuation of line sources, dB per metre. */
const EXCESS_DB_PER_M = 0.02;

/** Only the loudest few groups are summed; the rest add nothing audible. */
const MAX_SUMMED = 5;

/** Sources quieter than this by day are not worth naming. */
const NOTABLE_DAY_DB = 45;

export interface NoiseEstimate {
  day: { db: number; band: NoiseBand };
  night: { db: number; band: NoiseBand };
  /** The loudest sources, loudest first. */
  sources: Array<{ kind: SourceKind; name?: string; distanceM: number }>;
}

export interface TrafficEstimate {
  level: TrafficLevel;
  /** The street closest to the home (any class): usually the one it is on. */
  nearestStreet: { kind: RoadKind | 'street'; name?: string; distanceM: number } | null;
  /** Closest motorway…secondary road (else tertiary), if any is in reach. */
  nearestMainRoad: { kind: RoadKind; name?: string; distanceM: number } | null;
}

/** A source's level at the home, for one period. */
export const levelAt = (kind: SourceKind, distanceM: number, period: Period): number => {
  const p = SOURCE_PROFILES[kind];
  const d = Math.max(distanceM, p.referenceM);
  const spread = p.shape === 'line'
    ? 10 * Math.log10(d / p.referenceM) + EXCESS_DB_PER_M * (d - p.referenceM)
    : 20 * Math.log10(d / p.referenceM);
  return p.dayDb + (period === 'night' ? p.nightOffset : 0) - spread;
};

/** Energy sum of levels in dB. */
export const addLevels = (levels: number[]): number =>
  10 * Math.log10(levels.reduce((sum, l) => sum + 10 ** (l / 10), 0));

export const bandFor = (db: number, period: Period): NoiseBand => {
  const [quiet, moderate, noisy] = BAND_LIMITS[period];
  if (db < quiet) return 'quiet';
  if (db < moderate) return 'moderate';
  if (db < noisy) return 'noisy';
  return 'veryNoisy';
};

/** The nearest piece of each road or line: one source per group. */
const nearestPerGroup = (sources: NoiseSource[]): NoiseSource[] => {
  const best = new Map<string, NoiseSource>();
  for (const s of sources) {
    const seen = best.get(s.group);
    if (!seen || s.distanceM < seen.distanceM) best.set(s.group, s);
  }
  return [...best.values()];
};

const periodLevel = (sources: NoiseSource[], period: Period): number => {
  const loudest = sources
    .map((s) => levelAt(s.kind, s.distanceM, period))
    .sort((a, b) => b - a)
    .slice(0, MAX_SUMMED);
  return Math.round(addLevels([BACKGROUND_DB[period], ...loudest]));
};

export const estimateNoise = (all: NoiseSource[]): NoiseEstimate => {
  const sources = nearestPerGroup(all);
  const day = periodLevel(sources, 'day');
  const night = periodLevel(sources, 'night');
  const notable = sources
    .map((s) => ({ s, db: Math.max(levelAt(s.kind, s.distanceM, 'day'), levelAt(s.kind, s.distanceM, 'night')) }))
    .filter((x) => x.db >= NOTABLE_DAY_DB)
    .sort((a, b) => b.db - a.db)
    .slice(0, 3)
    .map(({ s }) => ({ kind: s.kind, ...(s.name ? { name: s.name } : {}), distanceM: s.distanceM }));

  return {
    day: { db: day, band: bandFor(day, 'day') },
    night: { db: night, band: bandFor(night, 'night') },
    sources: notable,
  };
};

const MAIN_ROADS: readonly RoadKind[] = ['motorway', 'trunk', 'primary', 'secondary'];

/**
 * How busy the streets around the home typically are, from the class of the
 * nearest roads: a main road at the door is busy, one a few blocks off is not.
 */
export const estimateTraffic = (all: NoiseSource[]): TrafficEstimate => {
  const groups = nearestPerGroup(all);
  const roads = groups.filter((s) => (ROAD_KINDS as readonly string[]).includes(s.kind));
  const street = groups
    .filter((s) => s.kind === 'street' || (ROAD_KINDS as readonly string[]).includes(s.kind))
    .sort((a, b) => a.distanceM - b.distanceM)[0];
  const within = (kinds: readonly SourceKind[], m: number) => roads.some((r) => kinds.includes(r.kind) && r.distanceM <= m);

  const level: TrafficLevel =
    within(['motorway', 'trunk', 'primary'], 150) || within(['secondary'], 60)
      ? 'busy'
      : within(['motorway', 'trunk', 'primary', 'secondary'], 400) || within(['tertiary'], 100)
        ? 'moderate'
        : 'calm';

  const byDistance = [...roads].sort((a, b) => a.distanceM - b.distanceM);
  const nearest = byDistance.find((r) => MAIN_ROADS.includes(r.kind as RoadKind)) ?? byDistance[0];

  return {
    level,
    nearestStreet: street
      ? { kind: street.kind as RoadKind | 'street', ...(street.name ? { name: street.name } : {}), distanceM: street.distanceM }
      : null,
    nearestMainRoad: nearest
      ? { kind: nearest.kind as RoadKind, ...(nearest.name ? { name: nearest.name } : {}), distanceM: nearest.distanceM }
      : null,
  };
};
