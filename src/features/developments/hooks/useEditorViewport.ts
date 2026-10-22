/**
 * Zoom & pan for the polygon editor canvas.
 *
 * The frame (container) is fixed; the content (image + SVG overlay, fitted to
 * the frame at zoom 1) is moved with `translate(tx, ty) scale(zoom)`. Pointer
 * coordinates are read from the content's bounding box, which already includes
 * the transform, so the editor never needs to know the zoom to map a click to
 * image space.
 *
 * Gestures: Ctrl/⌘+wheel (and trackpad pinch) zooms at the cursor, as does a
 * plain wheel while at fit; once zoomed, the wheel / two-finger swipe pans in
 * any direction (Shift+wheel pans sideways). +/- buttons zoom at the centre.
 * Pan by dragging the background (when the editor allows it via
 * `canDragPan`), Space+drag, middle-button drag, or two fingers (which also
 * pinch-zoom).
 * Panning handlers run in the CAPTURE phase so they win over the editor's own
 * pointer handlers; `onPanStart` lets the editor abort a drag it had started
 * with the first finger.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type React from 'react';

export interface ViewState {
  zoom: number;
  tx: number;
  ty: number;
}

export interface Size {
  w: number;
  h: number;
}

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 8;
export const ZOOM_STEP = 1.25;

export const clampZoom = (z: number, min = MIN_ZOOM, max = MAX_ZOOM): number => Math.min(max, Math.max(min, z));

/** The largest box of `aspect` (w/h) that fits inside `frame`. */
export const fitSize = (frame: Size, aspect: number): Size => {
  if (frame.w <= 0 || frame.h <= 0 || !(aspect > 0)) return { w: Math.max(0, frame.w), h: Math.max(0, frame.h) };
  return frame.w / frame.h > aspect ? { w: frame.h * aspect, h: frame.h } : { w: frame.w, h: frame.w / aspect };
};

/** Keep the content covering the frame when larger, centred when smaller. */
export const clampPan = (v: ViewState, frame: Size, base: Size): ViewState => {
  const sw = base.w * v.zoom;
  const sh = base.h * v.zoom;
  const tx = sw <= frame.w ? (frame.w - sw) / 2 : Math.min(0, Math.max(frame.w - sw, v.tx));
  const ty = sh <= frame.h ? (frame.h - sh) / 2 : Math.min(0, Math.max(frame.h - sh, v.ty));
  return { zoom: v.zoom, tx, ty };
};

/** Zoom to `nextZoom` keeping the content point under `anchor` (frame coords) fixed. */
export const zoomAround = (v: ViewState, anchor: { x: number; y: number }, nextZoom: number): ViewState => {
  const z = clampZoom(nextZoom);
  const k = z / v.zoom;
  return { zoom: z, tx: anchor.x - (anchor.x - v.tx) * k, ty: anchor.y - (anchor.y - v.ty) * k };
};

const isEditable = (el: EventTarget | null): boolean => {
  const node = el as HTMLElement | null;
  if (!node || !node.tagName) return false;
  const tag = node.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || node.isContentEditable;
};

interface UseEditorViewportOptions {
  /** Image width / height. */
  aspect: number;
  /** Called when a pan/pinch begins, so the editor can cancel its own drag. */
  onPanStart?: () => void;
  /** Whether a plain left-button press on this target should pan (e.g. empty background while zoomed). */
  canDragPan?: (e: React.PointerEvent<HTMLDivElement>) => boolean;
}

