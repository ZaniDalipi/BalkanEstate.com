/**
 * Pointer interactions of the editor canvas, translated into editor actions.
 *
 * All drags capture the pointer on the SVG root so a fast drag never "drops"
 * the shape, and all coordinates come from the SVG's bounding box (which
 * already includes the viewport's zoom/pan transform).
 */
import { useCallback, useRef, useState } from 'react';
import type React from 'react';
import type { HotspotLinkType } from '../../../types';
import { clampPoint, distance, type Point } from '../../../utils/polygonGeometry';
import { snapPoint, type PolygonEditor } from '../../../hooks/usePolygonEditor';
import { SNAP_PX } from './canvasUtils';

type Drag =
  | { kind: 'shape'; id: string; start: Point }
  | { kind: 'vertex'; id: string; index: number }
  | { kind: 'rect'; start: Point; end: Point };

interface Options {
  editor: PolygonEditor;
  /** Rendered image width in px at the current zoom. */
  renderedWidth: number;
  linkType: HotspotLinkType;
  disabled: boolean;
}

export function useCanvasPointer({ editor, renderedWidth, linkType, disabled }: Options) {
  const { state, dispatch, nextId } = editor;
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const [rect, setRect] = useState<[Point, Point] | null>(null);
  const [cursor, setCursor] = useState<Point | null>(null);
  const radius = SNAP_PX / Math.max(1, renderedWidth);

  const norm = (e: React.PointerEvent | React.MouseEvent): Point => {
    const r = svgRef.current?.getBoundingClientRect();
    if (!r || r.width === 0 || r.height === 0) return [0, 0];
    return clampPoint([(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]);
  };

  const capture = (e: React.PointerEvent) => svgRef.current?.setPointerCapture?.(e.pointerId);

  /** Abort whatever drag is in progress (e.g. a second finger started a pan). */
  const cancel = useCallback(() => {
    if (dragRef.current?.kind === 'shape' || dragRef.current?.kind === 'vertex') dispatch({ type: 'CANCEL_GESTURE' });
    dragRef.current = null;
    setRect(null);
  }, [dispatch]);

  const onBackgroundPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (disabled || e.button !== 0) return;
    const p = norm(e);
    if (state.tool === 'rect') {
      const start = snapPoint(p, state.hotspots, state.snap, radius);
      dragRef.current = { kind: 'rect', start, end: start };
      setRect([start, start]);
      capture(e);
    } else if (state.tool === 'polygon') {
      dispatch({ type: 'DRAW_POINT', point: p, radius, id: nextId(), linkType });
    } else {
      dispatch({ type: 'SELECT', id: null });
    }
  };

  const onShapePointerDown = (e: React.PointerEvent<SVGElement>, id: string) => {
    if (disabled || e.button !== 0 || state.tool !== 'select') return;
    e.stopPropagation();
    dispatch({ type: 'SELECT', id });
    dispatch({ type: 'BEGIN_GESTURE' });
    dragRef.current = { kind: 'shape', id, start: norm(e) };
    capture(e);
  };

  const onVertexPointerDown = (e: React.PointerEvent<SVGElement>, id: string, index: number) => {
    if (disabled || e.button !== 0) return;
    e.stopPropagation();
    dispatch({ type: 'SELECT', id, vertex: index });
    dispatch({ type: 'BEGIN_GESTURE' });
    dragRef.current = { kind: 'vertex', id, index };
    capture(e);
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const d = dragRef.current;
    const p = norm(e);
    if (!d) {
      if (state.drawing) setCursor(p);
      return;
    }
    if (d.kind === 'shape') dispatch({ type: 'MOVE_SHAPE', id: d.id, dx: p[0] - d.start[0], dy: p[1] - d.start[1] });
    else if (d.kind === 'vertex') dispatch({ type: 'MOVE_VERTEX', id: d.id, index: d.index, point: p, radius });
    else {
      const end = snapPoint(p, state.hotspots, state.snap, radius);
      dragRef.current = { ...d, end };
      setRect([d.start, end]);
    }
  };

  const onPointerUp = () => {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d) return;
    if (d.kind === 'rect') {
      setRect(null);
      dispatch({ type: 'ADD', id: nextId(), shape: 'rect', points: [d.start, d.end], linkType });
    } else {
      dispatch({ type: 'END_GESTURE' });
    }
  };

  const onDoubleClick = () => {
    if (!disabled && state.tool === 'polygon' && state.drawing) dispatch({ type: 'DRAW_FINISH', id: nextId(), linkType });
  };

  const first = state.drawing?.[0];
  const canClose = !!(first && cursor && (state.drawing?.length ?? 0) >= 3 && distance(first, cursor) <= radius);

  return {
    svgRef,
    rect,
    cursor: state.drawing ? cursor : null,
    canClose,
    cancel,
    svgHandlers: {
      onPointerDown: onBackgroundPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: cancel,
      onDoubleClick,
    },
    onShapePointerDown,
    onVertexPointerDown,
  };
}
