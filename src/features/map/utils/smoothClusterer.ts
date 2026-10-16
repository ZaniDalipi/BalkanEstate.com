/**
 * smoothClusterer — cluster re-renders that move instead of popping.
 *
 * Stock `MarkerClusterer` swaps the whole cluster layer on every `idle`: old
 * bubbles vanish, new bubbles and pins appear, and on a pinch zoom that reads
 * as the map flickering. This subclass diffs the clusters before and after
 * each re-render and animates the difference:
 *
 *   zoom in  (split) → the old bubble fades out and its listings fly out of it
 *                      to their own positions
 *   zoom out (merge) → the pins and bubbles being absorbed fly into the new
 *                      bubble, which scales in where they meet
 *   unchanged        → a bubble with the same listings keeps its DOM element,
 *                      so nothing flashes at all
 *   data refresh     → a bubble whose count changed glides to its new spot,
 *                      dropped listings fade out, new ones fade in
 *
 * Animations run through the Web Animations API, which composes over the
 * inline hover transforms the marker divs carry and leaves no style behind.
 * `prefers-reduced-motion` turns every transition back into a plain swap.
 */

import {
  ClusterStats,
  MarkerClusterer,
  MarkerClustererEvents,
  MarkerUtils,
  type Cluster,
  type Marker,
  type MarkerClustererOptions,
} from '@googlemaps/markerclusterer';

const ENTER_MS = 380;
const EXIT_MS = 300;
const EASE_OUT = 'cubic-bezier(0.22, 1, 0.36, 1)';
const EASE_IN = 'cubic-bezier(0.4, 0, 1, 1)';

/** Pins further than this (in viewport widths) don't fly — they just fade. */
const MAX_FLIGHT_VIEWPORTS = 1.2;

/** The smallest description of a rendered cluster the planner needs. */
export interface ClusterSnapshot<M> {
  members: readonly M[];
}

export type EnterPlan =
  | { kind: 'reuse'; from: number }
  | { kind: 'morph'; from: number }
  | { kind: 'split'; from: number }
  | { kind: 'appear' };
export type ExitPlan =
  | { kind: 'merge'; into: number }
  | { kind: 'replaced' }
  | { kind: 'fade' }
  | { kind: 'kept' };

export interface TransitionPlan {
  /** One entry per new cluster, indexed like the `next` input. */
  enter: EnterPlan[];
  /** One entry per old cluster, indexed like the `prev` input. */
  exit: ExitPlan[];
}

const sameMembers = <M>(a: readonly M[], b: readonly M[]): boolean => {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((m) => set.has(m));
};

/**
 * Pure diff between two cluster layouts.
 *
 * - reuse: identical listings — the bubble stays exactly as it is.
 * - morph: a bubble that mostly holds the same listings as an old bubble
 *   (a refresh added or dropped a few) is the same bubble with a new count,
 *   so it slides from the old spot with no fade or pulse.
 * - split: every listing came out of one bigger old cluster, so it flies out
 *   from there.
 * - merge: every listing of an old cluster went into one new cluster, so the
 *   old one flies into it.
 * - anything else (fresh data, regrouping across clusters) fades.
 */
export function planClusterTransition<M>(
  prev: readonly ClusterSnapshot<M>[],
  next: readonly ClusterSnapshot<M>[],
): TransitionPlan {
  const prevOf = new Map<M, number>();
  prev.forEach((cluster, index) => cluster.members.forEach((m) => prevOf.set(m, index)));
  const nextOf = new Map<M, number>();
  next.forEach((cluster, index) => cluster.members.forEach((m) => nextOf.set(m, index)));

  const kept = new Set<number>();
  const morphed = new Set<number>();

  const enter: EnterPlan[] = next.map((cluster) => {
    // The old cluster this one shares the most listings with.
    const shared = new Map<number, number>();
    cluster.members.forEach((m) => {
      const from = prevOf.get(m);
      if (from !== undefined) shared.set(from, (shared.get(from) ?? 0) + 1);
    });
    let from = -1;
    let overlap = 0;
    shared.forEach((count, index) => {
      if (count > overlap) {
        from = index;
        overlap = count;
      }
    });
    if (from < 0) return { kind: 'appear' };

    const source = prev[from].members;
    if (overlap === cluster.members.length && sameMembers(source, cluster.members)) {
      kept.add(from);
      return { kind: 'reuse', from };
    }
    const bothGroups = source.length > 1 && cluster.members.length > 1;
    if (
      bothGroups &&
      !morphed.has(from) &&
      overlap * 2 > source.length &&
      overlap * 2 > cluster.members.length
    ) {
      morphed.add(from);
      return { kind: 'morph', from };
    }
    if (overlap === cluster.members.length) return { kind: 'split', from };
    return { kind: 'appear' };
  });

  const exit: ExitPlan[] = prev.map((cluster, index) => {
    if (kept.has(index)) return { kind: 'kept' };
    if (morphed.has(index)) return { kind: 'replaced' };
    const first = cluster.members[0];
    const into = first === undefined ? undefined : nextOf.get(first);
    if (into !== undefined && cluster.members.every((m) => nextOf.get(m) === into)) {
      return { kind: 'merge', into };
    }
    return { kind: 'fade' };
  });

  return { enter, exit };
}

