import { describe, it, expect } from 'vitest';
import {
  polygonEditorReducer as reduce,
  initialEditorState,
  collectIssues,
  hotspotIssues,
  outlineOf,
  DUPLICATE_OFFSET,
  type PolygonEditorAction,
  type PolygonEditorState,
} from './usePolygonEditor';
import { MAX_HOTSPOTS_PER_SCENE, type Hotspot } from '../types';
import type { Point } from '../utils/polygonGeometry';

const square = (id: string, x = 0.1, y = 0.1, s = 0.2, linkId = 'u1'): Hotspot => ({
  id,
  shape: 'polygon',
  points: [
    [x, y],
    [x + s, y],
    [x + s, y + s],
    [x, y + s],
  ],
  linkType: 'unit',
  linkId,
  z: 0,
});

const run = (s: PolygonEditorState, ...actions: PolygonEditorAction[]) => actions.reduce(reduce, s);
const loaded = (...hs: Hotspot[]) => reduce(initialEditorState(), { type: 'LOAD', hotspots: hs });

describe('polygonEditorReducer — creation', () => {
  it('adds a rect from a drag and leaves it unlinked', () => {
    const s = run(loaded(), {
      type: 'ADD',
      id: 'r1',
      shape: 'rect',
      points: [
        [0.6, 0.6],
        [0.2, 0.3],
      ],
      linkType: 'unit',
    });
    expect(s.hotspots).toHaveLength(1);
    expect(s.hotspots[0].points).toEqual([
      [0.2, 0.3],
      [0.6, 0.6],
    ]);
    expect(s.hotspots[0].linkId).toBe('');
    expect(s.selectedId).toBe('r1');
    expect(collectIssues(s.hotspots).r1).toEqual(['missing_link']);
  });

  it('ignores a tiny rect drag', () => {
    const s = run(loaded(), {
      type: 'ADD',
      id: 'r1',
      shape: 'rect',
      points: [
        [0.5, 0.5],
        [0.501, 0.501],
      ],
      linkType: 'unit',
    });
    expect(s.hotspots).toHaveLength(0);
  });

  it('closes a polygon by clicking its first point', () => {
    const pt = (point: Point): PolygonEditorAction => ({ type: 'DRAW_POINT', point, radius: 0.02, id: 'p1', linkType: 'unit' });
    let s = run(loaded(), { type: 'SET_TOOL', tool: 'polygon' }, pt([0.1, 0.1]), pt([0.5, 0.1]), pt([0.5, 0.5]));
    expect(s.drawing).toHaveLength(3);
    s = reduce(s, pt([0.105, 0.102]));
    expect(s.drawing).toBeNull();
    expect(s.hotspots).toHaveLength(1);
    expect(s.hotspots[0].points).toHaveLength(3);
    expect(s.tool).toBe('select');
    expect(s.past).toHaveLength(1);
  });

  it('never adds a duplicate vertex from a double-click', () => {
    const pt = (point: Point): PolygonEditorAction => ({ type: 'DRAW_POINT', point, radius: 0.02, id: 'p1', linkType: 'unit' });
    let s = run(loaded(), pt([0.1, 0.1]), pt([0.5, 0.1]), pt([0.5, 0.5]), pt([0.5, 0.5]), pt([0.5001, 0.5]));
    expect(s.drawing).toHaveLength(3);
    s = reduce(s, { type: 'DRAW_FINISH', id: 'p1', linkType: 'unit' });
    expect(s.hotspots[0].points).toHaveLength(3);
    expect(hotspotIssues({ ...s.hotspots[0], linkId: 'x' })).toEqual([]);
  });

  it('DRAW_FINISH needs at least 3 points; Escape (DRAW_CANCEL) discards', () => {
    const pt = (point: Point): PolygonEditorAction => ({ type: 'DRAW_POINT', point, radius: 0.02, id: 'p1', linkType: 'unit' });
    let s = run(loaded(), pt([0.1, 0.1]), pt([0.5, 0.1]), { type: 'DRAW_FINISH', id: 'p1', linkType: 'unit' });
    expect(s.hotspots).toHaveLength(0);
    expect(s.drawing).toHaveLength(2);
    s = reduce(s, { type: 'DRAW_CANCEL' });
    expect(s.drawing).toBeNull();
  });
});

