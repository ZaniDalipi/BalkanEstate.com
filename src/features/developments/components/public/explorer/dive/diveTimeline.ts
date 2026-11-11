import type { FlyOptions } from '../../../../hooks/usePanZoom';

/**
 * The flight into an apartment, step by step (ms from the click on "View
 * apartment"), modelled on a drone shot into a window:
 *
 *  0            the page's controls fade; "Back to building" and "Skip" appear
 *  0 → FLIGHT   the camera climbs and pushes in towards the apartment
 *  GHOST_AT     the building turns into a white architectural model; only
 *               the apartment keeps its colour
 *  OPEN_AT      the apartment opens: the paper settles, the floor plan rises
 *               out of the window and the details card slides in
 */
export const DIVE = {
  FLIGHT_MS: 2100,
  GHOST_AT: 1250,
  OPEN_AT: 2250,
  /** The way back out to the building, once the apartment closes. */
  RETURN_MS: 1400,
} as const;

/** The apartment ends up filling about a third of the frame; capped so the rendering stays sharp. */
export const DIVE_ZOOM: FlyOptions = { fill: 0.3, maxScale: 2.6 };

/** Where the dive is: flying in, turning the building into a model, or the apartment is open. */
export type DivePhase = 'flight' | 'ghost' | 'open';
