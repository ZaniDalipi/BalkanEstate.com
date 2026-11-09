import { describe, expect, it } from 'vitest';
import type { DevelopmentFloor, PublicUnit } from '../../../../types';
import { floorStack } from './floorStack';

const floor = (id: string, level: number, over: Partial<DevelopmentFloor> = {}): DevelopmentFloor =>
  ({ id, developmentId: 'd', buildingId: 'b1', label: id === 'g' ? 'Ground floor' : `Floor ${level}`, level, kind: 'residential', order: level, ...over }) as DevelopmentFloor;
const unit = (floorId: string, availability: PublicUnit['availability'], buildingId = 'b1') =>
  ({ id: `${floorId}-${Math.random()}`, buildingId, floorId, availability }) as PublicUnit;

describe('floorStack', () => {
  it('lists the building’s floors top first, with their homes and pictures', () => {
    const stops = floorStack(
      [floor('g', 0, { hasViews: true }), floor('f2', 2), floor('f1', 1, { hasViews: true }), floor('x', 5, { buildingId: 'b2' })],
      'b1',
      [unit('g', 'available'), unit('g', 'sold'), unit('f1', 'available'), unit('f1', 'available', 'b2')]
    );
    expect(stops).toEqual([
      { id: 'f2', label: 'Floor 2', level: 2, units: 0, available: 0, hasPicture: false },
      { id: 'f1', label: 'Floor 1', level: 1, units: 1, available: 1, hasPicture: true },
      { id: 'g', label: 'Ground floor', level: 0, units: 2, available: 1, hasPicture: true },
    ]);
  });

  it('is empty without a building, or with a single floor to choose', () => {
    expect(floorStack([floor('g', 0), floor('f1', 1)], undefined, [])).toEqual([]);
    expect(floorStack([floor('g', 0)], 'b1', [])).toEqual([]);
  });

  it('orders floors of the same level by their order', () => {
    const stops = floorStack([floor('a', 1, { order: 1 }), floor('b', 1, { order: 2 })], 'b1', []);
    expect(stops.map((s) => s.id)).toEqual(['b', 'a']);
  });
});