describe('polygonEditorReducer — history', () => {
  it('coalesces a whole drag into one undo entry', () => {
    let s = loaded(square('a'));
    s = run(
      s,
      { type: 'SELECT', id: 'a' },
      { type: 'BEGIN_GESTURE' },
      { type: 'MOVE_SHAPE', id: 'a', dx: 0.01, dy: 0 },
      { type: 'MOVE_SHAPE', id: 'a', dx: 0.05, dy: 0.02 },
      { type: 'MOVE_SHAPE', id: 'a', dx: 0.1, dy: 0.1 },
      { type: 'END_GESTURE' }
    );
    expect(s.past).toHaveLength(1);
    expect(s.hotspots[0].points[0][0]).toBeCloseTo(0.2);
    s = reduce(s, { type: 'UNDO' });
    expect(s.hotspots[0].points[0]).toEqual([0.1, 0.1]);
    s = reduce(s, { type: 'REDO' });
    expect(s.hotspots[0].points[0][0]).toBeCloseTo(0.2);
  });

  it('a click without movement leaves no history entry', () => {
    const s = run(loaded(square('a')), { type: 'BEGIN_GESTURE' }, { type: 'END_GESTURE' });
    expect(s.past).toHaveLength(0);
  });

  it('CANCEL_GESTURE restores the pre-drag shape', () => {
    const s = run(loaded(square('a')), { type: 'BEGIN_GESTURE' }, { type: 'MOVE_SHAPE', id: 'a', dx: 0.3, dy: 0 }, { type: 'CANCEL_GESTURE' });
    expect(s.hotspots[0].points[0]).toEqual([0.1, 0.1]);
    expect(s.past).toHaveLength(0);
  });

  it('typing a label is one undo step; a new edit clears redo', () => {
    let s = run(
      loaded(square('a')),
      { type: 'PATCH', id: 'a', patch: { label: 'A' } },
      { type: 'PATCH', id: 'a', patch: { label: 'A1' } },
      { type: 'PATCH', id: 'a', patch: { label: 'A12' } }
    );
    expect(s.past).toHaveLength(1);
    s = reduce(s, { type: 'UNDO' });
    expect(s.hotspots[0].label).toBeUndefined();
    expect(s.future).toHaveLength(1);
    s = reduce(s, { type: 'PATCH', id: 'a', patch: { linkId: 'u2' } });
    expect(s.future).toHaveLength(0);
  });

  it('LOAD resets history but can keep the selection', () => {
    let s = run(loaded(square('a')), { type: 'SELECT', id: 'a' }, { type: 'DELETE_SHAPE', id: 'a' }, { type: 'UNDO' });
    s = reduce(s, { type: 'SELECT', id: 'a' });
    s = reduce(s, { type: 'LOAD', hotspots: [square('a')], keepSelection: true });
    expect(s.selectedId).toBe('a');
    expect(s.past).toHaveLength(0);
    expect(s.future).toHaveLength(0);
  });
});

