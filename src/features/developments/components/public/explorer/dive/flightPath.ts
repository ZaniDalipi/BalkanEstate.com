import { clampTransform, type PanZoomTransform } from '../../../../hooks/usePanZoom';

interface Size {
  width: number;
  height: number;
}

interface Point {
  x: number;
  y: number;
}

/** The picture point (in unzoomed frame pixels) a transform shows in the middle of the frame. */
export const centreOf = (t: PanZoomTransform, size: Size): Point => ({
  x: (size.width / 2 - t.x) / t.scale,
  y: (size.height / 2 - t.y) / t.scale,
});

const centredOn = (c: Point, scale: number, size: Size): PanZoomTransform => ({
  scale,
  x: size.width / 2 - c.x * scale,
  y: size.height / 2 - c.y * scale,
});

export interface FlightOptions {
  /** Steps along the way (more is smoother); the first is `from`, the last `to`. */
  samples?: number;
  /** How far the arc lifts above the straight line, as a share of the frame height. */
  lift?: number;
  maxScale?: number;
}

/**
 * A camera flight from `from` to `to`, like a drone climbing towards a window:
 * the zoom changes at a steady pace (geometrically, so it never seems to lurch
 * at the end), and the view swings along a gentle arc that lifts above the
 * straight line before settling on the target. Each step is clamped so the
 * picture always covers the frame.
 */
export function flightPath(from: PanZoomTransform, to: PanZoomTransform, size: Size, opts: FlightOptions = {}): PanZoomTransform[] {
  const { samples = 32, lift = 0.05, maxScale = 4 } = opts;
  const a = centreOf(from, size);
  const b = centreOf(to, size);
  const bend: Point = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 - lift * size.height };
  const path: PanZoomTransform[] = [];
  for (let i = 0; i <= samples; i += 1) {
    const t = i / samples;
    const u = 1 - t;
    const scale = from.scale * (to.scale / from.scale) ** t;
    const c = { x: u * u * a.x + 2 * u * t * bend.x + t * t * b.x, y: u * u * a.y + 2 * u * t * bend.y + t * t * b.y };
    path.push(clampTransform(centredOn(c, scale, size), size, 1, maxScale));
  }
  return path;
}
