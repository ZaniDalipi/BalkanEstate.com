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

/** One road near the home, for the typical-traffic map. */
export interface RoadLine {
  kind: RoadKind | 'street';
  name?: string;
  /** [lat, lng] pairs. */
  points: Array<[number, number]>;
}

export interface Surroundings {
  noise: { day: NoiseLevel; night: NoiseLevel; sources: NoiseSourceSummary[] };
  traffic: {
    level: TrafficLevel;
    /** The street closest to the home: usually the one it is on. */
    nearestStreet: { kind: RoadKind | 'street'; name?: string; distanceM: number } | null;
    nearestMainRoad: { kind: RoadKind; name?: string; distanceM: number } | null;
  };
  /** Road shapes within ~600 m; empty from servers older than the map. */
  roads: RoadLine[];
}

export type SurroundingsResponse =
  | ({ status: 'ok' } & Surroundings)
  | { status: 'no-location' }
  /** Still being looked up on the server; ask again shortly. */
  | { status: 'pending' };

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

/** At most this many roads are drawn; the server sends the nearest first. */
const MAX_ROADS = 600;

const isLatLng = (p: unknown): p is [number, number] =>
  Array.isArray(p) && p.length === 2 &&
  typeof p[0] === 'number' && Math.abs(p[0]) <= 90 &&
  typeof p[1] === 'number' && Math.abs(p[1]) <= 180;

const toRoad = (v: unknown): RoadLine | null => {
  if (!isRecord(v) || !(v.kind === 'street' || ROAD_KINDS.includes(v.kind as string)) || !Array.isArray(v.points)) return null;
  const points = v.points.filter(isLatLng);
  if (points.length < 2) return null;
  return { kind: v.kind as RoadLine['kind'], ...(typeof v.name === 'string' && v.name ? { name: v.name } : {}), points };
};

/** Validate the shape at the ingestion boundary; drop malformed sources and roads. */
export function validateSurroundingsResponse(data: unknown): SurroundingsResponse {
  if (!isRecord(data)) throw new Error('Invalid surroundings response');
  if (data.status === 'no-location' || data.status === 'pending') return { status: data.status };
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
    roads: Array.isArray(data.roads)
      ? data.roads.slice(0, MAX_ROADS).map(toRoad).filter((r): r is RoadLine => r !== null)
      : [],
  };
}
