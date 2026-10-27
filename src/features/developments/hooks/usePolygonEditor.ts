/**
 * State machine for the owner-side polygon editor.
 *
 * Everything that changes the regions goes through one pure reducer
 * (`polygonEditorReducer`) so it can be unit-tested without a DOM, and so undo
 * and redo are exact: every history entry is a whole `Hotspot[]` snapshot.
 *
 * A pointer drag is ONE history entry: the canvas sends BEGIN_GESTURE on
 * pointer-down, any number of MOVE_* actions while dragging, and END_GESTURE on
 * pointer-up. Typing into a label coalesces the same way via `coalesceKey`.
 *
 * Coordinates are normalised 0–1 against the scene image (see
 * utils/polygonGeometry). Rects store two opposite corners.
 */
import { useCallback, useMemo, useReducer, useRef } from 'react';
import type { Hotspot, HotspotLinkType, HotspotShape } from '../types';
import {
  DUPLICATE_EPSILON,
  MIN_POLYGON_POINTS,
  dedupeConsecutive,
  distance,
  rectToPolygon,
  snapToGrid,
  snapToVertex,
  translatePolygon,
  clampPoint,
  validateHotspotGeometry,
  type HotspotGeometryError,
  type Point,
} from '../utils/polygonGeometry';

export type EditorTool = 'select' | 'rect' | 'polygon';
export type EditorIssueCode = HotspotGeometryError | 'missing_link';

export interface SnapSettings {
  /** Snap dragged/drawn vertices onto other shapes' vertices. */
  vertices: boolean;
  /** Snap onto a regular grid of `gridStep`. */
  grid: boolean;
  gridStep: number;
}

export interface PolygonEditorState {
  hotspots: Hotspot[];
  tool: EditorTool;
  selectedId: string | null;
  selectedVertex: number | null;
  past: Hotspot[][];
  future: Hotspot[][];
  /** Snapshot taken at BEGIN_GESTURE; non-null while a drag is in progress. */
  gestureBase: Hotspot[] | null;
  /** Consecutive commits with the same key share one history entry. */
  coalesceKey: string | null;
  /** Vertices of the polygon being drawn, or null when not drawing. */
  drawing: Point[] | null;
  /** Regions hidden in the editor only (never affects what is saved). */
  hidden: string[];
  snap: SnapSettings;
}

export type PolygonEditorAction =
  | { type: 'LOAD'; hotspots: Hotspot[]; keepSelection?: boolean }
  | { type: 'SET_TOOL'; tool: EditorTool }
  | { type: 'ADD'; id: string; shape: HotspotShape; points: Point[]; linkType: HotspotLinkType }
  | { type: 'SELECT'; id: string | null; vertex?: number | null }
  | { type: 'BEGIN_GESTURE' }
  | { type: 'END_GESTURE' }
  | { type: 'CANCEL_GESTURE' }
  | { type: 'MOVE_SHAPE'; id: string; dx: number; dy: number }
  | { type: 'MOVE_VERTEX'; id: string; index: number; point: Point; radius: number }
  | { type: 'NUDGE'; dx: number; dy: number }
  | { type: 'INSERT_VERTEX'; id: string; edge: number }
  | { type: 'DELETE_VERTEX'; id: string; index: number }
  | { type: 'DELETE_SELECTED' }
  | { type: 'DELETE_SHAPE'; id: string }
  | { type: 'DUPLICATE'; id: string; newId: string }
  | { type: 'PATCH'; id: string; patch: Partial<Pick<Hotspot, 'label' | 'linkType' | 'linkId'>> }
  | { type: 'REORDER'; id: string; direction: 'forward' | 'backward' }
  | { type: 'TOGGLE_HIDDEN'; id: string }
  | { type: 'SET_ALL_HIDDEN'; hidden: boolean }
  | { type: 'SET_SNAP'; snap: Partial<SnapSettings> }
  | { type: 'DRAW_POINT'; point: Point; radius: number; id: string; linkType: HotspotLinkType }
  | { type: 'DRAW_FINISH'; id: string; linkType: HotspotLinkType }
  | { type: 'DRAW_CANCEL' }
  | { type: 'UNDO' }
  | { type: 'REDO' };

