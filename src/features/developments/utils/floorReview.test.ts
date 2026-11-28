import { describe, expect, it } from 'vitest';
import type { Hotspot } from '../types';
import { pendingReview } from './floorReview';

const rect = (id: string, y: number): Hotspot => ({ id, shape: 'rect', points: [[0.2, y], [0.4, y + 0.1]], linkType: 'unit', linkId: '', z: 0 });

describe('pendingReview', () => {
  const placed = [rect('a', 0.1), rect('b', 0.3), rect('c', 0.5)];
  const record = new Map(placed.map((h) => [h.id, JSON.stringify(h.points)]));

  it('lists placed regions that were neither moved nor marked, and forgets removed ones', () => {
    const now = [placed[0], { ...placed[1], points: [[0.25, 0.3], [0.45, 0.4]] }, rect('own', 0.7)];
    expect(pendingReview(now, record, new Set())).toEqual(['a']);
    expect(pendingReview(placed, record, new Set(['c']))).toEqual(['a', 'b']);
  });
});
