import React, { useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@/src/tests/test-utils';
import type { DashboardUnit, Hotspot, Scene } from '../../../types';

vi.mock('react-i18next', async () => (await import('../../public/explorer/__tests__/i18nMock')).default);

const h = vi.hoisted(() => ({ listUnits: vi.fn() }));
vi.mock('../../../api/developmentsApi', () => ({
  listUnits: (...a: unknown[]) => h.listUnits(...a),
  getDevelopmentStructure: () => Promise.resolve({ buildings: [{ id: 'b1', name: 'Tower' }], floors: [], entrances: [] }),
}));

import { useLinkOptions } from './useLinkOptions';
import { UnitTargetPicker } from './UnitTargetPicker';

const unit = (id: string, unitNumber: string): DashboardUnit =>
  ({ id, unitNumber, availability: 'available', buildingId: 'b1', floorId: 'f1' }) as DashboardUnit;

const firstPage = Array.from({ length: 200 }, (_, i) => unit(`u${i}`, `A-${String(i).padStart(3, '0')}`));
const scene = { targetType: 'building', targetId: 'b1' } as Scene;

const Harness: React.FC<{ linked?: string }> = ({ linked = '' }) => {
  const { options, unitPicker, labelOf } = useLinkOptions('d1', scene);
  const [value, setValue] = useState(linked);
  const hotspot = { id: 'r1', linkType: 'unit', linkId: value, label: '' } as unknown as Hotspot;
  return (
    <>
      <output data-testid="region-label">{labelOf(hotspot)}</output>
      <UnitTargetPicker
        developmentId="d1"
        label="Target"
        source={unitPicker}
        baseOptions={options.unit}
        value={value}
        currentLabel={labelOf(hotspot)}
        onChange={setValue}
      />
    </>
  );
};

beforeEach(() => {
  h.listUnits.mockReset();
  h.listUnits.mockImplementation((_id: string, f: { search?: string }) =>
    Promise.resolve(
      f.search
        ? { items: [unit('far1', 'Z-901'), unit('far2', 'Z-902')], total: 2 }
        : { items: firstPage, total: 1200 }
    )
  );
});

describe('UnitTargetPicker', () => {
  it('hints that the list is truncated, then searches the server with the debounced term', async () => {
    render(<Harness />);
    expect(await screen.findByText('Showing first 80 — type to search')).toBeInTheDocument();
    expect(h.listUnits).toHaveBeenCalledWith('d1', { buildingId: 'b1', sort: 'unitNumber', limit: 200 });

    const input = screen.getByRole('searchbox', { name: 'Target' });
    fireEvent.change(input, { target: { value: 'Z' } });
    fireEvent.change(input, { target: { value: 'Z-9' } });

    const listbox = screen.getByRole('listbox', { name: 'Target' });
    await waitFor(() => expect(within(listbox).getByRole('button', { name: /Z-901/ })).toBeInTheDocument());
    const searches = h.listUnits.mock.calls.filter(([, f]) => (f as { search?: string }).search);
    // One request for the settled term only — not one per keystroke — scoped to the view's building.
    expect(searches).toEqual([['d1', { buildingId: 'b1', sort: 'unitNumber', search: 'Z-9', limit: 50 }]]);
    expect(within(listbox).getByRole('button', { name: /Z-902/ })).toBeInTheDocument();

    // Picking a result beyond the first page keeps its label for the region.
    fireEvent.click(within(listbox).getByRole('button', { name: /Z-902/ }));
    expect(screen.getByTestId('region-label')).toHaveTextContent('Z-902');
    fireEvent.change(input, { target: { value: '' } });
    expect(screen.getByTestId('region-label')).toHaveTextContent('Z-902');
  });

  it('a linked unit outside the first page still shows a name while unresolved', async () => {
    render(<Harness linked="64f0c0ffee0123456789abcd" />);
    await screen.findByText('Showing first 80 — type to search');
    expect(screen.getByTestId('region-label')).toHaveTextContent('Unit 89abcd');
    expect(screen.getAllByText('Unit 89abcd').length).toBeGreaterThan(1);
  });
});