export const HISTORY_LIMIT = 100;
export const DUPLICATE_OFFSET = 0.02;
export const DEFAULT_GRID_STEP = 0.01;
/** Smallest rect side (normalised) a drag must cover to create a region. */
export const MIN_RECT_SIDE = 0.005;

export const initialEditorState = (hotspots: Hotspot[] = []): PolygonEditorState => ({
  hotspots,
  tool: 'select',
  selectedId: null,
  selectedVertex: null,
  past: [],
  future: [],
  gestureBase: null,
  coalesceKey: null,
  drawing: null,
  hidden: [],
  snap: { vertices: true, grid: false, gridStep: DEFAULT_GRID_STEP },
});

// --- helpers -----------------------------------------------------------------

/** The editable outline of a hotspot: 4 corners for a rect, the vertices otherwise. */
export const outlineOf = (h: Pick<Hotspot, 'shape' | 'points'>): Point[] =>
  h.shape === 'rect' ? rectToPolygon(h.points as Point[]) : (h.points as Point[]);

const normaliseRect = (a: Point, b: Point): Point[] => [
  [Math.min(a[0], b[0]), Math.min(a[1], b[1])],
  [Math.max(a[0], b[0]), Math.max(a[1], b[1])],
];

/** Snap a point per the settings, ignoring the vertices of `excludeId`. */
export const snapPoint = (
  p: Point,
  hotspots: Hotspot[],
  snap: SnapSettings,
  radius: number,
  excludeId?: string
): Point => {
  const clamped = clampPoint(p);
  if (snap.vertices && radius > 0) {
    const candidates = hotspots.filter((h) => h.id !== excludeId).flatMap(outlineOf);
    const snapped = snapToVertex(clamped, candidates, radius);
    if (snapped !== clamped) return snapped;
  }
  return snap.grid ? snapToGrid(clamped, snap.gridStep) : clamped;
};

const maxZ = (hs: Hotspot[]) => hs.reduce((m, h) => Math.max(m, h.z ?? 0), -1);

const replaceHotspot = (hs: Hotspot[], id: string, fn: (h: Hotspot) => Hotspot): Hotspot[] =>
  hs.map((h) => (h.id === id ? fn(h) : h));

/** Record `next` as the new hotspots, pushing history unless inside a gesture/coalesced run. */
const commit = (s: PolygonEditorState, next: Hotspot[], coalesceKey: string | null = null): PolygonEditorState => {
  if (next === s.hotspots) return s;
  if (s.gestureBase) return { ...s, hotspots: next };
  if (coalesceKey && coalesceKey === s.coalesceKey) return { ...s, hotspots: next, future: [] };
  return {
    ...s,
    hotspots: next,
    past: [...s.past, s.hotspots].slice(-HISTORY_LIMIT),
    future: [],
    coalesceKey,
  };
};

const addHotspot = (
  s: PolygonEditorState,
  id: string,
  shape: HotspotShape,
  rawPoints: Point[],
  linkType: HotspotLinkType
): PolygonEditorState => {
  let points: Point[];
  if (shape === 'rect') {
    if (rawPoints.length < 2) return s;
    points = normaliseRect(clampPoint(rawPoints[0]), clampPoint(rawPoints[1]));
    if (points[1][0] - points[0][0] < MIN_RECT_SIDE || points[1][1] - points[0][1] < MIN_RECT_SIDE) return s;
  } else {
    points = dedupeConsecutive(rawPoints.map(clampPoint));
    if (points.length < MIN_POLYGON_POINTS) return s;
  }
  // A new region is deliberately left UNLINKED: the owner must choose its target.
  const h: Hotspot = { id, shape, points, linkType, linkId: '', z: maxZ(s.hotspots) + 1 };
  return { ...commit(s, [...s.hotspots, h]), selectedId: id, selectedVertex: null, tool: 'select', drawing: null };
};

