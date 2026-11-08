import { useCallback, useEffect, useRef, useState } from 'react';
import type React from 'react';
import type { Bounds } from '../utils/polygonGeometry';

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

/** How deep a {@link fitBox} glide goes: share of the frame the region fills, and the zoom cap. */
export interface FlyOptions {
  fill?: number;
  maxScale?: number;
}

const IDENTITY: PanZoomTransform = { scale: 1, x: 0, y: 0 };
const DOUBLE_TAP_MS = 300;
/** Length of a programmatic {@link flyTo} glide. */
export const FLY_MS = 900;
/** A long camera flight starts gently and settles softly (see `flyPath`). */
export const FLIGHT_EASE = 'cubic-bezier(0.45, 0.05, 0.2, 1)';

/** The CSS transform of the content layer for a pan/zoom state. */
export const transformCss = (t: PanZoomTransform): string => `translate(${t.x}px, ${t.y}px) scale(${t.scale})`;

/**
 * The transform that centres `box` (normalised 0–1 image coordinates) and
 * zooms until it fills `fill` of the frame (about half by default).
 */
export const fitBox = (box: Bounds, size: Size, maxScale = 4, fill = 0.5): PanZoomTransform => {
  const span = Math.max(0.02, box.maxX - box.minX, box.maxY - box.minY);
  const scale = Math.min(maxScale, Math.max(1.5, fill / span));
  const cx = ((box.minX + box.maxX) / 2) * size.width;
  const cy = ((box.minY + box.maxY) / 2) * size.height;
  return { scale, x: size.width / 2 - cx * scale, y: size.height / 2 - cy * scale };
};

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
  /** The transformed content layer; `flyPath` animates it directly. */
  const contentRef = useRef<HTMLDivElement | null>(null);
  const flight = useRef<Animation | null>(null);
  const [transform, setTransform] = useState<PanZoomTransform>(IDENTITY);
  const tRef = useRef(transform);
  tRef.current = transform;
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ startX: number; startY: number; origin: PanZoomTransform; pinchDist?: number; moved: boolean } | null>(null);
  const dragged = useRef(false);
  const lastTap = useRef<{ time: number; x: number; y: number } | null>(null);
  const [flying, setFlying] = useState(false);
  const flyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(
    () => () => {
      clearTimeout(flyTimer.current);
      flight.current?.cancel();
    },
    []
  );

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

  /**
   * Glide (CSS transition) to a transform. Returns false, doing nothing, when
   * the frame has no size yet (nothing on screen to glide).
   */
  const glideTo = useCallback(
    (next: PanZoomTransform) => {
      const s = size();
      if (!s.width || !s.height) return false;
      clearTimeout(flyTimer.current);
      setFlying(true);
      apply(next);
      flyTimer.current = setTimeout(() => setFlying(false), FLY_MS);
      return true;
    },
    [apply]
  );

  /** Glide to a region, e.g. the budget helper taking a buyer to an apartment; false when there is no frame yet. */
  const flyTo = useCallback(
    (box: Bounds, opts: FlyOptions = {}) => glideTo(fitBox(box, size(), Math.min(maxScale, opts.maxScale ?? maxScale), opts.fill)),
    [glideTo, maxScale]
  );

  /** Where the picture is on screen right now: mid-flight, that is not yet the committed state. */
  const liveTransform = useCallback((): PanZoomTransform => {
    const el = contentRef.current;
    if (!flight.current || !el || typeof DOMMatrixReadOnly === 'undefined') return tRef.current;
    const m = new DOMMatrixReadOnly(getComputedStyle(el).transform);
    return { scale: m.a, x: m.e, y: m.f };
  }, []);

  /** End a `flyPath` flight now: the picture snaps to where the flight was going. */
  const stopFlight = useCallback(() => {
    flight.current?.cancel();
    flight.current = null;
  }, []);

  /**
   * Fly the camera through `frames` (each clamped to the frame) over `ms`.
   * The end state is committed at once and the animation plays over it, so
   * React and the screen agree the moment the flight ends or is stopped.
   * Without the Web Animations API it simply arrives. False when the frame
   * has no size yet.
   */
  const flyPath = useCallback(
    (frames: PanZoomTransform[], ms: number, easing = FLIGHT_EASE) => {
      const s = size();
      if (!s.width || !s.height || frames.length === 0) return false;
      const path = frames.map((f) => clampTransform(f, s, minScale, maxScale));
      clearTimeout(flyTimer.current);
      setFlying(false);
      flight.current?.cancel();
      flight.current = null;
      const el = contentRef.current;
      if (el && typeof el.animate === 'function' && ms > 0 && path.length > 1) {
        const anim = el.animate(path.map((t) => ({ transform: transformCss(t) })), { duration: ms, easing, fill: 'forwards' });
        anim.onfinish = () => {
          if (flight.current !== anim) return;
          anim.cancel();
          flight.current = null;
        };
        flight.current = anim;
      }
      setTransform(path[path.length - 1]);
      return true;
    },
    [minScale, maxScale]
  );

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
    contentRef,
    transform,
    /** The frame's size now (0 × 0 before it is laid out). */
    frameSize: size,
    isZoomed: transform.scale > 1.01,
    zoomIn: () => zoomBy(1.5),
    zoomOut: () => zoomBy(1 / 1.5),
    reset: () => setTransform(IDENTITY),
    flyTo,
    glideTo,
    flyPath,
    stopFlight,
    liveTransform,
    consumeDrag,
    handlers: {
      onPointerDown: onPointerDown as (e: React.PointerEvent) => void,
      onPointerMove: onPointerMove as (e: React.PointerEvent) => void,
      onPointerUp: onPointerUp as (e: React.PointerEvent) => void,
      onPointerCancel: onPointerUp as (e: React.PointerEvent) => void,
    },
    contentStyle: {
      transform: transformCss(transform),
      transformOrigin: '0 0',
      transition: flying ? `transform ${FLY_MS}ms cubic-bezier(0.22, 0.8, 0.26, 1)` : undefined,
    } as React.CSSProperties,
  };
}
