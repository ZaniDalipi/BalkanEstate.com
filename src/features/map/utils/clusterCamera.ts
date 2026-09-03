/**
 * clusterCamera — the pure geometry behind the map's cluster zoom.
 *
 * Everything here is framework-free maths on Google's 256px Web Mercator world
 * so it can be unit tested without a map instance:
 *
 *  - `boundsOfPositions` / `cameraForBounds` answer "where does the camera have
 *    to sit for every listing in this cluster to be on screen at once".
 *  - `createFlightPath` answers "how does the camera get there" using the
 *    Van Wijk & Nuij (2003) smooth-and-efficient zoom interpolation — the same
 *    optimal-path curve behind Mapbox's `flyTo`. It arcs the camera out as it
 *    travels and eases it back down onto the target, instead of the
 *    pan-then-step-the-zoom sequence that reads as two separate movements.
 *  - `spiderLayout` answers "what if zooming can never separate them" by
 *    fanning coincident pins out around their anchor.
 */

export interface LatLngLiteral {
  lat: number;
  lng: number;
}

export interface CameraTarget {
  center: LatLngLiteral;
  zoom: number;
}

export interface BoundsLiteral {
  north: number;
  south: number;
  east: number;
  west: number;
}

/** Google's world is 256px square at zoom 0; every zoom level doubles it. */
export const WORLD_SIZE = 256;

/** Mercator is undefined at the poles — Google clamps here. */
const MAX_LATITUDE = 85.05112878;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/** Latitude/longitude → world pixel coordinates at zoom 0 (y grows southward). */
export function projectToWorld({ lat, lng }: LatLngLiteral): { x: number; y: number } {
  const clampedLat = clamp(lat, -MAX_LATITUDE, MAX_LATITUDE);
  const sinLat = Math.sin((clampedLat * Math.PI) / 180);
  return {
    x: WORLD_SIZE * (0.5 + lng / 360),
    y: WORLD_SIZE * (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)),
  };
}

/** Inverse of `projectToWorld`. */
export function unprojectFromWorld({ x, y }: { x: number; y: number }): LatLngLiteral {
  const lng = (x / WORLD_SIZE - 0.5) * 360;
  const n = Math.PI * (1 - (2 * y) / WORLD_SIZE);
  const lat = (180 / Math.PI) * Math.atan(Math.sinh(n));
  return { lat, lng };
}

/**
 * Tightest bounds around a set of positions. Returns null when nothing usable
 * was passed — callers fall back to the click point rather than flying to (0,0).
 */
export function boundsOfPositions(positions: Array<LatLngLiteral | null | undefined>): BoundsLiteral | null {
  let bounds: BoundsLiteral | null = null;

  for (const position of positions) {
    if (!position) continue;
    const { lat, lng } = position;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

    if (!bounds) {
      bounds = { north: lat, south: lat, east: lng, west: lng };
      continue;
    }
    bounds.north = Math.max(bounds.north, lat);
    bounds.south = Math.min(bounds.south, lat);
    bounds.east = Math.max(bounds.east, lng);
    bounds.west = Math.min(bounds.west, lng);
  }

  return bounds;
}

export interface FitBoundsOptions {
  bounds: BoundsLiteral;
  /** Size of the map viewport in CSS pixels. */
  viewport: { width: number; height: number };
  /** Breathing room kept around the cluster, in pixels. */
  padding?: number;
  minZoom?: number;
  maxZoom?: number;
}

export interface FitBoundsResult extends CameraTarget {
  /**
   * The zoom the bounds actually need, before clamping. `Infinity` when every
   * pin sits on the same coordinate. Compare against `zoom` to find out whether
   * zooming can separate the cluster at all — if it can't, spiderfy instead.
   */
  requiredZoom: number;
}

