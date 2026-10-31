/**
 * Region outlines for the Plaza demo renders (public/demo/plaza), in pixels of
 * each picture. Traced by overlaying them on the renders; `normalise()` turns
 * them into the 0–1 points the explorer stores.
 */
import type { Point } from './seedSupport';

export const PLAZA_IMAGES = {
  residenceAerial: { path: '/demo/plaza/residence-aerial.webp', width: 1343, height: 1171 },
  residenceAerialEast: { path: '/demo/plaza/residence-aerial-east.webp', width: 1343, height: 1171 },
  towerFront: { path: '/demo/plaza/tower-front.webp', width: 1024, height: 1536 },
  towerModel: { path: '/demo/plaza/tower-model.webp', width: 1536, height: 1024 },
  duplexFloorplan: { path: '/demo/plaza/duplex-floorplan.webp', width: 1024, height: 1536 },
} as const;

/** Residential floors of the tower, bottom to top (the podium holds levels 0–2). */
export const TOWER_FIRST_LEVEL = 3;
export const TOWER_TOP_LEVEL = 24;
export const TOWER_UNITS_PER_FLOOR = 4;

/** Residence pictures: the tower and the podium wings (one region each). */
export const RESIDENCE_AERIAL = {
  tower: [[490, 70], [882, 72], [878, 688], [745, 778], [745, 995], [680, 985], [500, 905]] as Point[],
  podium: [
    [[335, 752], [490, 684], [495, 905], [340, 860]] as Point[],
    [[745, 778], [878, 688], [1105, 735], [1160, 800], [1150, 995], [1050, 1100], [745, 995]] as Point[],
  ],
};

export const RESIDENCE_AERIAL_EAST = {
  tower: [[475, 82], [498, 70], [852, 48], [872, 60], [858, 605], [835, 628], [835, 912], [700, 905], [700, 822], [575, 735], [500, 692]] as Point[],
  podium: [
    [[290, 822], [322, 752], [500, 692], [575, 735], [700, 822], [700, 905], [790, 935], [795, 1080], [590, 1150], [292, 885]] as Point[],
    [[835, 628], [860, 606], [978, 648], [985, 770], [835, 860]] as Point[],
  ],
};

/** Front facade: a grid of apartment cells, level 3 at the bottom. */
const FRONT = { x0: 307, x1: 641, top: 172, bottom: 1105, inset: 3 };
const residentialFloors = TOWER_TOP_LEVEL - TOWER_FIRST_LEVEL + 1;

/** Cell of apartment `pos` (1-based) on `level`, spanning `span` columns. */
export const frontCell = (level: number, pos: number, span = 1): Point[] => {
  const h = (FRONT.bottom - FRONT.top) / residentialFloors;
  const w = (FRONT.x1 - FRONT.x0) / TOWER_UNITS_PER_FLOOR;
  const y1 = FRONT.bottom - (level - TOWER_FIRST_LEVEL) * h;
  const y0 = y1 - h;
  const x0 = FRONT.x0 + (pos - 1) * w;
  const x1 = x0 + span * w;
  const i = FRONT.inset;
  return [[x0 + i, y0 + i], [x1 - i, y0 + i], [x1 - i, y1 - i], [x0 + i, y1 - i]];
};

/** The podium as seen on the front facade. */
export const FRONT_PODIUM: Point[] = [[127, 1110], [305, 1110], [305, 1100], [643, 1100], [643, 1080], [948, 1080], [948, 1230], [127, 1232]];

/** Model view: the tower's three visible vertical edges (top → bottom). */
const EDGES: [Point, Point][] = [
  [[566, 45], [600, 870]],
  [[662, 102], [668, 925]],
  [[957, 77], [935, 850]],
];
const BAND = { from: 0.1, to: 0.9 };
const along = ([a, b]: [Point, Point], t: number): Point => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

/** A band wrapping both visible faces of the tower for `level`. */
export const modelFloorBand = (level: number): Point[] => {
  const i = TOWER_TOP_LEVEL - level;
  const a = BAND.from + ((BAND.to - BAND.from) * i) / residentialFloors;
  const b = BAND.from + ((BAND.to - BAND.from) * (i + 1)) / residentialFloors;
  const top = EDGES.map((e) => along(e, a));
  const bottom = EDGES.map((e) => along(e, b)).reverse();
  return [...top, ...bottom];
};

/**
 * Parking bays along the street on the left of the tower picture (the lane
 * nearest the tower, running up to the right): four car-sized parallelograms,
 * each sold with a tower apartment in the demo.
 */
const ROAD = { along: [0.68, -0.73] as const, across: [0.73, 0.68] as const };
const bay = (cx: number, cy: number): Point => [cx, cy];
export const PARKING_BAY_CENTRES: Point[] = [bay(75, 1065), bay(112, 1035), bay(150, 1005), bay(186, 976)];
export const parkingBay = ([cx, cy]: Point, halfLength = 15, halfWidth = 8): Point[] => {
  const [ax, ay] = [ROAD.along[0] * halfLength, ROAD.along[1] * halfLength];
  const [bx, by] = [ROAD.across[0] * halfWidth, ROAD.across[1] * halfWidth];
  return [
    [cx - ax - bx, cy - ay - by],
    [cx + ax - bx, cy + ay - by],
    [cx + ax + bx, cy + ay + by],
    [cx - ax + bx, cy - ay + by],
  ];
};
