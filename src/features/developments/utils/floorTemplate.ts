/**
 * "Add floors automatically": one region per floor of a building, laid out like
 * a building the owner has already drawn (the same side of it first). The
 * template's floor regions are matched to this building's floors by level;
 * levels the template does not have are placed at its floor spacing. Pure
 * functions on the normalised 0–1 picture coordinates.
 */
import type { DevelopmentFloor, Hotspot, Scene } from '../types';
import { polygonBounds, type Point } from './polygonGeometry';
import { transferHotspots, type TransferOptions } from './regionTransfer';

export type FloorLevel = Pick<DevelopmentFloor, 'id' | 'buildingId' | 'level' | 'label'>;
type SceneSide = Pick<Scene, 'viewDirection' | 'viewName'>;

/** Same camera side; two custom views count as the same side only when they share a name. */
export function isSameSide(a: SceneSide, b: SceneSide): boolean {
  if (a.viewDirection !== b.viewDirection) return false;
  if (a.viewDirection !== 'custom') return true;
  return (a.viewName ?? '').trim().toLowerCase() === (b.viewName ?? '').trim().toLowerCase();
}

interface Band { hotspot: Hotspot; level: number; top: number; bottom: number }

const boundsOf = (h: Hotspot) => polygonBounds(h.points as Point[]);

/** A view's regions that link to a floor of the view's own building, lowest level first, one per level. */
function bandsOf(hotspots: Hotspot[], buildingId: string, floors: FloorLevel[]): Band[] {
  const levelOf = new Map(floors.filter((f) => f.buildingId === buildingId).map((f) => [f.id, f.level]));
  const byLevel = new Map<number, Band>();
  for (const h of hotspots) {
    const level = h.linkType === 'floor' ? levelOf.get(h.linkId) : undefined;
    if (level === undefined || byLevel.has(level)) continue;
    const b = boundsOf(h);
    byLevel.set(level, { hotspot: h, level, top: b.minY, bottom: b.maxY });
  }
  return [...byLevel.values()].sort((a, b) => a.level - b.level);
}

export interface FloorTemplate { scene: Scene; floors: number; sameSide: boolean; sameBuilding: boolean }

/**
 * Building views that can serve as a template for `current`: they have at least
 * one floor region. Same side first, then other buildings before this one's other
 * sides (another building's same side is the closest match), then the most floors.
 */
export function floorTemplates(scenes: Scene[], current: Scene, floors: FloorLevel[]): FloorTemplate[] {
  return scenes
    .filter((s) => s.id !== current.id && s.targetType === 'building')
    .map((s) => ({
      scene: s,
      floors: bandsOf(s.draft?.hotspots ?? [], s.targetId, floors).length,
      sameSide: isSameSide(s, current),
      sameBuilding: s.targetId === current.targetId,
    }))
    .filter((t) => t.floors > 0)
    .sort((a, b) => Number(b.sameSide) - Number(a.sameSide) || Number(a.sameBuilding) - Number(b.sameBuilding) || b.floors - a.floors);
}

/** Vertical distance between neighbouring levels in the template (one band's height when it has one floor). */
function floorStep(bands: Band[]): number {
  const first = bands[0];
  const last = bands[bands.length - 1];
  const mid = (b: Band) => (b.top + b.bottom) / 2;
  if (bands.length > 1 && last.level > first.level) {
    const step = (mid(first) - mid(last)) / (last.level - first.level);
    if (step > 0) return step;
  }
  return first.bottom - first.top;
}

/** The band an apartment outline belongs to: the one holding its middle, else the nearest. */
function bandOfUnit(h: Hotspot, bands: Band[]): Band {
  const b = boundsOf(h);
  const y = (b.minY + b.maxY) / 2;
  const inside = bands.find((band) => y >= band.top && y <= band.bottom);
  if (inside) return inside;
  return bands.reduce((best, band) => (Math.abs((band.top + band.bottom) / 2 - y) < Math.abs((best.top + best.bottom) / 2 - y) ? band : best));
}

export interface AutoFloorsInput {
  template: Scene;
  /** Every floor of the development (the template's and this building's). */
  floors: FloorLevel[];
  /** The building being drawn. */
  buildingId: string;
  /** Regions already on the view: floors linked there are left as they are. */
  existing: Hotspot[];
  /** Also copy the template's apartment outlines, unlinked. */
  withUnits: boolean;
  adjust: TransferOptions;
  nextId: () => string;
}

export type AutoFloorsResult =
  | { ok: true; hotspots: Hotspot[]; floors: number; units: number; estimated: number; alreadyThere: number; outside: number }
  | { ok: false; problem: 'noFloors' | 'noTemplate' | 'outside' };

const EPS = 1e-9;
const insidePicture = (pts: Point[]) => pts.every(([x, y]) => x >= -EPS && x <= 1 + EPS && y >= -EPS && y <= 1 + EPS);

export function buildFloorRegions(input: AutoFloorsInput): AutoFloorsResult {
  const targetFloors = input.floors.filter((f) => f.buildingId === input.buildingId).sort((a, b) => a.level - b.level);
  if (targetFloors.length === 0) return { ok: false, problem: 'noFloors' };
  const source = input.template.draft?.hotspots ?? [];
  const rawBands = bandsOf(source, input.template.targetId, input.floors);
  if (rawBands.length === 0) return { ok: false, problem: 'noTemplate' };

  // Fit the template (mirror, size, move) first, so the floor spacing follows it.
  const used = [...rawBands.map((b) => b.hotspot), ...(input.withUnits ? source.filter((h) => h.linkType === 'unit') : [])];
  const fitted = transferHotspots(used, input.adjust, true, used.map((h) => h.id));
  if (fitted.ok === false) return { ok: false, problem: 'outside' };
  const byId = new Map(fitted.hotspots.map((h) => [h.id, h]));
  const bands = bandsOf(rawBands.map((b) => byId.get(b.hotspot.id) as Hotspot), input.template.targetId, input.floors);
  const units = fitted.hotspots.filter((h) => h.linkType === 'unit');
  const unitsOf = new Map<Band, Hotspot[]>(bands.map((b) => [b, []]));
  for (const u of units) unitsOf.get(bandOfUnit(u, bands))?.push(u);

  const step = floorStep(bands);
  const linked = new Set(input.existing.filter((h) => h.linkType === 'floor').map((h) => h.linkId));
  const out: Hotspot[] = [];
  let floors = 0, unitCount = 0, estimated = 0, alreadyThere = 0, outside = 0;
  for (const floor of targetFloors) {
    if (linked.has(floor.id)) { alreadyThere += 1; continue; }
    const band = bands.reduce((best, b) => (Math.abs(b.level - floor.level) < Math.abs(best.level - floor.level) ? b : best));
    const dy = -(floor.level - band.level) * step;
    const move = (h: Hotspot): Point[] => (h.points as Point[]).map(([x, y]) => [x, y + dy]);
    const points = move(band.hotspot);
    if (!insidePicture(points)) { outside += 1; continue; }
    out.push({ ...band.hotspot, id: input.nextId(), points, linkType: 'floor', linkId: floor.id, label: undefined });
    floors += 1;
    if (band.level !== floor.level) estimated += 1;
    for (const u of unitsOf.get(band) ?? []) {
      const pts = move(u);
      if (!insidePicture(pts)) continue;
      out.push({ ...u, id: input.nextId(), points: pts, linkId: '', label: undefined });
      unitCount += 1;
    }
  }
  return { ok: true, hotspots: out, floors, units: unitCount, estimated, alreadyThere, outside };
}
