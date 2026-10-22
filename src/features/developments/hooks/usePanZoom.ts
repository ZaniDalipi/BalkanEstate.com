import { useCallback, useEffect, useRef, useState } from 'react';
import type React from 'react';

export interface PanZoomTransform {
  scale: number;
  x: number;
  y: number;
}

export interface UsePanZoomOptions {
  minScale?: number;
  maxScale?: number;
  /** Movement (px) after which a press counts as a pan rather than a tap. */
  dragThreshold?: number;
  /** Zoom on a plain wheel; otherwise only with Ctrl/⌘ or once zoomed in (page scroll stays usable). */
  wheelAlwaysZooms?: boolean;
}

interface Size {
  width: number;
  height: number;
}

const IDENTITY: PanZoomTransform = { scale: 1, x: 0, y: 0 };
const DOUBLE_TAP_MS = 300;

/** Keep the zoomed content covering the viewport: x ∈ [w − w·s, 0]. */
export const clampTransform = (t: PanZoomTransform, size: Size, min = 1, max = 4): PanZoomTransform => {
  const scale = Math.min(max, Math.max(min, t.scale));
  const minX = Math.min(0, size.width - size.width * scale);
  const minY = Math.min(0, size.height - size.height * scale);
  return { scale, x: Math.min(0, Math.max(minX, t.x)), y: Math.min(0, Math.max(minY, t.y)) };
};

/** Zoom to `nextScale` keeping the content point under (px, py) fixed. */
export const zoomAt = (t: PanZoomTransform, nextScale: number, px: number, py: number): PanZoomTransform => {
  const ratio = nextScale / t.scale;
  return { scale: nextScale, x: px - (px - t.x) * ratio, y: py - (py - t.y) * ratio };
};

interface PointerLike {
  pointerId: number;
  clientX: number;
  clientY: number;
  pointerType?: string;
  button?: number;
  currentTarget?: { setPointerCapture?: (id: number) => void } | null;
}

/**
 * Pan & zoom for the explorer stage (transform-origin 0 0 on the content):
 * wheel zoom at the cursor, drag to pan, pinch on touch, double-tap to zoom,
 * programmatic +/−/reset, all clamped so the image never leaves the frame.
 *
 * Taps and pans share pointer events, so `consumeDrag()` tells a click handler
 * whether the press that produced it was actually a pan — a drag must never
 * open the unit drawer.
 */
