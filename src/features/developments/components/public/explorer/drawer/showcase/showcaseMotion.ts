/** A box on screen, in CSS pixels (a `DOMRect` fits). */
export interface ScreenBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** One pose of the floor-plan model (framer-motion values; a type alias so it fits motion's target type). */
export type PlanPose = {
  x: number;
  y: number;
  scale: number;
  rotateX: number;
  rotateZ: number;
  opacity: number;
};

/**
 * The model's two resting poses. "Tilted" lays the plan back and turns it like
 * an architect's model on a table; it is drawn a little smaller there because
 * the turned plan's corners reach further out than the flat one's.
 */
export const PLAN_POSES: Record<'tilted' | 'flat', PlanPose> = {
  tilted: { x: 0, y: 0, scale: 0.8, rotateX: 52, rotateZ: -34, opacity: 1 },
  flat: { x: 0, y: 0, scale: 1, rotateX: 0, rotateZ: 0, opacity: 1 },
};

/** With nowhere to rise from, the plan comes up from just below its place. */
const RISE_FROM_BELOW: PlanPose = { x: 0, y: 48, scale: 0.92, rotateX: 0, rotateZ: 0, opacity: 0 };

/**
 * Where the plan starts its rise: lying flat right on top of the apartment
 * the buyer clicked (`origin`, its box on the facade), shrunk to its size,
 * so the apartment seems to lift out of the building into the plan's place
 * (`target`). Without an origin it rises from just below.
 */
export function riseFrom(origin: ScreenBox | null, target: ScreenBox | null): PlanPose {
  if (!origin || !target || origin.width <= 0 || origin.height <= 0 || target.width <= 0 || target.height <= 0) return RISE_FROM_BELOW;
  const scale = Math.min(1, Math.max(0.04, Math.max(origin.width / target.width, origin.height / target.height)));
  return {
    x: Math.round(origin.left + origin.width / 2 - (target.left + target.width / 2)),
    y: Math.round(origin.top + origin.height / 2 - (target.top + target.height / 2)),
    scale,
    rotateX: 0,
    rotateZ: 0,
    opacity: 0,
  };
}

/** True when some of the box is inside a viewport of the given size. */
export const isOnScreen = (box: ScreenBox, viewport: { width: number; height: number }): boolean =>
  box.width > 0 && box.height > 0 && box.left < viewport.width && box.top < viewport.height && box.left + box.width > 0 && box.top + box.height > 0;

/**
 * The apartment's box where the buyer last saw it (its region on the explorer
 * picture, or its cell in the floor-by-floor grid), when it is on screen.
 */
export function apartmentBox(unitId: string): ScreenBox | null {
  if (typeof document === 'undefined') return null;
  const viewport = { width: window.innerWidth, height: window.innerHeight };
  for (const el of Array.from(document.querySelectorAll(`[data-unit-id="${CSS.escape(unitId)}"]`))) {
    const r = el.getBoundingClientRect();
    if (isOnScreen(r, viewport)) return { left: r.left, top: r.top, width: r.width, height: r.height };
  }
  return null;
}
