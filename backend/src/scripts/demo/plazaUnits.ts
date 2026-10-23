/**
 * The Plaza demo's apartments and commercial units as plain data, so the seed
 * only has to write them. Deterministic (no randomness): every run produces
 * the same residence, which keeps screenshots and tests stable.
 */
import { TOWER_FIRST_LEVEL, TOWER_TOP_LEVEL } from './plazaGeometry';

export interface PlazaUnitSpec {
  unitNumber: string;
  level: number;
  /** Facade column (1–4) and how many columns the unit spans there. */
  pos: number;
  span: number;
  /** Extra facade levels that also show this unit (the upper level of a duplex). */
  alsoOnLevels: number[];
  unitType: string;
  beds: number;
  baths: number;
  livingRooms: number;
  netArea: number;
  totalArea: number;
  terraceArea?: number;
  balconies?: number;
  orientation: string;
  viewType: string;
  features: string[];
  price: number;
  pricePerSqm: number;
  priceVisibility: 'public' | 'on_request';
  availability: 'available' | 'reserved' | 'sold' | 'not_released';
  description: string;
  hasFloorplan: boolean;
}

/** Levels whose columns 1 and 4 are duplexes continuing on the floor above. */
export const DUPLEX_LEVEL = 21;

const LAYOUTS = [
  { pos: 1, beds: 3, baths: 2, net: 104, total: 118, balconies: 2, orientation: 'southWest', view: 'city', corner: true },
  { pos: 2, beds: 1, baths: 1, net: 51, total: 58, balconies: 1, orientation: 'south', view: 'city', corner: false },
  { pos: 3, beds: 2, baths: 1, net: 70, total: 79, balconies: 1, orientation: 'southEast', view: 'mountain', corner: false },
  { pos: 4, beds: 2, baths: 2, net: 82, total: 92, balconies: 2, orientation: 'east', view: 'mountain', corner: true },
];

const FACING: Record<string, string> = { southWest: 'south-west', south: 'south', southEast: 'south-east', east: 'east' };

const roundTo = (n: number, step: number) => Math.round(n / step) * step;

/** Lower floors sell first, so they show more sold/reserved apartments. */
export const availabilityFor = (level: number, pos: number): PlazaUnitSpec['availability'] => {
  const r = (level * 37 + pos * 11) % 10;
  if (level >= TOWER_TOP_LEVEL - 1) return r < 7 ? 'available' : 'reserved';
  if (level <= 7) return r < 6 ? 'sold' : r < 8 ? 'reserved' : 'available';
  if (level >= 19 && r === 9) return 'not_released';
  return r < 5 ? 'available' : r < 7 ? 'reserved' : 'sold';
};

const priced = (level: number, area: number, premium = 1) => {
  const pricePerSqm = roundTo((2100 + (level - TOWER_FIRST_LEVEL) * 28) * premium, 10);
  return { pricePerSqm, price: roundTo(pricePerSqm * area, 1000) };
};

const penthouses = (level: number): PlazaUnitSpec[] =>
  [
    { pos: 1, beds: 4, baths: 3, net: 184, total: 210, terrace: 85, orientation: 'southWest', view: 'panoramic' },
    { pos: 3, beds: 3, baths: 3, net: 152, total: 175, terrace: 60, orientation: 'southEast', view: 'panoramic' },
  ].map((p, i) => ({
    unitNumber: `PH${i + 1}`,
    level,
    pos: p.pos,
    span: 2,
    alsoOnLevels: [],
    unitType: 'penthouse',
    beds: p.beds,
    baths: p.baths,
    livingRooms: 1,
    netArea: p.net,
    totalArea: p.total,
    terraceArea: p.terrace,
    orientation: p.orientation,
    viewType: p.view,
    features: ['penthouse', 'big_terrace', 'smart_home', 'two_sided', 'corner', 'parking', 'storage'],
    ...priced(level, p.total, 1.25),
    priceVisibility: i === 0 ? 'on_request' : 'public',
    availability: availabilityFor(level, p.pos),
    description: `Full-floor-wide penthouse on the top of Plaza Tower with a ${p.terrace} m² wrap-around terrace, panoramic views over Tirana and Mount Dajti, and two parking spaces.`,
    hasFloorplan: false,
  }));

