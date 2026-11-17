/**
 * Where each unit gallery photo was taken on the unit's floor plan, and which
 * way the camera faced — the same "photo spots" sellers place on a listing's
 * plan. Pure parsing here; the update lives in unitAdminService.
 */
import { ValidationError } from './developmentService';

export interface UnitPhotoSpot {
  /** Percent of the plan's width, 0–100. */
  x: number;
  /** Percent of the plan's height, 0–100. */
  y: number;
  /** Degrees clockwise from up, 0–360. */
  angle: number;
}

/** One photo's spot, or null to take it off the plan. */
export interface UnitPhotoSpotChange {
  url: string;
  spot: UnitPhotoSpot | null;
}

export type SpotParseResult = { ok: true; value: UnitPhotoSpotChange[] } | { ok: false; error: string };

const inRange = (v: unknown, max: number): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= max;

const parseSpot = (raw: unknown): UnitPhotoSpot | null | undefined => {
  if (raw === null) return null;
  if (!raw || typeof raw !== 'object') return undefined;
  const { x, y, angle } = raw as Record<string, unknown>;
  if (!inRange(x, 100) || !inRange(y, 100) || !inRange(angle, 360)) return undefined;
  return { x, y, angle: angle === 360 ? 0 : angle };
};

/**
 * Check a client's `spots` body against the unit's gallery: an array of
 * `{ url, spot }`, each url a photo of this gallery (once), each spot inside
 * the plan or null.
 */
export const parseUnitPhotoSpots = (body: unknown, galleryUrls: readonly string[]): SpotParseResult => {
  if (!Array.isArray(body)) return { ok: false, error: 'spots must be an array' };
  if (body.length > galleryUrls.length) return { ok: false, error: 'More spots than photos' };
  const known = new Set(galleryUrls);
  const seen = new Set<string>();
  const value: UnitPhotoSpotChange[] = [];
  for (const item of body) {
    const url = item && typeof item === 'object' ? (item as Record<string, unknown>).url : undefined;
    if (typeof url !== 'string' || !known.has(url)) return { ok: false, error: 'Each spot must name a photo of this unit' };
    if (seen.has(url)) return { ok: false, error: 'A photo is listed twice' };
    seen.add(url);
    const spot = parseSpot((item as Record<string, unknown>).spot);
    if (spot === undefined) return { ok: false, error: 'A spot needs x and y between 0 and 100 and an angle between 0 and 360' };
    value.push({ url, spot });
  }
  return { ok: true, value };
};

/** Same as {@link parseUnitPhotoSpots}, throwing a 400 on bad input. */
export const assertUnitPhotoSpots = (body: unknown, galleryUrls: readonly string[]): UnitPhotoSpotChange[] => {
  const result = parseUnitPhotoSpots(body, galleryUrls);
  if (result.ok === false) throw new ValidationError(result.error, { code: 'FIELD_INVALID', field: 'spots' });
  return result.value;
};