/** The camera that frames `bounds` inside `viewport` with `padding` to spare. */
export function cameraForBounds({
  bounds,
  viewport,
  padding = 64,
  minZoom = 0,
  maxZoom = 21,
}: FitBoundsOptions): FitBoundsResult {
  const northEast = projectToWorld({ lat: bounds.north, lng: bounds.east });
  const southWest = projectToWorld({ lat: bounds.south, lng: bounds.west });

  const spanX = Math.abs(northEast.x - southWest.x);
  const spanY = Math.abs(southWest.y - northEast.y);

  // A padding bigger than the viewport would leave nothing to draw in; never
  // let the usable area collapse to zero.
  const usableWidth = Math.max(1, viewport.width - padding * 2);
  const usableHeight = Math.max(1, viewport.height - padding * 2);

  const zoomForX = spanX > 0 ? Math.log2(usableWidth / spanX) : Infinity;
  const zoomForY = spanY > 0 ? Math.log2(usableHeight / spanY) : Infinity;
  const requiredZoom = Math.min(zoomForX, zoomForY);

  const center = unprojectFromWorld({
    x: (northEast.x + southWest.x) / 2,
    y: (northEast.y + southWest.y) / 2,
  });

  return {
    center,
    zoom: clamp(Number.isFinite(requiredZoom) ? requiredZoom : maxZoom, minZoom, maxZoom),
    requiredZoom,
  };
}

/**
 * How much screen `bounds` covers at `zoom`, in CSS pixels.
 *
 * This answers the question a fit zoom cannot: "once the camera is there, are
 * these pins still stacked on top of each other?" It depends only on how far
 * apart the listings are, never on how wide the viewport happens to be — so a
 * tight cluster isn't declared unseparable just because a desktop window has
 * room to spare around it.
 */
export function pixelSpanOfBounds(
  bounds: BoundsLiteral,
  zoom: number,
): { width: number; height: number } {
  const northEast = projectToWorld({ lat: bounds.north, lng: bounds.east });
  const southWest = projectToWorld({ lat: bounds.south, lng: bounds.west });
  const scale = Math.pow(2, zoom);

  return {
    width: Math.abs(northEast.x - southWest.x) * scale,
    height: Math.abs(southWest.y - northEast.y) * scale,
  };
}

export interface FlightPathOptions {
  from: CameraTarget;
  to: CameraTarget;
  /** Viewport width in CSS pixels — sets how much ground the arc covers. */
  viewportWidth: number;
  /** Van Wijk's ρ. 1.42 is the value his user study landed on. */
  curve?: number;
  /** Zoom levels per second of perceived motion. Higher = snappier. */
  speed?: number;
  minDurationMs?: number;
  maxDurationMs?: number;
}

export interface FlightPath {
  durationMs: number;
  /** Camera at normalised progress `t` (0 → 1), already eased. */
  at(t: number): CameraTarget;
}

/** Smootherstep — zero velocity *and* zero acceleration at both ends. */
const ease = (t: number) => {
  const x = clamp(t, 0, 1);
  return x * x * x * (x * (x * 6 - 15) + 10);
};

/**
 * Van Wijk & Nuij's optimal camera path between two views. The camera pulls
 * back as it crosses the gap and settles onto the target, so a long jump reads
 * as one continuous move rather than a pan followed by a zoom.
 */
