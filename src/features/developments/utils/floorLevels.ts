/**
 * Which floor each drawn region is on, and how far apart the floors are in the
 * picture. A region knows its level through its link: a floor link directly, an
 * apartment link through the apartment's floor. Pure functions on the normalised
 * 0–1 picture coordinates.
 */
import type { DevelopmentFloor, Hotspot } from '../types';
import { polygonBounds, type Point } from './polygonGeometry';
import { MAX_REPEAT_STEP_PCT, MIN_REPEAT_STEP_PCT } from './regionRepeat';

export type FloorLevel = Pick<DevelopmentFloor, 'id' | 'buildingId' | 'level' | 'label'>;
export interface UnitRef { id: string; unitNumber: string; floorId: string }

export interface LevelContext {
  floors: FloorLevel[];
  /** Apartments known so far (this building's, and the template's). */
  units: UnitRef[];
}

/** The regions drawn on one level of a building. */
export interface LevelGroup { level: number; regions: Hotspot[] }

/** The view's regions grouped by the level of their building they link to, lowest first. Unlinked regions are left out. */
export function drawnLevels(hotspots: Hotspot[], buildingId: string, ctx: LevelContext): LevelGroup[] {
  const floorLevel = new Map(ctx.floors.filter((f) => f.buildingId === buildingId).map((f) => [f.id, f.level]));
  const unitFloor = new Map(ctx.units.map((u) => [u.id, u.floorId]));
  const byLevel = new Map<number, Hotspot[]>();
  for (const h of hotspots) {
    if (!h.linkId) continue;
    const floorId = h.linkType === 'floor' ? h.linkId : h.linkType === 'unit' ? unitFloor.get(h.linkId) : undefined;
    const level = floorId ? floorLevel.get(floorId) : undefined;
    if (level === undefined) continue;
    byLevel.set(level, [...(byLevel.get(level) ?? []), h]);
  }
  return [...byLevel.entries()].sort(([a], [b]) => a - b).map(([level, regions]) => ({ level, regions }));
}

export const groupBounds = (regions: Hotspot[]) => polygonBounds(regions.flatMap((h) => h.points as Point[]));

const round1 = (n: number): number => Math.round(n * 10) / 10;
const clampStep = (pct: number) => Math.min(MAX_REPEAT_STEP_PCT, Math.max(MIN_REPEAT_STEP_PCT, round1(pct)));

/**
 * A first floor height (% of the picture height): the distance between the two
 * highest drawn levels (a tall ground floor below them does not count), else
 * the drawn level's own height plus a little for the slab.
 */
export function suggestStepPct(groups: LevelGroup[]): number {
  if (groups.length === 0) return 10;
  const top = groups[groups.length - 1];
  const tb = groupBounds(top.regions);
  if (groups.length > 1) {
    const below = groups[groups.length - 2];
    const bb = groupBounds(below.regions);
    const step = ((bb.minY + bb.maxY) / 2 - (tb.minY + tb.maxY) / 2) / (top.level - below.level);
    if (step > 0) return clampStep(step * 100);
  }
  return clampStep((tb.maxY - tb.minY) * 125);
}

/** The number's last digits within its floor: "A-102" → 2, "C-305" → 5, "12" → 12. Null without digits. */
export function unitPosition(unitNumber: string): number | null {
  const m = /(\d+)\D*$/.exec(unitNumber);
  return m ? Number(m[1]) % 100 : null;
}

/**
 * The apartment on another floor in the same place as `unitNumber`: the one of
 * `candidates` whose number ends the same way (A-102 → A-202, or C-102 in
 * another building). Only a single clear match counts.
 */
export function matchingUnit(unitNumber: string, candidates: UnitRef[]): UnitRef | undefined {
  const pos = unitPosition(unitNumber);
  if (pos === null) return undefined;
  const hits = candidates.filter((u) => unitPosition(u.unitNumber) === pos);
  return hits.length === 1 ? hits[0] : undefined;
}

/** The floor height field: a number within the repeat limits, comma or point. */
export function parseStepPct(raw: string): { ok: true; value: number } | { ok: false } {
  const n = Number(raw.trim().replace(',', '.'));
  if (raw.trim() === '' || !Number.isFinite(n) || n < MIN_REPEAT_STEP_PCT || n > MAX_REPEAT_STEP_PCT) return { ok: false };
  return { ok: true, value: n };
}
