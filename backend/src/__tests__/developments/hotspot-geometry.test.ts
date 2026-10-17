/**
 * Server hotspot geometry, held to the same cases as the client editor.
 *
 * The fixture lives with the client copy and is read here by path — the same
 * mirror-and-check convention as type-attributes.test.ts — so the two
 * implementations can only drift by failing this suite.
 */
process.env.SKIP_TEST_DB = 'true';

import fs from 'fs';
import path from 'path';
import {
  validateHotspotGeometry,
  MAX_POLYGON_POINTS,
  MIN_POLYGON_AREA,
  DUPLICATE_EPSILON,
  type HotspotShapeKind,
  type Point,
} from '../../services/developments/hotspotGeometry';

interface Case {
  name: string;
  shape: HotspotShapeKind;
  points?: unknown;
  generate?: { kind: 'regular'; n: number };
  expected: { isValid: boolean; error?: string };
}

const CLIENT_DIR = path.resolve(__dirname, '../../../../src/features/developments/utils');
const fixture = JSON.parse(
  fs.readFileSync(path.join(CLIENT_DIR, '__fixtures__/polygon-cases.json'), 'utf8')
) as { cases: Case[] };

const regular = (n: number): Point[] =>
  Array.from({ length: n }, (_, i) => {
    const a = (2 * Math.PI * i) / n;
    return [0.5 + 0.4 * Math.cos(a), 0.5 + 0.4 * Math.sin(a)];
  });

describe('validateHotspotGeometry — shared client/server cases', () => {
  it('loads a non-trivial case list', () => {
    expect(fixture.cases.length).toBeGreaterThan(15);
  });

  it.each(fixture.cases.map((c) => [c.name, c] as const))('%s', (_name, c) => {
    const points = c.generate ? regular(c.generate.n) : c.points;
    expect(validateHotspotGeometry(c.shape, points)).toEqual(c.expected);
  });
});

describe('the client and server copies agree on their limits', () => {
  const clientSource = fs.readFileSync(path.join(CLIENT_DIR, 'polygonGeometry.ts'), 'utf8');
  const clientConst = (name: string): number => {
    const m = clientSource.match(new RegExp(`export const ${name} = ([0-9.]+);`));
    if (!m) throw new Error(`${name} not found in the client polygonGeometry`);
    return Number(m[1]);
  };

  it('MAX_POLYGON_POINTS', () => expect(MAX_POLYGON_POINTS).toBe(clientConst('MAX_POLYGON_POINTS')));
  it('MIN_POLYGON_AREA', () => expect(MIN_POLYGON_AREA).toBe(clientConst('MIN_POLYGON_AREA')));
  it('DUPLICATE_EPSILON', () => expect(DUPLICATE_EPSILON).toBe(clientConst('DUPLICATE_EPSILON')));
});