describe('polygonEditorReducer — vertices', () => {
  it('keeps at least 3 vertices', () => {
    let s = loaded(square('a'));
    s = run(s, { type: 'SELECT', id: 'a', vertex: 0 }, { type: 'DELETE_SELECTED' });
    expect(s.hotspots[0].points).toHaveLength(3);
    s = run(s, { type: 'SELECT', id: 'a', vertex: 0 }, { type: 'DELETE_SELECTED' });
    expect(s.hotspots).toHaveLength(1);
    expect(s.hotspots[0].points).toHaveLength(3);
  });

  it('inserts a vertex at an edge midpoint (rect becomes polygon)', () => {
    const rect: Hotspot = { id: 'r', shape: 'rect', points: [[0.2, 0.2], [0.4, 0.4]], linkType: 'unit', linkId: 'u', z: 0 };
    const s = reduce(loaded(rect), { type: 'INSERT_VERTEX', id: 'r', edge: 0 });
    expect(s.hotspots[0].shape).toBe('polygon');
    expect(s.hotspots[0].points).toHaveLength(5);
    expect(s.hotspots[0].points[1][0]).toBeCloseTo(0.3);
    expect(s.hotspots[0].points[1][1]).toBeCloseTo(0.2);
    expect(s.selectedVertex).toBe(1);
  });

  it('dragging a rect corner keeps the opposite corner fixed', () => {
    const rect: Hotspot = { id: 'r', shape: 'rect', points: [[0.2, 0.2], [0.4, 0.4]], linkType: 'unit', linkId: 'u', z: 0 };
    const s = run(
      loaded(rect),
      { type: 'BEGIN_GESTURE' },
      { type: 'MOVE_VERTEX', id: 'r', index: 0, point: [0.5, 0.5], radius: 0 },
      { type: 'MOVE_VERTEX', id: 'r', index: 0, point: [0.6, 0.7], radius: 0 },
      { type: 'END_GESTURE' }
    );
    expect(s.hotspots[0].points).toEqual([[0.4, 0.4], [0.6, 0.7]]);
    expect(s.past).toHaveLength(1);
  });

  it('snaps a dragged vertex to another shape vertex within the radius', () => {
    const s = run(
      loaded(square('a'), square('b', 0.5, 0.5)),
      { type: 'BEGIN_GESTURE' },
      { type: 'MOVE_VERTEX', id: 'b', index: 0, point: [0.305, 0.295], radius: 0.02 },
      { type: 'END_GESTURE' }
    );
    expect(s.hotspots[1].points[0]).toEqual(s.hotspots[0].points[2]);
  });

  it('snaps to the grid when enabled and nothing is near', () => {
    const s = run(
      loaded(square('a')),
      { type: 'SET_SNAP', snap: { grid: true, gridStep: 0.05 } },
      { type: 'MOVE_VERTEX', id: 'a', index: 2, point: [0.62, 0.71], radius: 0.01 }
    );
    expect(s.hotspots[0].points[2][0]).toBeCloseTo(0.6);
    expect(s.hotspots[0].points[2][1]).toBeCloseTo(0.7);
  });

  it('does not snap to its own vertices', () => {
    const s = reduce(loaded(square('a')), { type: 'MOVE_VERTEX', id: 'a', index: 0, point: [0.29, 0.11], radius: 0.05 });
    expect(s.hotspots[0].points[0]).toEqual([0.29, 0.11]);
  });
});

describe('polygonEditorReducer — shapes', () => {
  it('duplicates with a clamped offset, selects the copy, keeps link', () => {
    const s = reduce(loaded(square('a', 0.79, 0.1)), { type: 'DUPLICATE', id: 'a', newId: 'a2' });
    expect(s.hotspots).toHaveLength(2);
    const copy = s.hotspots[1];
    expect(copy.id).toBe('a2');
    expect(copy.linkId).toBe('u1');
    expect(Math.max(...copy.points.map((p) => p[0]))).toBeLessThanOrEqual(1);
    expect(copy.points[0][1]).toBeCloseTo(0.1 + DUPLICATE_OFFSET);
    expect(copy.z).toBeGreaterThan(s.hotspots[0].z);
    expect(s.selectedId).toBe('a2');
  });

  it('deletes the selected shape and supports undo', () => {
    let s = run(loaded(square('a'), square('b', 0.5, 0.5)), { type: 'SELECT', id: 'a' }, { type: 'DELETE_SELECTED' });
    expect(s.hotspots.map((h) => h.id)).toEqual(['b']);
    expect(s.selectedId).toBeNull();
    s = reduce(s, { type: 'UNDO' });
    expect(s.hotspots.map((h) => h.id)).toEqual(['a', 'b']);
  });

  it('reorders z', () => {
    const s = reduce(loaded({ ...square('a'), z: 0 }, { ...square('b', 0.5, 0.5), z: 1 }), {
      type: 'REORDER',
      id: 'a',
      direction: 'forward',
    });
    expect(s.hotspots.find((h) => h.id === 'a')!.z).toBe(1);
    expect(s.hotspots.find((h) => h.id === 'b')!.z).toBe(0);
  });

  it('nudges with clamping and coalesces repeated nudges', () => {
    const s = run(
      loaded(square('a', 0.79, 0.1)),
      { type: 'SELECT', id: 'a' },
      { type: 'NUDGE', dx: 0.01, dy: 0 },
      { type: 'NUDGE', dx: 0.01, dy: 0 },
      { type: 'NUDGE', dx: 0.01, dy: 0 }
    );
    expect(Math.max(...s.hotspots[0].points.map((p) => p[0]))).toBeCloseTo(1);
    expect(s.past).toHaveLength(1);
  });

  it('hidden-in-editor is view state only (no history)', () => {
    let s = reduce(loaded(square('a')), { type: 'TOGGLE_HIDDEN', id: 'a' });
    expect(s.hidden).toEqual(['a']);
    expect(s.past).toHaveLength(0);
    s = reduce(s, { type: 'SET_ALL_HIDDEN', hidden: false });
    expect(s.hidden).toEqual([]);
  });

  it('flags invalid geometry', () => {
    const bow: Hotspot = { ...square('x'), points: [[0.1, 0.1], [0.5, 0.5], [0.5, 0.1], [0.1, 0.5]] };
    expect(hotspotIssues(bow)).toEqual(['self_intersecting']);
    expect(outlineOf({ shape: 'rect', points: [[0, 0], [1, 1]] })).toHaveLength(4);
  });
});