const moveVertex = (h: Hotspot, base: Hotspot, index: number, p: Point): Hotspot => {
  if (h.shape === 'rect') {
    const corners = outlineOf(base);
    const opposite = corners[(index + 2) % 4];
    return { ...h, points: normaliseRect(p, opposite) };
  }
  const points = h.points.slice();
  if (index < 0 || index >= points.length) return h;
  points[index] = p;
  return { ...h, points };
};

// --- reducer -----------------------------------------------------------------

export function polygonEditorReducer(s: PolygonEditorState, a: PolygonEditorAction): PolygonEditorState {
  switch (a.type) {
    case 'LOAD': {
      const keep = a.keepSelection && s.selectedId && a.hotspots.some((h) => h.id === s.selectedId);
      return {
        ...initialEditorState(a.hotspots),
        tool: s.tool,
        snap: s.snap,
        hidden: s.hidden.filter((id) => a.hotspots.some((h) => h.id === id)),
        selectedId: keep ? s.selectedId : null,
        selectedVertex: keep ? s.selectedVertex : null,
      };
    }
    case 'SET_TOOL':
      return { ...s, tool: a.tool, drawing: null };
    case 'ADD':
      return addHotspot(s, a.id, a.shape, a.points, a.linkType);
    case 'SELECT':
      return { ...s, selectedId: a.id, selectedVertex: a.id ? a.vertex ?? null : null, coalesceKey: null };
    case 'BEGIN_GESTURE':
      if (s.gestureBase) return s;
      return { ...s, gestureBase: s.hotspots, past: [...s.past, s.hotspots].slice(-HISTORY_LIMIT), future: [], coalesceKey: null };
    case 'END_GESTURE': {
      if (!s.gestureBase) return s;
      // A click without movement leaves no history entry behind.
      const unchanged = s.hotspots === s.gestureBase;
      return { ...s, gestureBase: null, past: unchanged ? s.past.slice(0, -1) : s.past, future: unchanged ? s.future : [] };
    }
    case 'CANCEL_GESTURE':
      if (!s.gestureBase) return s;
      return { ...s, hotspots: s.gestureBase, gestureBase: null, past: s.past.slice(0, -1) };
    case 'MOVE_SHAPE': {
      const base = (s.gestureBase ?? s.hotspots).find((h) => h.id === a.id);
      if (!base) return s;
      const points = translatePolygon(base.points as Point[], a.dx, a.dy);
      return commit(s, replaceHotspot(s.hotspots, a.id, (h) => ({ ...h, points })));
    }
    case 'MOVE_VERTEX': {
      const base = (s.gestureBase ?? s.hotspots).find((h) => h.id === a.id);
      if (!base) return s;
      const p = snapPoint(a.point, s.hotspots, s.snap, a.radius, a.id);
      return {
        ...commit(s, replaceHotspot(s.hotspots, a.id, (h) => moveVertex(h, base, a.index, p))),
        selectedId: a.id,
        selectedVertex: a.index,
      };
    }
    case 'NUDGE': {
      const sel = s.hotspots.find((h) => h.id === s.selectedId);
      if (!sel) return s;
      if (s.selectedVertex !== null) {
        const v = outlineOf(sel)[s.selectedVertex];
        if (!v) return s;
        const p = clampPoint([v[0] + a.dx, v[1] + a.dy]);
        const key = `nudge:${sel.id}:${s.selectedVertex}`;
        return commit(s, replaceHotspot(s.hotspots, sel.id, (h) => moveVertex(h, sel, s.selectedVertex!, p)), key);
      }
      // Holding an arrow key is one undo step, like a drag.
      const points = translatePolygon(sel.points as Point[], a.dx, a.dy);
      return commit(s, replaceHotspot(s.hotspots, sel.id, (h) => ({ ...h, points })), `nudge:${sel.id}`);
    }
    case 'INSERT_VERTEX': {
      const h = s.hotspots.find((x) => x.id === a.id);
      if (!h) return s;
      const outline = outlineOf(h);
      const p1 = outline[a.edge];
      const p2 = outline[(a.edge + 1) % outline.length];
      if (!p1 || !p2) return s;
      const mid: Point = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
      const points = [...outline.slice(0, a.edge + 1), mid, ...outline.slice(a.edge + 1)];
      // Inserting into a rect turns it into a free polygon.
      return {
        ...commit(s, replaceHotspot(s.hotspots, a.id, (x) => ({ ...x, shape: 'polygon', points }))),
        selectedId: a.id,
        selectedVertex: a.edge + 1,
      };
    }
    case 'DELETE_VERTEX': {
      const h = s.hotspots.find((x) => x.id === a.id);
      if (!h || h.shape !== 'polygon' || h.points.length <= MIN_POLYGON_POINTS) return s;
      const points = h.points.filter((_, i) => i !== a.index);
      return { ...commit(s, replaceHotspot(s.hotspots, a.id, (x) => ({ ...x, points }))), selectedVertex: null };
    }
    case 'DELETE_SELECTED': {
      if (!s.selectedId) return s;
      if (s.selectedVertex !== null) {
        const h = s.hotspots.find((x) => x.id === s.selectedId);
        // A rect corner or a triangle vertex cannot be removed: delete is a no-op, not a shape delete.
        if (!h || h.shape !== 'polygon' || h.points.length <= MIN_POLYGON_POINTS) return s;
        return polygonEditorReducer(s, { type: 'DELETE_VERTEX', id: s.selectedId, index: s.selectedVertex });
      }
      return polygonEditorReducer(s, { type: 'DELETE_SHAPE', id: s.selectedId });
    }
    case 'DELETE_SHAPE': {
      if (!s.hotspots.some((h) => h.id === a.id)) return s;
      const next = commit(s, s.hotspots.filter((h) => h.id !== a.id));
      return {
        ...next,
        selectedId: s.selectedId === a.id ? null : s.selectedId,
        selectedVertex: s.selectedId === a.id ? null : s.selectedVertex,
        hidden: s.hidden.filter((id) => id !== a.id),
      };
    }
    case 'DUPLICATE': {
      const h = s.hotspots.find((x) => x.id === a.id);
      if (!h) return s;
      const copy: Hotspot = {
        ...h,
        id: a.newId,
        points: translatePolygon(h.points as Point[], DUPLICATE_OFFSET, DUPLICATE_OFFSET),
        z: maxZ(s.hotspots) + 1,
      };
      return { ...commit(s, [...s.hotspots, copy]), selectedId: a.newId, selectedVertex: null };
    }
    case 'PATCH': {
      if (!s.hotspots.some((h) => h.id === a.id)) return s;
      const keys = Object.keys(a.patch).sort().join(',');
      // Typing a label is one undo step per field, not one per keystroke.
      const key = keys === 'label' ? `label:${a.id}` : null;
      return commit(s, replaceHotspot(s.hotspots, a.id, (h) => ({ ...h, ...a.patch })), key);
    }
    case 'REORDER': {
      const sorted = [...s.hotspots].sort((x, y) => (x.z ?? 0) - (y.z ?? 0));
      const i = sorted.findIndex((h) => h.id === a.id);
      const j = a.direction === 'forward' ? i + 1 : i - 1;
      if (i < 0 || j < 0 || j >= sorted.length) return s;
      [sorted[i], sorted[j]] = [sorted[j], sorted[i]];
      const zOf = new Map(sorted.map((h, idx) => [h.id, idx]));
      return commit(s, s.hotspots.map((h) => (h.z === zOf.get(h.id) ? h : { ...h, z: zOf.get(h.id)! })));
    }
    case 'TOGGLE_HIDDEN':
      return {
        ...s,
        hidden: s.hidden.includes(a.id) ? s.hidden.filter((x) => x !== a.id) : [...s.hidden, a.id],
      };
    case 'SET_ALL_HIDDEN':
      return { ...s, hidden: a.hidden ? s.hotspots.map((h) => h.id) : [] };
    case 'SET_SNAP':
      return { ...s, snap: { ...s.snap, ...a.snap } };
    case 'DRAW_POINT': {
      const p = snapPoint(a.point, s.hotspots, s.snap, a.radius);
      const pts = s.drawing ?? [];
      if (pts.length >= MIN_POLYGON_POINTS && distance(p, pts[0]) <= Math.max(a.radius, DUPLICATE_EPSILON)) {
        return addHotspot(s, a.id, 'polygon', pts, a.linkType);
      }
      // The second click of a double-click lands on the last vertex: never add it twice.
      const last = pts[pts.length - 1];
      if (last && distance(p, last) <= Math.max(a.radius / 2, DUPLICATE_EPSILON)) return s;
      return { ...s, drawing: [...pts, p], selectedId: null, selectedVertex: null };
    }
    case 'DRAW_FINISH':
      if (!s.drawing) return s;
      if (dedupeConsecutive(s.drawing).length < MIN_POLYGON_POINTS) return s;
      return addHotspot(s, a.id, 'polygon', s.drawing, a.linkType);
    case 'DRAW_CANCEL':
      return { ...s, drawing: null };
    case 'UNDO': {
      if (s.gestureBase || s.past.length === 0) return s;
      const prev = s.past[s.past.length - 1];
      return {
        ...s,
        hotspots: prev,
        past: s.past.slice(0, -1),
        future: [s.hotspots, ...s.future],
        coalesceKey: null,
        selectedId: prev.some((h) => h.id === s.selectedId) ? s.selectedId : null,
        selectedVertex: null,
      };
    }
    case 'REDO': {
      if (s.gestureBase || s.future.length === 0) return s;
      const [next, ...rest] = s.future;
      return {
        ...s,
        hotspots: next,
        past: [...s.past, s.hotspots],
        future: rest,
        coalesceKey: null,
        selectedId: next.some((h) => h.id === s.selectedId) ? s.selectedId : null,
        selectedVertex: null,
      };
    }
    default:
      return s;
  }
}

