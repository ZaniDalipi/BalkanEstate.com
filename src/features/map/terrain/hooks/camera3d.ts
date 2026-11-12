/** What the 3D window's camera buttons can do (see Camera3DControls). */
export interface Camera3D {
  zoomIn: () => void;
  zoomOut: () => void;
  turnLeft: () => void;
  turnRight: () => void;
  /** Whether the view is tilted (the 2D/3D button then offers straight down). */
  tilted: boolean;
  toggleTilt: () => void;
  reset: () => void;
  orbiting: boolean;
  toggleOrbit: () => void;
  /** No fly-around under reduced motion. */
  canOrbit: boolean;
}