describe('polygonEditorReducer — REPEAT', () => {
  const rectAt = (id: string, y: number): Hotspot => ({ ...square(id), shape: 'rect', points: [[0.1, y], [0.25, y + 0.09]], label: 'A1' });
  const ids = (n: number) => Array.from({ length: n }, (_, i) => `c${i + 1}`);

  it('copies a region down the facade as one undo step, unlinked, first copy selected', () => {
    const base = loaded(rectAt('a', 0.1));
    const s = reduce(base, { type: 'REPEAT', id: 'a', ids: ids(3), direction: 'down', stepPct: 12 });
    expect(s.hotspots.map((h) => h.id)).toEqual(['a', 'c1', 'c2', 'c3']);
    expect(s.hotspots[1].points[0][1]).toBeCloseTo(0.22);
    expect(s.hotspots[3].points[0][1]).toBeCloseTo(0.46);
    // The original keeps its link and label; the copies keep the kind of link only.
    expect(s.hotspots[0]).toMatchObject({ linkId: 'u1', label: 'A1' });
    for (const c of s.hotspots.slice(1)) expect(c).toMatchObject({ shape: 'rect', linkType: 'unit', linkId: '', label: undefined });
    expect(s.selectedId).toBe('c1');
    expect(s.past).toHaveLength(1);
    const undone = reduce(s, { type: 'UNDO' });
    expect(undone.hotspots.map((h) => h.id)).toEqual(['a']);
  });

  it('puts every copy above the last one, so overlapping ones stay selectable in order', () => {
    const s = reduce(loaded(rectAt('a', 0.1)), { type: 'REPEAT', id: 'a', ids: ids(2), direction: 'down', stepPct: 12 });
    expect(s.hotspots.map((h) => h.z)).toEqual([0, 1, 2]);
  });

  it('makes only the copies that fit, and none when the first would leave the picture', () => {
    const s = reduce(loaded(rectAt('a', 0.1)), { type: 'REPEAT', id: 'a', ids: ids(10), direction: 'down', stepPct: 30 });
    expect(s.hotspots).toHaveLength(3);
    const none = reduce(loaded(rectAt('a', 0.9)), { type: 'REPEAT', id: 'a', ids: ids(3), direction: 'down', stepPct: 12 });
    expect(none.hotspots).toHaveLength(1);
    expect(none.past).toHaveLength(0);
  });

  it('ignores a region that does not exist', () => {
    const base = loaded(rectAt('a', 0.1));
    expect(reduce(base, { type: 'REPEAT', id: 'zzz', ids: ids(2), direction: 'down', stepPct: 12 })).toBe(base);
  });
});

describe('polygonEditorReducer — ADD_MANY', () => {
  const copy = (id: string, z: number): Hotspot => ({ ...square(id), z });

  it('adds the copies as one undo step, keeps their stacking order and selects the first', () => {
    const base = loaded(square('a'));
    const s = reduce(base, { type: 'ADD_MANY', hotspots: [copy('n2', 5), copy('n1', 2)] });
    expect(s.hotspots.map((h) => h.id)).toEqual(['a', 'n1', 'n2']);
    expect(s.hotspots.map((h) => h.z)).toEqual([0, 1, 2]);
    expect(s.selectedId).toBe('n1');
    expect(s.past).toHaveLength(1);
    expect(reduce(s, { type: 'UNDO' }).hotspots.map((h) => h.id)).toEqual(['a']);
  });

  it('does nothing for no regions, or when the view would pass its limit', () => {
    const base = loaded(square('a'));
    expect(reduce(base, { type: 'ADD_MANY', hotspots: [] })).toBe(base);
    const many = Array.from({ length: MAX_HOTSPOTS_PER_SCENE }, (_, i) => copy(`m${i}`, i));
    expect(reduce(base, { type: 'ADD_MANY', hotspots: many })).toBe(base);
  });
});
