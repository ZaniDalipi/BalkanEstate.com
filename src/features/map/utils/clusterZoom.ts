/**
 * clusterZoom — what happens when someone taps a cluster bubble.
 *
 * A cluster is a promise: "there are N listings here". Tapping it has to keep
 * that promise, so the interaction is built around one rule — after the
 * animation the visitor can see every listing the bubble was standing in for.
 *
 *   tap → bubble presses in and throws a ripple
 *       → the camera flies along a Van Wijk arc that frames the cluster's own
 *         bounds (not a fixed "+4 zoom" guess)
 *       → the listings it contained bloom in, staggered outward from the anchor
 *       → if no zoom level could ever separate them, they fan out on legs
 *         (spiderfy) so the count is still honoured
 *
 * The geometry lives in `clusterCamera.ts`; this module is the Google Maps and
 * DOM half. `prefers-reduced-motion` collapses every animation here into a
 * direct jump.
 */

import {
  boundsOfPositions,
  cameraForBounds,
  createFlightPath,
  projectToWorld,
  unprojectFromWorld,
  spiderLayout,
  type CameraTarget,
  type LatLngLiteral,
} from './clusterCamera';

const STYLE_ID = 'be-cluster-zoom-styles';

/** Longest the whole reveal stagger may take, however big the cluster is. */
const MAX_BLOOM_STAGGER_MS = 420;
const BLOOM_DURATION_MS = 620;

/** Clusters stop existing above the algorithm's maxZoom, so this is the ceiling. */
export const CLUSTER_FIT_PADDING = 72;

/** The clusterer supports both marker generations; so does everything here. */
type AnyMarker = google.maps.Marker | google.maps.marker.AdvancedMarkerElement;

interface ClusterLike {
  markers?: AnyMarker[];
  marker?: AnyMarker;
  position?: google.maps.LatLng | LatLngLiteral;
}

