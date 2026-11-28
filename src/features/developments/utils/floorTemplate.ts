/**
 * "Add floors automatically": the floors of a building that have no regions on
 * a view get the outlines of a drawn level — this view's own top floor, or the
 * same side of a building drawn before — moved up or down by the floor height.
 * Each copy is linked to the apartment with the same number ending on its floor
 * (A-102 → A-202), floor regions to their floor. Pure functions.
 */
import type { Hotspot, Scene } from '../types';
import { polygonBounds, type Point } from './polygonGeometry';
import { drawnLevels, matchingUnit, type FloorLevel, type LevelContext, type LevelGroup } from './floorLevels';

type SceneSide = Pick<Scene, 'viewDirection' | 'viewName'>;

/** Same camera side; two custom views count as the same side only when they share a name. */
export function isSameSide(a: SceneSide, b: SceneSide): boolean {
  if (a.viewDirection !== b.viewDirection) return false;
  if (a.viewDirection !== 'custom') return true;
  return (a.viewName ?? '').trim().toLowerCase() === (b.viewName ?? '').trim().toLowerCase();
}

export interface FloorTemplate { scene: Scene; levels: number; sameSide: boolean }

/**
 * Views of other buildings that can serve as a template: they have regions
 * linked to apartments or floors of their building. Same side first, then the
 * most levels drawn.
 */
export function floorTemplates(scenes: Scene[], current: Scene, ctx: LevelContext): FloorTemplate[] {
  return scenes
    .filter((s) => s.targetType === 'building' && s.targetId !== current.targetId)
    .map((s) => ({ scene: s, levels: drawnLevels(s.draft?.hotspots ?? [], s.targetId, ctx).length, sameSide: isSameSide(s, current) }))
    .filter((t) => t.levels > 0)
    .sort((a, b) => Number(b.sameSide) - Number(a.sameSide) || b.levels - a.levels);
}

export interface FillInput {
  /** Drawn levels to copy from (this view's, or a fitted template's). */
  groups: LevelGroup[];
  /** The floors of the building being drawn. */
  floors: FloorLevel[];
  /** Levels that already have regions on this view; they are left as they are. */
  drawn: Set<number>;
  /** Floor height, % of the picture height. */
  stepPct: number;
  /** Also outline each whole added floor, linked to the floor (under its apartments). */
  floorOutline?: boolean;
  /** Every apartment known (for the source numbers and this building's floors). */
  units: LevelContext['units'];
  nextId: () => string;
}

export interface FillResult {
  hotspots: Hotspot[];
  /** Floors that got regions, lowest first (labels). */
  added: string[];
  /** Of those, how many came from another level by the floor height (not drawn at that level). */
  estimated: number;
  /** Apartment copies linked to an apartment, and those left to link. */
  linked: number;
  toLink: number;
  /** Floors left out because their copies would leave the picture. */
  outside: string[];
}

const EPS = 1e-9;
const inside = (pts: Point[]) => pts.every(([x, y]) => x >= -EPS && x <= 1 + EPS && y >= -EPS && y <= 1 + EPS);
/** The nearest drawn level; on a tie the one below (it is usually the better-drawn). */
const nearest = (groups: LevelGroup[], level: number) =>
  groups.reduce((best, g) => (Math.abs(g.level - level) < Math.abs(best.level - level) ? g : best));

export function fillFloors(input: FillInput): FillResult {
  const result: FillResult = { hotspots: [], added: [], estimated: 0, linked: 0, toLink: 0, outside: [] };
  if (input.groups.length === 0) return result;
  const numberOf = new Map(input.units.map((u) => [u.id, u.unitNumber]));
  const step = input.stepPct / 100;
  const sorted = [...input.floors].sort((a, b) => a.level - b.level);

  // The ground floor (shops, lobby) and basements are never guessed from the floors above.
  const lowest = Math.min(...input.groups.map((g) => g.level));
  for (const floor of sorted) {
    if (input.drawn.has(floor.level)) continue;
    if (floor.level <= 0 && floor.level < lowest) continue;
    const group = nearest(input.groups, floor.level);
    const dy = -(floor.level - group.level) * step;
    const moved = group.regions.map((h) => ({ h, points: (h.points as Point[]).map(([x, y]) => [x, y + dy] as Point) }));
    if (moved.some((m) => !inside(m.points))) { result.outside.push(floor.label); continue; }
    const onFloor = input.units.filter((u) => u.floorId === floor.id);
    if (input.floorOutline && !group.regions.some((h) => h.linkType === 'floor')) {
      const b = polygonBounds(moved.flatMap((m) => m.points));
      const z = Math.min(...group.regions.map((h) => h.z)) - 1;
      result.hotspots.push({ id: input.nextId(), shape: 'rect', points: [[b.minX, b.minY], [b.maxX, b.maxY]], linkType: 'floor', linkId: floor.id, z });
    }
    for (const { h, points } of moved) {
      let linkId = '';
      if (h.linkType === 'floor') linkId = floor.id;
      else if (h.linkType === 'unit') {
        const own = numberOf.get(h.linkId);
        linkId = (own && matchingUnit(own, onFloor)?.id) || '';
        if (linkId) result.linked += 1;
        else result.toLink += 1;
      }
      result.hotspots.push({ ...h, id: input.nextId(), points, linkId, label: undefined });
    }
    result.added.push(floor.label);
    if (group.level !== floor.level) result.estimated += 1;
  }
  return result;
}