export function createFlightPath({
  from,
  to,
  viewportWidth,
  curve = 1.42,
  speed = 1.4,
  minDurationMs = 420,
  maxDurationMs = 1600,
}: FlightPathOptions): FlightPath {
  const width = Math.max(1, viewportWidth);
  const p0 = projectToWorld(from.center);
  const p1 = projectToWorld(to.center);

  // Viewport width expressed in zoom-0 world pixels: the "w" of the paper.
  const w0 = width / Math.pow(2, from.zoom);
  const w1 = width / Math.pow(2, to.zoom);

  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  const u1 = Math.hypot(dx, dy);

  const zoomAt = (w: number) => Math.log2(width / w);
  const snapToTarget = (t: number) => t >= 1;

  const rho = curve;
  const rho2 = rho * rho;

  // Degenerate case: same point, different zoom — a straight exponential zoom.
  if (u1 < 1e-9) {
    const ratio = Math.log(w1 / w0);
    const S = Math.abs(ratio) / rho;
    const durationMs = clamp((S / speed) * 1000, minDurationMs, maxDurationMs);

    return {
      durationMs,
      at(t) {
        if (snapToTarget(t)) return { center: to.center, zoom: to.zoom };
        const s = ease(t);
        return { center: to.center, zoom: zoomAt(w0 * Math.exp(ratio * s)) };
      },
    };
  }

  const b0 = (w1 * w1 - w0 * w0 + rho2 * rho2 * u1 * u1) / (2 * w0 * rho2 * u1);
  const b1 = (w1 * w1 - w0 * w0 - rho2 * rho2 * u1 * u1) / (2 * w1 * rho2 * u1);
  const r0 = Math.log(-b0 + Math.sqrt(b0 * b0 + 1));
  const r1 = Math.log(-b1 + Math.sqrt(b1 * b1 + 1));
  const S = (r1 - r0) / rho;

  // Guard the numerics: near-identical views can make S non-finite or zero, and
  // a NaN camera would freeze the map mid-flight. Fall back to a plain lerp.
  if (!Number.isFinite(S) || Math.abs(S) < 1e-9) {
    const durationMs = minDurationMs;
    return {
      durationMs,
      at(t) {
        if (snapToTarget(t)) return { center: to.center, zoom: to.zoom };
        const s = ease(t);
        return {
          center: unprojectFromWorld({ x: p0.x + dx * s, y: p0.y + dy * s }),
          zoom: from.zoom + (to.zoom - from.zoom) * s,
        };
      },
    };
  }

  const coshR0 = Math.cosh(r0);
  const sinhR0 = Math.sinh(r0);
  const durationMs = clamp((Math.abs(S) / speed) * 1000, minDurationMs, maxDurationMs);

  return {
    durationMs,
    at(t) {
      if (snapToTarget(t)) return { center: to.center, zoom: to.zoom };
      const s = S * ease(t);
      const w = (w0 * coshR0) / Math.cosh(rho * s + r0);
      const u = ((w0 * coshR0 * Math.tanh(rho * s + r0)) - w0 * sinhR0) / rho2;
      const progress = clamp(u / u1, 0, 1);

      return {
        center: unprojectFromWorld({ x: p0.x + dx * progress, y: p0.y + dy * progress }),
        zoom: zoomAt(w),
      };
    },
  };
}

/**
 * Pixel offsets for pins that no zoom level can separate. Small groups fan out
 * on a circle; larger ones spiral outward so labels don't collide.
 * Mirrors the layout Leaflet.markercluster popularised.
 */
export function spiderLayout(count: number): Array<{ x: number; y: number }> {
  const positions: Array<{ x: number; y: number }> = [];
  if (count <= 0) return positions;
  if (count === 1) return [{ x: 0, y: -44 }];

  const CIRCLE_LIMIT = 8;

  if (count <= CIRCLE_LIMIT) {
    const radius = 34 + count * 5;
    const step = (2 * Math.PI) / count;
    for (let i = 0; i < count; i++) {
      // Start at 12 o'clock so the first leg never hides under the hub label.
      const angle = -Math.PI / 2 + i * step;
      positions.push({ x: radius * Math.cos(angle), y: radius * Math.sin(angle) });
    }
    return positions;
  }

  const separation = 30;
  const lengthPerAngle = 12;
  let angle = 0;
  let legLength = separation;

  for (let i = 0; i < count; i++) {
    positions.push({ x: legLength * Math.cos(angle), y: legLength * Math.sin(angle) });
    angle += separation / legLength + i * 0.0006;
    legLength += (2 * Math.PI * lengthPerAngle) / angle;
  }

  return positions;
}