const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** AdvancedMarkerElement positions come back as LatLng or a plain literal. */
export function positionOf(marker: AnyMarker | undefined | null): LatLngLiteral | null {
  const position = (marker as any)?.position;
  if (!position) return null;
  const lat = typeof position.lat === 'function' ? position.lat() : position.lat;
  const lng = typeof position.lng === 'function' ? position.lng() : position.lng;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

const contentOf = (marker: AnyMarker | undefined | null): HTMLElement | null => {
  const content = (marker as any)?.content;
  return content instanceof HTMLElement ? content : null;
};

/** Legacy markers move through setters; advanced ones through properties. */
const setMarkerPosition = (marker: AnyMarker, position: LatLngLiteral) => {
  const setPosition = (marker as any).setPosition;
  if (typeof setPosition === 'function') setPosition.call(marker, position);
  else (marker as any).position = position;
};

const setMarkerMap = (marker: AnyMarker, map: google.maps.Map | null) => {
  const setMap = (marker as any).setMap;
  if (typeof setMap === 'function') setMap.call(marker, map);
  else (marker as any).map = map;
};

const viewportOf = (map: google.maps.Map): { width: number; height: number } => {
  const rect = map.getDiv()?.getBoundingClientRect();
  return {
    width: Math.max(1, Math.round(rect?.width || 0) || 800),
    height: Math.max(1, Math.round(rect?.height || 0) || 600),
  };
};

/** Vector maps render fractional zoom; raster ones snap, so we quantise there. */
const rendersFractionalZoom = (map: google.maps.Map): boolean => {
  const getRenderingType = (map as any).getRenderingType;
  if (typeof getRenderingType !== 'function') return false;
  try {
    return String(getRenderingType.call(map)) === 'VECTOR';
  } catch {
    return false;
  }
};

const applyCamera = (map: google.maps.Map, camera: CameraTarget) => {
  const moveCamera = (map as any).moveCamera;
  if (typeof moveCamera === 'function') {
    moveCamera.call(map, { center: camera.center, zoom: camera.zoom });
    return;
  }
  map.setCenter(camera.center);
  map.setZoom(camera.zoom);
};

/** Injects the bubble, ripple, bloom and spider-leg keyframes once per document. */
export function injectClusterZoomStyles(): void {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes beClusterHalo {
      0%   { transform: scale(0.82); opacity: 0.55; }
      70%  { opacity: 0; }
      100% { transform: scale(1.6); opacity: 0; }
    }
    @keyframes beClusterRipple {
      0%   { transform: scale(0.6); opacity: 0.65; border-width: 3px; }
      100% { transform: scale(3.4); opacity: 0; border-width: 1px; }
    }
    @keyframes beClusterPress {
      0%   { transform: scale(1); }
      35%  { transform: scale(0.82); }
      70%  { transform: scale(1.14); }
      100% { transform: scale(1); }
    }
    @keyframes beMarkerBloom {
      0%   { transform: scale(0.2) translateY(10px); opacity: 0; }
      55%  { transform: scale(1.16) translateY(-3px); opacity: 1; }
      100% { transform: scale(1) translateY(0); opacity: 1; }
    }
    @keyframes beSpiderLegIn {
      0%   { transform: scale(0.35); opacity: 0; }
      100% { transform: scale(1); opacity: 1; }
    }

    .be-cluster {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 999px;
      color: #fff;
      font-family: Inter, system-ui, sans-serif;
      font-weight: 700;
      letter-spacing: -0.01em;
      cursor: pointer;
      user-select: none;
      background: radial-gradient(circle at 32% 28%, #2f8bff 0%, #0252CD 62%, #013a95 100%);
      border: 2px solid rgba(255,255,255,0.95);
      box-shadow: 0 2px 8px rgba(2,82,205,0.42), 0 1px 3px rgba(0,0,0,0.22);
      transition: transform 0.18s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.18s ease-out;
      will-change: transform;
    }
    .be-cluster:focus-visible {
      outline: 3px solid #ffffff;
      outline-offset: 3px;
    }
    .be-cluster:hover {
      transform: scale(1.14);
      box-shadow: 0 6px 16px rgba(2,82,205,0.5), 0 2px 5px rgba(0,0,0,0.3);
    }
    .be-cluster__count { position: relative; z-index: 2; }
    /* Slow breathing halo — signals "this is a group, it opens" without noise. */
    .be-cluster__halo {
      position: absolute;
      inset: -6px;
      border-radius: 999px;
      background: rgba(2, 82, 205, 0.35);
      animation: beClusterHalo 2.8s ease-out infinite;
      pointer-events: none;
      z-index: 0;
    }
    .be-cluster__ripple {
      position: absolute;
      inset: -4px;
      border-radius: 999px;
      border: 3px solid rgba(255,255,255,0.9);
      animation: beClusterRipple 620ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
      pointer-events: none;
      z-index: 1;
    }
    .be-cluster--activated {
      animation: beClusterPress 420ms cubic-bezier(0.22, 1, 0.36, 1);
      z-index: 3000;
    }

    /* Listings revealed by a cluster tap. The animation shorthand outranks the
       inline hover transform on the marker div, so a pin mid-bloom can't be
       left frozen at hover scale. */
    .be-marker-bloom {
      animation: beMarkerBloom ${BLOOM_DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1) both !important;
      animation-delay: var(--be-bloom-delay, 0ms) !important;
      will-change: transform, opacity;
    }

    .be-spider-pin {
      animation: beSpiderLegIn 320ms cubic-bezier(0.22, 1, 0.36, 1) both !important;
      animation-delay: var(--be-spider-delay, 0ms) !important;
      z-index: 2500 !important;
    }
    .be-cluster--spiderfied { opacity: 0.55; }
    .be-cluster--spiderfied .be-cluster__halo { animation: none; opacity: 0; }

    @media (prefers-reduced-motion: reduce) {
      .be-cluster__halo,
      .be-cluster__ripple { animation: none !important; opacity: 0 !important; }
      .be-cluster,
      .be-cluster:hover { transition: none !important; transform: none !important; }
      .be-cluster--activated,
      .be-marker-bloom,
      .be-spider-pin { animation: none !important; }
    }
  `;
  document.head.appendChild(style);
}

export interface ClusterRendererOptions {
  /** Screen-reader label for a bubble standing in for `count` listings. */
  getAriaLabel: (count: number) => string;
}

/**
 * The cluster bubble itself. Sized by magnitude, keyboard reachable (a bare div
 * with a click handler is invisible to assistive tech), and carrying the ripple
 * anchor the activation animation writes into.
 */
export function createClusterRenderer({ getAriaLabel }: ClusterRendererOptions) {
  return {
    render: ({ count, position }: { count: number; position: google.maps.LatLng }) => {
      injectClusterZoomStyles();

      const size = count < 10 ? 30 : count < 50 ? 34 : count < 100 ? 38 : 44;
      const bubble = document.createElement('div');
      bubble.className = 'be-cluster cluster-marker';
      bubble.dataset.clusterCount = String(count);
      bubble.style.width = `${size}px`;
      bubble.style.height = `${size}px`;
      bubble.style.fontSize = `${count < 100 ? 12 : 11}px`;

      const halo = document.createElement('span');
      halo.className = 'be-cluster__halo';
      halo.setAttribute('aria-hidden', 'true');

      const label = document.createElement('span');
      label.className = 'be-cluster__count';
      label.textContent = String(count);

      bubble.append(halo, label);

      bubble.setAttribute('role', 'button');
      bubble.tabIndex = 0;
      bubble.setAttribute('aria-label', getAriaLabel(count));
      // The clusterer listens for a click on the bubble; keyboard users get the
      // same entry point by re-issuing one.
      bubble.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        bubble.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
      });

      return new google.maps.marker.AdvancedMarkerElement({
        position,
        content: bubble,
        // Above individual pins: a bubble buried under a price pill is unclickable.
        zIndex: 1000 + Math.min(count, 500),
      });
    },
  };
}

/** Presses the bubble in and throws one expanding ring from it. */
function playActivationFeedback(bubble: HTMLElement | null): void {
  if (!bubble || prefersReducedMotion()) return;

  bubble.classList.remove('be-cluster--activated');
  // Force a reflow so a second tap restarts the animation instead of ignoring it.
  void bubble.offsetWidth;
  bubble.classList.add('be-cluster--activated');
  window.setTimeout(() => bubble.classList.remove('be-cluster--activated'), 460);

  const ripple = document.createElement('span');
  ripple.className = 'be-cluster__ripple';
  ripple.setAttribute('aria-hidden', 'true');
  bubble.appendChild(ripple);
  window.setTimeout(() => ripple.remove(), 680);
}

/**
 * Staggers the revealed pins in, nearest the cluster anchor first, so the
 * reveal reads as the bubble unpacking rather than a wall of pins appearing.
 */
function bloomMarkers(markers: AnyMarker[], anchor: LatLngLiteral): void {
  if (prefersReducedMotion()) return;

  const visible = markers
    .map((marker) => ({ el: contentOf(marker), position: positionOf(marker) }))
    .filter((entry): entry is { el: HTMLElement; position: LatLngLiteral } =>
      Boolean(entry.el && entry.position && entry.el.isConnected))
    .sort((a, b) => {
      const da = Math.hypot(a.position.lat - anchor.lat, a.position.lng - anchor.lng);
      const db = Math.hypot(b.position.lat - anchor.lat, b.position.lng - anchor.lng);
      return da - db;
    });

  if (visible.length === 0) return;

  const step = visible.length > 1 ? Math.min(48, MAX_BLOOM_STAGGER_MS / (visible.length - 1)) : 0;

  visible.forEach(({ el }, index) => {
    const delay = Math.round(index * step);
    el.style.setProperty('--be-bloom-delay', `${delay}ms`);
    el.classList.add('be-marker-bloom');
    window.setTimeout(() => {
      el.classList.remove('be-marker-bloom');
      el.style.removeProperty('--be-bloom-delay');
    }, delay + BLOOM_DURATION_MS + 60);
  });
}

interface FlyOptions {
  onArrive?: () => void;
}

/** Runs the flight path frame by frame. Returns a cancel handle. */
function flyCamera(
  map: google.maps.Map,
  to: CameraTarget,
  { onArrive }: FlyOptions = {},
): () => void {
  const currentCenter = map.getCenter();
  const from: CameraTarget = {
    center: currentCenter
      ? { lat: currentCenter.lat(), lng: currentCenter.lng() }
      : to.center,
    zoom: map.getZoom() ?? to.zoom,
  };

  const fractional = rendersFractionalZoom(map);
  // A raster map can only land on an integer zoom, so aim at one from the start
  // rather than letting the final frame snap the camera sideways.
  const target: CameraTarget = fractional ? to : { center: to.center, zoom: Math.round(to.zoom) };

  if (prefersReducedMotion() || typeof window.requestAnimationFrame !== 'function') {
    applyCamera(map, target);
    onArrive?.();
    return () => {};
  }

  const { durationMs, at } = createFlightPath({
    from,
    to: target,
    viewportWidth: viewportOf(map).width,
  });

  let frame = 0;
  let cancelled = false;
  const start = performance.now();

  // Whoever grabs the map owns it: a drag or a wheel zoom mid-flight ends the
  // animation where it stands rather than fighting the visitor for the camera.
  const mapDiv = map.getDiv();
  const listeners: google.maps.MapsEventListener[] = [];
  const cancel = () => {
    if (cancelled) return;
    cancelled = true;
    window.cancelAnimationFrame(frame);
    listeners.forEach((listener) => listener.remove());
    mapDiv?.removeEventListener('wheel', cancel);
  };

  listeners.push(map.addListener('dragstart', cancel));
  mapDiv?.addEventListener('wheel', cancel, { passive: true });

  const step = (now: number) => {
    if (cancelled) return;
    const t = Math.min(1, (now - start) / durationMs);
    const camera = at(t);
    applyCamera(map, {
      center: camera.center,
      zoom: fractional ? camera.zoom : Math.round(camera.zoom),
    });

    if (t < 1) {
      frame = window.requestAnimationFrame(step);
      return;
    }
    cancel();
    onArrive?.();
  };

  frame = window.requestAnimationFrame(step);

  return cancel;
}

interface SpiderfyOptions {
  map: google.maps.Map;
  anchor: LatLngLiteral;
  markers: AnyMarker[];
  bubble: HTMLElement | null;
  /** Re-runs the clusterer once the legs fold back in. */
  onCollapsed: () => void;
}

/**
 * Last resort for pins no zoom level can pull apart: fan them out on leader
 * lines around their shared anchor. Positions are restored on collapse, so the
 * clusterer's own view of the world is never left mutated.
 */
function spiderfy({ map, anchor, markers, bubble, onCollapsed }: SpiderfyOptions): () => void {
  const zoom = map.getZoom() ?? 18;
  const scale = Math.pow(2, zoom);
  const anchorWorld = projectToWorld(anchor);
  const offsets = spiderLayout(markers.length);

  const originalPositions = new Map<AnyMarker, LatLngLiteral | null>();
  const legs: google.maps.Polyline[] = [];

  markers.forEach((marker, index) => {
    const offset = offsets[index];
    if (!offset) return;

    originalPositions.set(marker, positionOf(marker));
    const target = unprojectFromWorld({
      x: anchorWorld.x + offset.x / scale,
      y: anchorWorld.y + offset.y / scale,
    });

    setMarkerPosition(marker, target);
    setMarkerMap(marker, map);

    const el = contentOf(marker);
    if (el) {
      el.style.setProperty('--be-spider-delay', `${Math.min(index * 22, 260)}ms`);
      el.classList.add('be-spider-pin');
    }

    legs.push(
      new google.maps.Polyline({
        map,
        path: [anchor, target],
        clickable: false,
        strokeColor: '#0252CD',
        strokeOpacity: 0.5,
        strokeWeight: 1.5,
        zIndex: 1,
      }),
    );
  });

  bubble?.classList.add('be-cluster--spiderfied');

  let collapsed = false;
  const listeners: google.maps.MapsEventListener[] = [];

  const collapse = () => {
    if (collapsed) return;
    collapsed = true;

    listeners.forEach((listener) => listener.remove());
    window.removeEventListener('keydown', onKeyDown);
    legs.forEach((leg) => leg.setMap(null));
    bubble?.classList.remove('be-cluster--spiderfied');

    originalPositions.forEach((position, marker) => {
      const el = contentOf(marker);
      if (el) {
        el.classList.remove('be-spider-pin');
        el.style.removeProperty('--be-spider-delay');
      }
      if (position) setMarkerPosition(marker, position);
      // Hand the pin back to the clusterer, which owns its visibility again.
      setMarkerMap(marker, null);
    });

    onCollapsed();
  };

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') collapse();
  }

  listeners.push(map.addListener('zoom_changed', collapse));
  listeners.push(map.addListener('dragstart', collapse));
  listeners.push(map.addListener('click', collapse));
  window.addEventListener('keydown', onKeyDown);

  return collapse;
}

export interface ClusterActivationOptions {
  /** The clusterer, so a collapsed spider can hand its pins back. */
  getClusterer: () => { render: () => void } | null;
  /** Map's own zoom ceiling — the camera never asks for more than this. */
  maxZoom?: number;
  /** Zoom the camera settles at when pins can only be separated by spiderfying. */
  spiderfyZoom?: number;
}

export interface ClusterActivation {
  /** Hand straight to `MarkerClusterer`'s `onClusterClick`. */
  onClusterClick: (
    event: google.maps.MapMouseEvent,
    cluster: ClusterLike,
    map: google.maps.Map,
  ) => void;
  /**
   * Folds any open spider, restoring the pins the clusterer owns. Safe to call
   * during a flight — a marker refresh must not yank the camera out of the air.
   */
  collapse: () => void;
  /** Everything `collapse` does, plus cancelling an in-flight animation. */
  reset: () => void;
}

/**
 * Builds the cluster click behaviour. One activation object owns the whole
 * interaction so a second tap mid-flight cleanly supersedes the first instead
 * of racing it.
 */
export function createClusterActivation({
  getClusterer,
  maxZoom = 21,
  spiderfyZoom = 18,
}: ClusterActivationOptions): ClusterActivation {
  let cancelFlight: (() => void) | null = null;
  let collapseSpider: (() => void) | null = null;
  let arrivalListener: google.maps.MapsEventListener | null = null;
  let arrivalTimer: ReturnType<typeof setTimeout> | null = null;

  const collapse = () => {
    collapseSpider?.();
    collapseSpider = null;
  };

  const clearPending = () => {
    cancelFlight?.();
    cancelFlight = null;
    collapse();
    arrivalListener?.remove();
    arrivalListener = null;
    if (arrivalTimer) clearTimeout(arrivalTimer);
    arrivalTimer = null;
  };

  /**
   * The clusterer only re-renders once the map settles, so the pins we want to
   * animate don't exist at the moment the flight ends. Wait for `idle`, with a
   * timer as a backstop in case it never fires (map torn down mid-flight).
   */
  const afterMapSettles = (map: google.maps.Map, run: () => void) => {
    let done = false;
    const fire = () => {
      if (done) return;
      done = true;
      arrivalListener?.remove();
      arrivalListener = null;
      if (arrivalTimer) clearTimeout(arrivalTimer);
      arrivalTimer = null;
      run();
    };
    arrivalListener = google.maps.event.addListenerOnce(map, 'idle', fire);
    arrivalTimer = setTimeout(fire, 900);
  };

  const onClusterClick = (
    event: google.maps.MapMouseEvent,
    cluster: ClusterLike,
    map: google.maps.Map,
  ) => {
    clearPending();

    const bubble = contentOf(cluster.marker);
    playActivationFeedback(bubble);

    const members = cluster.markers ?? [];
    const memberPositions = members.map(positionOf);
    const clickPosition = event.latLng
      ? { lat: event.latLng.lat(), lng: event.latLng.lng() }
      : positionOf(cluster.marker);

    const currentZoom = map.getZoom() ?? 10;
    const bounds = boundsOfPositions(memberPositions);

    // No usable member coordinates — still honour the tap with a plain zoom in
    // on wherever the visitor pressed, rather than doing nothing.
    if (!bounds) {
      if (!clickPosition) return;
      cancelFlight = flyCamera(map, {
        center: clickPosition,
        zoom: Math.min(maxZoom, currentZoom + 3),
      });
      return;
    }

    const anchor = { lat: (bounds.north + bounds.south) / 2, lng: (bounds.east + bounds.west) / 2 };
    const fit = cameraForBounds({
      bounds,
      viewport: viewportOf(map),
      padding: CLUSTER_FIT_PADDING,
      maxZoom,
    });

    // Zooming can't split pins this close together, however far we go.
    const needsSpiderfy = fit.requiredZoom > maxZoom;

    const targetZoom = needsSpiderfy
      ? Math.min(maxZoom, Math.max(currentZoom + 2, spiderfyZoom))
      // A cluster already filling the viewport fits at barely more than the
      // current zoom; nudge past it so the tap always breaks the cluster up
      // instead of looking like nothing happened.
      : Math.min(maxZoom, Math.max(fit.zoom, currentZoom + 1));

    cancelFlight = flyCamera(
      map,
      { center: fit.center, zoom: targetZoom },
      {
        onArrive: () => {
          cancelFlight = null;
          afterMapSettles(map, () => {
            if (needsSpiderfy) {
              collapseSpider = spiderfy({
                map,
                anchor,
                markers: members,
                bubble,
                onCollapsed: () => {
                  collapseSpider = null;
                  getClusterer()?.render();
                },
              });
              return;
            }
            bloomMarkers(members, anchor);
          });
        },
      },
    );
  };

  return { onClusterClick, collapse, reset: clearPending };
}