const towerApartment = (level: number, pos: number): PlazaUnitSpec | null => {
  // The upper level of a duplex belongs to the unit below it.
  if (level === DUPLEX_LEVEL + 1 && (pos === 1 || pos === 4)) return null;
  const l = LAYOUTS[pos - 1];
  const unitNumber = `T${level}0${pos}`;
  const duplex = level === DUPLEX_LEVEL && (pos === 1 || pos === 4);
  const studio = level <= 6 && pos === 2;
  const features: string[] = [];
  if (l.corner) features.push('corner');
  if (pos === 4) features.push('two_sided');
  if (l.beds >= 3 || duplex) features.push('parking');
  if (level % 2 === 0) features.push('storage');
  if (level >= 20) features.push('smart_home');

  if (duplex) {
    const total = l.total * 2 - 10;
    return {
      unitNumber, level, pos, span: 1, alsoOnLevels: [level + 1],
      unitType: 'duplex', beds: l.beds + 1, baths: l.baths + 1, livingRooms: 1,
      netArea: total - 22, totalArea: total, terraceArea: 15, balconies: 2,
      orientation: l.orientation, viewType: l.view, features: [...features, 'duplex', 'big_terrace'],
      ...priced(level, total, 1.1), priceVisibility: 'public', availability: availabilityFor(level, pos),
      description: 'Two-level apartment: living, dining and kitchen with a 15 m² terrace downstairs, bedrooms upstairs, joined by an inner staircase.',
      hasFloorplan: true,
    };
  }
  const beds = studio ? 0 : l.beds;
  const total = studio ? 41 : l.total;
  return {
    unitNumber, level, pos, span: 1, alsoOnLevels: [],
    unitType: studio ? 'studio' : 'apartment', beds, baths: l.baths, livingRooms: studio ? 0 : 1,
    netArea: studio ? 36 : l.net, totalArea: total, balconies: l.balconies,
    orientation: l.orientation, viewType: l.view, features: studio ? [...features, 'studio'] : features,
    ...priced(level, total, l.corner ? 1.05 : 1), priceVisibility: 'public', availability: availabilityFor(level, pos),
    description: studio
      ? 'Compact open-plan studio with a kitchenette and a south-facing balcony; popular as a rental investment.'
      : `${beds}-bedroom apartment on floor ${level} with ${l.balconies === 2 ? 'two balconies' : 'a balcony'} facing ${FACING[l.orientation]}, and a ${l.view} view.`,
    hasFloorplan: false,
  };
};

/** Every unit of Plaza Tower, bottom floor first. */
export const towerUnits = (): PlazaUnitSpec[] => {
  const units: PlazaUnitSpec[] = [];
  for (let level = TOWER_FIRST_LEVEL; level < TOWER_TOP_LEVEL; level += 1) {
    for (let pos = 1; pos <= 4; pos += 1) {
      const unit = towerApartment(level, pos);
      if (unit) units.push(unit);
    }
  }
  return [...units, ...penthouses(TOWER_TOP_LEVEL)];
};

export interface PodiumUnitSpec {
  unitNumber: string;
  level: number;
  unitType: 'retail' | 'office';
  area: number;
  availability: PlazaUnitSpec['availability'] | 'rented';
  description: string;
}

/** Shops on the square and offices above them. */
export const podiumUnits = (): PodiumUnitSpec[] => [
  ...[86, 64, 240, 120, 95, 150].map((area, i) => ({
    unitNumber: `R0${i + 1}`,
    level: 0,
    unitType: 'retail' as const,
    area,
    availability: (['rented', 'available', 'rented', 'reserved', 'available', 'available'] as const)[i],
    description: `Ground-floor shop of ${area} m² opening onto the Plaza square, with a glass shopfront and its own entrance.`,
  })),
  ...[1, 2].flatMap((level) =>
    [180, 120, 140, 165].map((area, i) => ({
      unitNumber: `O${level}0${i + 1}`,
      level,
      unitType: 'office' as const,
      area,
      availability: (level === 1 ? ['rented', 'available', 'sold', 'available'] : ['available', 'reserved', 'available', 'available'])[i] as PodiumUnitSpec['availability'],
      description: `${area} m² open-plan office on podium level ${level}, with access to the landscaped roof terrace.`,
    }))
  ),
];