const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const contentOf = (marker: Marker | undefined): HTMLElement | null => {
  const content = (marker as any)?.content;
  return content instanceof HTMLElement ? content : null;
};

const canAnimate = (el: HTMLElement | null): el is HTMLElement =>
  Boolean(el && typeof el.animate === 'function');

export class SmoothMarkerClusterer extends MarkerClusterer {
  /** Markers mid fly-out, removed from the map when their animation ends. */
  private exiting = new Map<Marker, Animation>();

  constructor(options: MarkerClustererOptions) {
    super(options);
  }

  render(): void {
    const map = this.getMap();
    if (!(map instanceof google.maps.Map) || !map.getProjection()) return;

    google.maps.event.trigger(this, MarkerClustererEvents.CLUSTERING_BEGIN, this);
    const { clusters, changed } = this.algorithm.calculate({
      markers: this.markers,
      map,
      mapCanvasProjection: this.getProjection(),
    });

    if (changed || changed === undefined) {
      const prev = this.clusters.filter((cluster) => cluster.marker != null);
      this.swapClusters(prev, clusters, map, !prefersReducedMotion());
    }

    google.maps.event.trigger(this, MarkerClustererEvents.CLUSTERING_END, this);
  }

  /**
   * A listing dropped by a data refresh fades out instead of blinking off.
   * Only a pin actually on screen needs that; one folded inside a bubble just
   * leaves, and the bubble's count updates on the next render.
   */
  removeMarker(marker: Marker, noDraw?: boolean): boolean {
    const onScreen = !prefersReducedMotion() &&
      this.clusters.some((cluster) => cluster.markers.length === 1 && cluster.marker === marker);
    if (!onScreen) return super.removeMarker(marker, noDraw);

    const index = this.markers.indexOf(marker);
    if (index === -1) return false;
    this.markers.splice(index, 1);
    this.animateOut(marker, MarkerUtils.getPosition(marker), null);
    if (!noDraw) this.render();
    return true;
  }

  onRemove(): void {
    this.exiting.forEach((animation) => animation.cancel());
    this.exiting.clear();
    super.onRemove();
  }

  private swapClusters(prev: Cluster[], next: Cluster[], map: google.maps.Map, animate: boolean) {
    // Nothing on screen yet (first load, or a search that had no results):
    // ease everything in rather than popping it on.
    const firstPaint = prev.length === 0;
    let bubbleIndex = 0;

    const snapshot = (cluster: Cluster) => ({ members: cluster.markers ?? [] });
    const plan = planClusterTransition(prev.map(snapshot), next.map(snapshot));

    // Singletons render their own marker; everything else gets a bubble.
    const shownSingles = new Set<Marker>();
    next.forEach((cluster) => {
      if (cluster.markers.length === 1) shownSingles.add(cluster.markers[0]);
    });

    // Pins on screen right now leave through the exit pass below, not here.
    const prevSingles = new Set<Marker>();
    prev.forEach((cluster) => {
      if (cluster.markers.length === 1) prevSingles.add(cluster.markers[0]);
    });

    // A marker flying out that is wanted again stops where it is and stays.
    shownSingles.forEach((marker) => {
      const animation = this.exiting.get(marker);
      if (!animation) return;
      this.exiting.delete(marker);
      animation.cancel();
    });

    this.clusters = next;
    const stats = new ClusterStats(this.markers, next);

    next.forEach((cluster, index) => {
      const enter = plan.enter[index];
      if (cluster.markers.length === 1) {
        cluster.marker = cluster.markers[0];
      } else if (enter.kind === 'reuse' && prev[enter.from].marker) {
        // Same listings, same bubble — keep the element so it doesn't flash.
        // Its click handler stays bound to the old cluster, which holds the
        // same listings and the same bubble, so taps behave identically.
        cluster.marker = prev[enter.from].marker;
      } else {
        cluster.marker = this.renderer.render(cluster, stats, map);
        this.bindClusterClick(cluster, map);
      }

      // Members of a bubble never show individually.
      if (cluster.markers.length > 1) {
        cluster.markers.forEach((marker) => {
          if (!this.exiting.has(marker) && !prevSingles.has(marker)) MarkerUtils.setMap(marker, null);
        });
      }

      MarkerUtils.setMap(cluster.marker!, map);

      if (!animate || enter.kind === 'reuse') return;
      if (firstPaint) {
        // Pins already running the page's fly-in keep it; everything else
        // eases in, lightly staggered.
        if (!contentOf(cluster.marker)?.classList.contains('gmarker-entrance-fly')) {
          this.animateIn(cluster.marker!, cluster.position, null, Math.min(bubbleIndex++ * 35, 280));
        }
        return;
      }
      if (enter.kind === 'morph') {
        this.slideIn(cluster.marker!, cluster.position, prev[enter.from].position);
        return;
      }
      const origin = enter.kind === 'split' ? prev[enter.from].position : null;
      this.animateIn(cluster.marker!, cluster.position, origin);
    });

    prev.forEach((cluster, index) => {
      const exit = plan.exit[index];
      const marker = cluster.marker;
      if (exit.kind === 'kept' || !marker) return;
      // Still a visible singleton in the new layout — leave it alone.
      if (shownSingles.has(marker)) return;

      if (exit.kind === 'replaced') {
        // Its successor is already drawn on top, sliding from this spot; drop
        // the old bubble a frame later so there's never a gap between them.
        requestAnimationFrame(() => MarkerUtils.setMap(marker, null));
        return;
      }
      const target = exit.kind === 'merge' ? next[exit.into].position : null;
      if (animate) this.animateOut(marker, cluster.position, target);
      else MarkerUtils.setMap(marker, null);
    });
  }

