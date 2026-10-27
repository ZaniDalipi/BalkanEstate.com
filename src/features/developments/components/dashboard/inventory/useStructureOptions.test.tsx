import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@/src/tests/test-utils';
import type { DevelopmentBuilding, DevelopmentFloor } from '../../../types';

vi.mock('../../../api/developmentsApi', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    getUnitFacets: vi.fn().mockResolvedValue({
      total: 5,
      byBuilding: { b1: 5 },
      byFloor: { f1: 2, f2: 3 },
      byAvailability: { available: 4, sold: 1 },
      byVisibility: { public: 5 },
    }),
  };
});

import { useStructureOptions } from './useStructureOptions';

const buildings = [{ id: 'b1', name: 'Plaza Tower' }, { id: 'b2', name: 'Podium' }] as DevelopmentBuilding[];
const floors = [
  { id: 'f2', buildingId: 'b1', label: 'Floor 2', level: 2 },
  { id: 'f1', buildingId: 'b1', label: 'Floor 1', level: 1 },
  { id: 'g0', buildingId: 'b2', label: 'Ground floor', level: 0 },
] as DevelopmentFloor[];

const Probe: React.FC = () => {
  const o = useStructureOptions('d1', buildings, floors);
  return (
    <pre data-testid="out">
      {JSON.stringify({ b: o.buildingOptions.map((x) => x.label), f: o.floorOptions('b1').map((x) => x.label), all: o.floorOptions('').length, a: o.availabilityOptions.find((x) => x.value === 'available')?.label })}
    </pre>
  );
};

describe('useStructureOptions', () => {
  it('labels options with real counts, floors in level order', async () => {
    render(<Probe />);
    await waitFor(() => expect(screen.getByTestId('out').textContent).toContain('choices.units'));
    const out = JSON.parse(screen.getByTestId('out').textContent ?? '{}');
    // The i18n mock returns keys; the real app renders "Plaza Tower · 2 floors · 5 units".
    expect(out.b).toEqual(['Plaza Tower · editor.structure.floors · choices.units', 'Podium · editor.structure.floors · choices.units']);
    expect(out.f).toEqual(['Floor 1 · choices.units', 'Floor 2 · choices.units']);
    expect(out.all).toBe(3);
    expect(out.a).toBe('availability.available (4)');
  });
});