export function usePanZoom({ minScale = 1, maxScale = 4, dragThreshold = 6, wheelAlwaysZooms = false }: UsePanZoomOptions = {}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [transform, setTransform] = useState<PanZoomTransform>(IDENTITY);
  const tRef = useRef(transform);
  tRef.current = transform;
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ startX: number; startY: number; origin: PanZoomTransform; pinchDist?: number; moved: boolean } | null>(null);
  const dragged = useRef(false);
  const lastTap = useRef<{ time: number; x: number; y: number } | null>(null);

  const size = (): Size => {
    const r = containerRef.current?.getBoundingClientRect();
    return { width: r?.width ?? 0, height: r?.height ?? 0 };
  };
  const local = (clientX: number, clientY: number) => {
    const r = containerRef.current?.getBoundingClientRect();
    return { x: clientX - (r?.left ?? 0), y: clientY - (r?.top ?? 0) };
  };
  const apply = useCallback(
    (next: PanZoomTransform) => setTransform(clampTransform(next, size(), minScale, maxScale)),
    [minScale, maxScale]
  );

  const zoomBy = useCallback(
    (factor: number, at?: { x: number; y: number }) => {
      const s = size();
      const p = at ?? { x: s.width / 2, y: s.height / 2 };
      const t = tRef.current;
      const next = Math.min(maxScale, Math.max(minScale, t.scale * factor));
      apply(zoomAt(t, next, p.x, p.y));
    },
    [apply, minScale, maxScale]
  );

  const onPointerDown = (e: PointerLike) => {
    if (e.button != null && e.button !== 0) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    dragged.current = false;
    const pts = Array.from(pointers.current.values());
    gesture.current = {
      startX: e.clientX,
      startY: e.clientY,
      origin: tRef.current,
      pinchDist: pts.length === 2 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : undefined,
      moved: pts.length === 2,
    };
  };

  const onPointerMove = (e: PointerLike) => {
    if (!pointers.current.has(e.pointerId) || !gesture.current) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    const pts = Array.from(pointers.current.values());
    if (pts.length === 2 && g.pinchDist) {
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const mid = local((pts[0].x + pts[1].x) / 2, (pts[0].y + pts[1].y) / 2);
      const next = Math.min(maxScale, Math.max(minScale, g.origin.scale * (dist / g.pinchDist)));
      dragged.current = true;
      apply(zoomAt(g.origin, next, mid.x, mid.y));
      return;
    }
    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;
    if (!g.moved && Math.hypot(dx, dy) < dragThreshold) return;
    if (!g.moved) {
      // Capture only once it is a pan, so a plain tap still clicks the polygon under it.
      try {
        e.currentTarget?.setPointerCapture?.(e.pointerId);
      } catch {
        /* capture is best effort */
      }
    }
    g.moved = true;
    dragged.current = true;
    apply({ ...g.origin, x: g.origin.x + dx, y: g.origin.y + dy });
  };

  const onPointerUp = (e: PointerLike) => {
    const wasPan = gesture.current?.moved ?? false;
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 0) gesture.current = null;
    if (wasPan || e.pointerType !== 'touch') return;
    // Double-tap (touch) toggles 2× zoom at the tap.
    const now = Date.now();
    const prev = lastTap.current;
    if (prev && now - prev.time < DOUBLE_TAP_MS && Math.hypot(prev.x - e.clientX, prev.y - e.clientY) < 30) {
      lastTap.current = null;
      dragged.current = true; // the second tap must not also open something
      if (tRef.current.scale > 1.01) apply(IDENTITY);
      else {
        const p = local(e.clientX, e.clientY);
        apply(zoomAt(tRef.current, Math.min(maxScale, 2), p.x, p.y));
      }
      return;
    }
    lastTap.current = { time: now, x: e.clientX, y: e.clientY };
  };

  /** True (once) if the press that ended was a pan/pinch/double-tap rather than a tap. */
  const consumeDrag = useCallback(() => {
    const was = dragged.current;
    dragged.current = false;
    return was;
  }, []);

  // Wheel needs a non-passive listener to preventDefault.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    const onWheel = (e: WheelEvent) => {
      const zoomed = tRef.current.scale > 1.01;
      if (!wheelAlwaysZooms && !e.ctrlKey && !e.metaKey && !zoomed) return;
      e.preventDefault();
      if (zoomed && !e.ctrlKey && !e.metaKey) {
        // Zoomed in: the wheel / two-finger swipe moves the picture freely
        // (Shift+wheel sideways); Ctrl/⌘+wheel or a pinch keeps zooming.
        const dx = e.shiftKey && e.deltaX === 0 ? e.deltaY : e.deltaX;
        const dy = e.shiftKey && e.deltaX === 0 ? 0 : e.deltaY;
        const t = tRef.current;
        apply({ ...t, x: t.x - dx, y: t.y - dy });
        return;
      }
      zoomBy(Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)), local(e.clientX, e.clientY));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomBy, wheelAlwaysZooms, apply]);

  return {
    containerRef,
    transform,
    isZoomed: transform.scale > 1.01,
    zoomIn: () => zoomBy(1.5),
    zoomOut: () => zoomBy(1 / 1.5),
    reset: () => setTransform(IDENTITY),
    consumeDrag,
    handlers: {
      onPointerDown: onPointerDown as (e: React.PointerEvent) => void,
      onPointerMove: onPointerMove as (e: React.PointerEvent) => void,
      onPointerUp: onPointerUp as (e: React.PointerEvent) => void,
      onPointerCancel: onPointerUp as (e: React.PointerEvent) => void,
    },
    contentStyle: {
      transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
      transformOrigin: '0 0',
    } as React.CSSProperties,
  };
}
