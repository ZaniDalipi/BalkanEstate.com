import { towerUnits, podiumUnits, DUPLEX_LEVEL } from '../../scripts/demo/plazaUnits';
import { frontCell, modelFloorBand, PLAZA_IMAGES, RESIDENCE_AERIAL, RESIDENCE_AERIAL_EAST, TOWER_FIRST_LEVEL, TOWER_TOP_LEVEL } from '../../scripts/demo/plazaGeometry';
import { normalise } from '../../scripts/demo/seedSupport';

describe('Plaza demo data', () => {
  const tower = towerUnits();

  it('is deterministic and has unique unit numbers', () => {
    expect(towerUnits()).toEqual(tower);
    const numbers = [...tower, ...podiumUnits()].map((u) => u.unitNumber);
    expect(new Set(numbers).size).toBe(numbers.length);
    expect(tower).toHaveLength(84);
    expect(podiumUnits()).toHaveLength(14);
  });

  it('fills every facade cell exactly once (duplexes cover two levels, penthouses two columns)', () => {
    const cells = new Set<string>();
    for (const u of tower) {
      for (const level of [u.level, ...u.alsoOnLevels]) {
        for (let c = u.pos; c < u.pos + u.span; c += 1) {
          const key = `${level}:${c}`;
          expect(cells.has(key)).toBe(false);
          cells.add(key);
        }
      }
    }
    expect(cells.size).toBe((TOWER_TOP_LEVEL - TOWER_FIRST_LEVEL + 1) * 4);
    expect(tower.filter((u) => u.unitType === 'duplex').every((u) => u.level === DUPLEX_LEVEL && u.hasFloorplan)).toBe(true);
  });

  it('keeps prices consistent with area and price per m²', () => {
    for (const u of tower) expect(Math.abs(u.price - u.pricePerSqm * u.totalArea)).toBeLessThanOrEqual(500);
  });

  it('places every region inside its picture', () => {
    const inside = (poly: number[][]) => poly.every(([x, y]) => x >= 0 && x <= 1 && y >= 0 && y <= 1);
    const front = PLAZA_IMAGES.towerFront;
    const model = PLAZA_IMAGES.towerModel;
    for (let level = TOWER_FIRST_LEVEL; level <= TOWER_TOP_LEVEL; level += 1) {
      for (let pos = 1; pos <= 4; pos += 1) {
        const raw = frontCell(level, pos);
        expect(normalise(raw, front.width, front.height)).toEqual(raw.map(([x, y]) => [+(x / front.width).toFixed(4), +(y / front.height).toFixed(4)]));
      }
      expect(modelFloorBand(level)).toHaveLength(6);
      expect(inside(normalise(modelFloorBand(level), model.width, model.height))).toBe(true);
    }
    const aerial = PLAZA_IMAGES.residenceAerial;
    for (const g of [RESIDENCE_AERIAL, RESIDENCE_AERIAL_EAST]) {
      for (const poly of [g.tower, ...g.podium]) {
        expect(poly.every(([x, y]) => x >= 0 && x <= aerial.width && y >= 0 && y <= aerial.height)).toBe(true);
      }
    }
  });
});