export function useEditorViewport({ aspect, onPanStart, canDragPan }: UseEditorViewportOptions) {
  const [frameEl, setFrameEl] = useState<HTMLDivElement | null>(null);
  const [frame, setFrame] = useState<Size>({ w: 0, h: 0 });
  const [view, setView] = useState<ViewState>({ zoom: 1, tx: 0, ty: 0 });
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const panRef = useRef<{ x: number; y: number; dist: number } | null>(null);
  const onPanStartRef = useRef(onPanStart);
  onPanStartRef.current = onPanStart;
  const canDragPanRef = useRef(canDragPan);
  canDragPanRef.current = canDragPan;
  const viewRef = useRef(view);
  viewRef.current = view;

  const base = fitSize(frame, aspect);
  const baseRef = useRef(base);
  baseRef.current = base;
  const frameRef = useRef(frame);
  frameRef.current = frame;

  const apply = useCallback((fn: (v: ViewState) => ViewState) => {
    setView((v) => clampPan(fn(v), frameRef.current, baseRef.current));
  }, []);

  useLayoutEffect(() => {
    if (!frameEl) return undefined;
    const measure = () => setFrame({ w: frameEl.clientWidth, h: frameEl.clientHeight });
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(frameEl);
    return () => ro.disconnect();
  }, [frameEl]);

  // Re-centre whenever the frame or image changes size.
  useEffect(() => apply((v) => v), [frame.w, frame.h, aspect, apply]);

  const localPoint = useCallback(
    (clientX: number, clientY: number) => {
      const r = frameEl?.getBoundingClientRect();
      return r ? { x: clientX - r.left, y: clientY - r.top } : { x: 0, y: 0 };
    },
    [frameEl]
  );

  const zoomAt = useCallback(
    (clientX: number, clientY: number, factor: number) => {
      const anchor = localPoint(clientX, clientY);
      apply((v) => zoomAround(v, anchor, v.zoom * factor));
    },
    [apply, localPoint]
  );

  const zoomCentre = useCallback(
    (factor: number) => apply((v) => zoomAround(v, { x: frameRef.current.w / 2, y: frameRef.current.h / 2 }, v.zoom * factor)),
    [apply]
  );

  // Wheel must be a non-passive native listener to be able to preventDefault.
  useEffect(() => {
    if (!frameEl) return undefined;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      // Pinch on a trackpad arrives as ctrl+wheel.
      const zooming = e.ctrlKey || e.metaKey || viewRef.current.zoom <= MIN_ZOOM + 1e-6;
      if (zooming) {
        zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)));
        return;
      }
      // Zoomed in: the wheel / two-finger swipe moves the picture freely.
      const dx = e.shiftKey && e.deltaX === 0 ? e.deltaY : e.deltaX;
      const dy = e.shiftKey && e.deltaX === 0 ? 0 : e.deltaY;
      apply((v) => ({ ...v, tx: v.tx - dx, ty: v.ty - dy }));
    };
    frameEl.addEventListener('wheel', onWheel, { passive: false });
    return () => frameEl.removeEventListener('wheel', onWheel);
  }, [frameEl, zoomAt, apply]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || isEditable(e.target)) return;
      if (frameEl && frameEl.contains(e.target as Node)) e.preventDefault();
      setSpaceHeld(true);
    };
    const up = (e: KeyboardEvent) => e.code === 'Space' && setSpaceHeld(false);
    const blur = () => setSpaceHeld(false);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, [frameEl]);

  const centroid = () => {
    const pts = [...pointers.current.values()];
    const x = pts.reduce((s, p) => s + p.x, 0) / pts.length;
    const y = pts.reduce((s, p) => s + p.y, 0) / pts.length;
    const dist = pts.length >= 2 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : 0;
    return { x, y, dist };
  };

  const onPointerDownCapture = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') pointers.current.set(e.pointerId, localPoint(e.clientX, e.clientY));
    const twoFingers = e.pointerType === 'touch' && pointers.current.size >= 2;
    const dragPan = e.button === 0 && e.pointerType !== 'touch' && !!canDragPanRef.current?.(e);
    if (!(e.button === 1 || spaceHeld || twoFingers || dragPan)) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    if (!twoFingers) pointers.current.set(e.pointerId, localPoint(e.clientX, e.clientY));
    panRef.current = centroid();
    setIsPanning(true);
    onPanStartRef.current?.();
  };

  const onPointerMoveCapture = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, localPoint(e.clientX, e.clientY));
    const prev = panRef.current;
    if (!prev) return;
    e.stopPropagation();
    const next = centroid();
    apply((v) => {
      const zoomed = prev.dist > 0 && next.dist > 0 ? zoomAround(v, next, v.zoom * (next.dist / prev.dist)) : v;
      return { ...zoomed, tx: zoomed.tx + next.x - prev.x, ty: zoomed.ty + next.y - prev.y };
    });
    panRef.current = next;
  };

  const onPointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId);
    if (!panRef.current) return;
    e.stopPropagation();
    if (pointers.current.size === 0) {
      panRef.current = null;
      setIsPanning(false);
    } else {
      panRef.current = centroid();
    }
  };

  const contentStyle: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    top: 0,
    width: base.w,
    height: base.h,
    transform: `translate(${view.tx}px, ${view.ty}px) scale(${view.zoom})`,
    transformOrigin: '0 0',
  };

  return {
    frameRef: setFrameEl,
    frameHandlers: {
      onPointerDownCapture,
      onPointerMoveCapture,
      onPointerUpCapture: onPointerEnd,
      onPointerCancelCapture: onPointerEnd,
    },
    contentStyle,
    zoom: view.zoom,
    /** Rendered width (px) of the image at the current zoom — 1 normalised unit in x. */
    renderedWidth: base.w * view.zoom,
    zoomIn: () => zoomCentre(ZOOM_STEP),
    zoomOut: () => zoomCentre(1 / ZOOM_STEP),
    fit: () => setView(clampPan({ zoom: 1, tx: 0, ty: 0 }, frameRef.current, baseRef.current)),
    canZoomIn: view.zoom < MAX_ZOOM - 1e-6,
    canZoomOut: view.zoom > MIN_ZOOM + 1e-6,
    spaceHeld,
    isPanning,
  };
}

export type EditorViewport = ReturnType<typeof useEditorViewport>;