// --- validation --------------------------------------------------------------

/** Live issues of one hotspot: geometry first, then a missing link. */
export const hotspotIssues = (h: Hotspot): EditorIssueCode[] => {
  const out: EditorIssueCode[] = [];
  const geo = validateHotspotGeometry(h.shape, h.points);
  if (!geo.isValid && geo.error) out.push(geo.error);
  if (!h.linkId) out.push('missing_link');
  return out;
};

/** Issues keyed by hotspot id; hotspots without issues are omitted. */
export const collectIssues = (hotspots: Hotspot[]): Record<string, EditorIssueCode[]> => {
  const out: Record<string, EditorIssueCode[]> = {};
  for (const h of hotspots) {
    const issues = hotspotIssues(h);
    if (issues.length) out[h.id] = issues;
  }
  return out;
};

export const newHotspotId = (): string =>
  `h_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

// --- hook --------------------------------------------------------------------

export function usePolygonEditor(initial: Hotspot[] = [], genId: () => string = newHotspotId) {
  const [state, dispatch] = useReducer(polygonEditorReducer, initial, initialEditorState);
  const genRef = useRef(genId);
  genRef.current = genId;

  const issues = useMemo(() => collectIssues(state.hotspots), [state.hotspots]);
  const nextId = useCallback(() => genRef.current(), []);

  return {
    state,
    dispatch,
    issues,
    issueCount: Object.keys(issues).length,
    canUndo: state.past.length > 0 && !state.gestureBase,
    canRedo: state.future.length > 0 && !state.gestureBase,
    nextId,
  };
}

export type PolygonEditor = ReturnType<typeof usePolygonEditor>;
