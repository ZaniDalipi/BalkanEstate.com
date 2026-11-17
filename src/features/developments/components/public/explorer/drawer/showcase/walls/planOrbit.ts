/** Turning the floor-plan model round and tilting it, from a drag (pure). */

export interface Orbit {
  /** Degrees turned on the table, added to the resting pose (any value; full turns allowed). */
  turn: number;
  /** Degrees the plan is laid back: 0 = facing the buyer, 90 = edge on. */
  tilt: number;
}

export const ORBIT_TILT = { min: 20, max: 72, rest: 52 } as const;
export const ORBIT_REST: Orbit = { turn: 0, tilt: ORBIT_TILT.rest };

/** Degrees per pixel dragged. */
const TURN_PER_PX = 0.45;
const TILT_PER_PX = 0.25;

const clampTilt = (tilt: number) => Math.min(ORBIT_TILT.max, Math.max(ORBIT_TILT.min, tilt));

/** Where a drag of (dx, dy) pixels from `start` leaves the model: across turns it, down lays it back further. */
export const orbitByDrag = (start: Orbit, dx: number, dy: number): Orbit => ({
  turn: start.turn + dx * TURN_PER_PX,
  tilt: clampTilt(start.tilt + dy * TILT_PER_PX),
});

/** A step from the turn buttons or arrow keys. */
export const orbitBy = (o: Orbit, turn: number, tilt = 0): Orbit => ({ turn: o.turn + turn, tilt: clampTilt(o.tilt + tilt) });
