import { apiRequest } from '@/src/shared/api';

export type RoadKind = 'motorway' | 'trunk' | 'primary' | 'secondary' | 'tertiary';
export type SourceKind = RoadKind | 'street' | 'railway' | 'tram' | 'airport' | 'nightclub' | 'bar';
export type NoiseBand = 'quiet' | 'moderate' | 'noisy' | 'veryNoisy';
export type TrafficLevel = 'calm' | 'moderate' | 'busy';

export interface NoiseLevel {
  /** Estimated LAeq, dB. */
  db: number;
  band: NoiseBand;
}

export interface NoiseSourceSummary {
  kind: SourceKind;
  name?: string;
  distanceM: number;
}

export interface Surroundings {
  noise: { day: NoiseLevel; night: NoiseLevel; sources: NoiseSourceSummary[] };
  traffic: {
    level: TrafficLevel;
    /** The street closest to the home: usually the one it is on. */
    nearestStreet: { kind: RoadKind | 'street'; name?: string; distanceM: number } | null;
    nearestMainRoad: { kind: RoadKind; name?: string; distanceM: number } | null;
  };
}

export type SurroundingsResponse = ({ status: 'ok' } & Surroundings) | { status: 'no-location' };

export async function getSurroundings(propertyId: string): Promise<SurroundingsResponse> {
  if (!propertyId || propertyId.trim() === '') {
    throw new Error('Property ID is required');
  }
  const data = await apiRequest<unknown>(`/properties/${propertyId}/surroundings`);
  return validateSurroundingsResponse(data);
}

const ROAD_KINDS: readonly string[] = ['motorway', 'trunk', 'primary', 'secondary', 'tertiary'];
const SOURCE_KINDS: readonly string[] = [...ROAD_KINDS, 'street', 'railway', 'tram', 'airport', 'nightclub', 'bar'];
const BANDS: readonly string[] = ['quiet', 'moderate', 'noisy', 'veryNoisy'];
const LEVELS: readonly string[] = ['calm', 'moderate', 'busy'];

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object';
const isDistance = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const isLevel = (v: unknown): v is NoiseLevel =>
  isRecord(v) && typeof v.db === 'number' && Number.isFinite(v.db) && BANDS.includes(v.band as string);
const isSource = (v: unknown): v is NoiseSourceSummary =>
  isRecord(v) && SOURCE_KINDS.includes(v.kind as string) && isDistance(v.distanceM) &&
  (v.name === undefined || typeof v.name === 'string');

/** Validate the shape at the ingestion boundary; drop malformed sources. */
export function validateSurroundingsResponse(data: unknown): SurroundingsResponse {
  if (!isRecord(data)) throw new Error('Invalid surroundings response');
  if (data.status === 'no-location') return { status: 'no-location' };
  const { noise, traffic } = data;
  if (data.status !== 'ok' || !isRecord(noise) || !isRecord(traffic)) throw new Error('Invalid surroundings response');
  if (!isLevel(noise.day) || !isLevel(noise.night) || !LEVELS.includes(traffic.level as string)) {
    throw new Error('Invalid surroundings response');
  }
  const road = traffic.nearestMainRoad;
  const nearestMainRoad = isSource(road) && ROAD_KINDS.includes(road.kind)
    ? (road as Surroundings['traffic']['nearestMainRoad'])
    : null;
  const street = traffic.nearestStreet;
  const nearestStreet = isSource(street) && (street.kind === 'street' || ROAD_KINDS.includes(street.kind))
    ? (street as Surroundings['traffic']['nearestStreet'])
    : null;
  return {
    status: 'ok',
    noise: {
      day: noise.day,
      night: noise.night,
      sources: Array.isArray(noise.sources) ? noise.sources.filter(isSource) : [],
    },
    traffic: { level: traffic.level as TrafficLevel, nearestStreet, nearestMainRoad },
  };
}