  /** The click handler stock `renderClusters` would attach. */
  private bindClusterClick(cluster: Cluster, map: google.maps.Map) {
    if (!this.onClusterClick || !cluster.marker) return;
    const eventName = MarkerUtils.isAdvancedMarker(cluster.marker)
      ? MarkerClustererEvents.GMP_CLICK
      : MarkerClustererEvents.CLUSTER_CLICK;
    cluster.marker.addListener(eventName, (event: google.maps.MapMouseEvent) => {
      google.maps.event.trigger(this, MarkerClustererEvents.CLUSTER_CLICK, cluster);
      this.onClusterClick(event, cluster, map);
    });
  }

  /** Screen offset from `to` to `from`, or null when it isn't worth flying. */
  private offsetBetween(from: google.maps.LatLng, to: google.maps.LatLng): { x: number; y: number } | null {
    const projection = this.getProjection();
    if (!projection) return null;
    const a = projection.fromLatLngToDivPixel(from);
    const b = projection.fromLatLngToDivPixel(to);
    if (!a || !b) return null;
    const x = a.x - b.x;
    const y = a.y - b.y;
    const map = this.getMap();
    const width = (map instanceof google.maps.Map && map.getDiv().clientWidth) || 800;
    if (Math.hypot(x, y) > width * MAX_FLIGHT_VIEWPORTS) return null;
    return { x, y };
  }

  /** Same bubble, new count: glide from where it was, no fade or pulse. */
  private slideIn(marker: Marker, position: google.maps.LatLng, origin: google.maps.LatLng) {
    const el = contentOf(marker);
    if (!canAnimate(el)) return;
    const offset = this.offsetBetween(origin, position);
    if (!offset || (offset.x === 0 && offset.y === 0)) return;
    el.animate(
      [
        { transform: `translate(${offset.x}px, ${offset.y}px)` },
        { transform: 'translate(0, 0)' },
      ],
      { duration: ENTER_MS, easing: EASE_OUT, fill: 'backwards' },
    );
  }

  private animateIn(
    marker: Marker,
    position: google.maps.LatLng,
    origin: google.maps.LatLng | null,
    delay = 0,
  ) {
    const el = contentOf(marker);
    if (!canAnimate(el)) return;
    const offset = origin ? this.offsetBetween(origin, position) : null;
    const start = offset
      ? `translate(${offset.x}px, ${offset.y}px) scale(0.55)`
      : 'scale(0.6)';
    el.animate(
      [
        { transform: start, opacity: 0 },
        { transform: 'translate(0, 0) scale(1)', opacity: 1 },
      ],
      { duration: ENTER_MS, easing: EASE_OUT, delay, fill: 'backwards' },
    );
  }

  private animateOut(marker: Marker, position: google.maps.LatLng, target: google.maps.LatLng | null) {
    if (this.exiting.has(marker)) return; // already on its way out
    const el = contentOf(marker);
    if (!canAnimate(el)) {
      MarkerUtils.setMap(marker, null);
      return;
    }
    const offset = target ? this.offsetBetween(target, position) : null;
    const end = offset
      ? `translate(${offset.x}px, ${offset.y}px) scale(0.5)`
      : 'scale(1.15)';

    // A pin on its way out must not catch a tap meant for what replaces it.
    const pointerEvents = el.style.pointerEvents;
    el.style.pointerEvents = 'none';

    const animation = el.animate(
      [
        { transform: 'translate(0, 0) scale(1)', opacity: 1 },
        { transform: end, opacity: 0 },
      ],
      { duration: EXIT_MS, easing: offset ? EASE_OUT : EASE_IN, fill: 'forwards' },
    );
    this.exiting.set(marker, animation);

    const settle = () => {
      el.style.pointerEvents = pointerEvents;
      if (this.exiting.get(marker) !== animation) return; // re-shown meanwhile
      this.exiting.delete(marker);
      // A spiderfied pin was put back on the map on purpose.
      if (!el.classList.contains('be-spider-pin')) MarkerUtils.setMap(marker, null);
      animation.cancel();
    };
    animation.onfinish = settle;
    animation.oncancel = () => {
      el.style.pointerEvents = pointerEvents;
    };
  }
}
