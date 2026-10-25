import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, userEvent, waitFor } from '@/src/tests/test-utils';
import type { DevelopmentBuilding, DevelopmentFloor } from '../../../types';

const unitsOnFloor = vi.fn(() => [] as { unitNumber: string }[]);
vi.mock('../../../api/developmentsApi', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, getUnitPrefill: vi.fn(), getAttachableListings: vi.fn(), attachListing: vi.fn() };
});
vi.mock('../../../hooks', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, useDevelopmentUnits: () => ({ units: unitsOnFloor(), total: 0, isLoading: false, error: null }) };
});

import * as api from '../../../api/developmentsApi';
import { AddFloorsForm } from './AddFloorsForm';
import { AddUnitsForm } from './AddUnitsForm';

const buildings = [{ id: 'b1', name: 'Object A' }] as DevelopmentBuilding[];
const floor = (id: string, level: number): DevelopmentFloor => ({ id, buildingId: 'b1', developmentId: 'd1', label: `Floor ${level}`, level, kind: 'standard', order: level });

describe('AddFloorsForm', () => {
  beforeEach(() => vi.clearAllMocks());

  it('preselects the only building, suggests the next level and names the floor', async () => {
    const createFloor = vi.fn().mockResolvedValue({});
    const user = userEvent.setup();
    render(<AddFloorsForm developmentId="d1" buildings={buildings} floors={[floor('f1', 1), floor('f2', 2), floor('f3', 3)]} createFloor={createFloor} isCreating={false} onError={vi.fn()} />);
    expect(screen.getByLabelText('floor.level')).toHaveValue(4);
    await user.click(screen.getByRole('button', { name: 'floor.add' }));
    await waitFor(() => expect(createFloor).toHaveBeenCalledWith({ buildingId: 'b1', level: 4, label: 'floor.named', kind: 'standard' }));
  });

  it('adds a range of floors in one go, skipping existing levels', async () => {
    const createFloor = vi.fn().mockResolvedValue({});
    const user = userEvent.setup();
    render(<AddFloorsForm developmentId="d1" buildings={buildings} floors={[floor('f2', 2)]} createFloor={createFloor} isCreating={false} onError={vi.fn()} />);
    await user.clear(screen.getByLabelText('floor.level'));
    await user.type(screen.getByLabelText('floor.level'), '0');
    await user.type(screen.getByLabelText('floor.toLevel'), '3');
    await user.click(screen.getByRole('button', { name: 'floor.addRange' }));
    await waitFor(() => expect(createFloor).toHaveBeenCalledTimes(3));
    expect(createFloor.mock.calls.map(([p]) => [p.level, p.kind])).toEqual([[0, 'ground'], [1, 'standard'], [3, 'standard']]);
  });
});

describe('AddUnitsForm', () => {
  it('numbers units from the floor and adds several at once', async () => {
    unitsOnFloor.mockReturnValue([{ unitNumber: '401' }]);
    const createUnit = vi.fn().mockResolvedValue({});
    const user = userEvent.setup();
    render(<AddUnitsForm developmentId="d1" buildings={buildings} floors={[floor('f4', 4)]} createUnit={createUnit} isCreating={false} onError={vi.fn()} />);
    await user.selectOptions(screen.getByLabelText('detail.floors'), 'f4');
    expect(screen.getByLabelText('unit.number')).toHaveValue('402');
    await user.clear(screen.getByLabelText('unit.howMany'));
    await user.type(screen.getByLabelText('unit.howMany'), '3');
    await user.click(screen.getByRole('button', { name: 'unit.addMany' }));
    await waitFor(() => expect(createUnit).toHaveBeenCalledTimes(3));
    expect(createUnit.mock.calls.map(([p]) => p.unitNumber)).toEqual(['402', '403', '404']);
  });

  it('creates a unit from one of the owner’s listings and links it', async () => {
    unitsOnFloor.mockReturnValue([]);
    vi.mocked(api.getAttachableListings).mockResolvedValue({ listings: [{ id: 'l9', title: 'Corner flat', price: 150000, listingType: 'sale', city: 'Tirana' }] } as never);
    vi.mocked(api.getUnitPrefill).mockResolvedValue({
      listing: { id: 'l9', title: 'Corner flat', listingType: 'sale' },
      fields: { unitType: 'apartment', beds: 2, totalArea: 70, price: 150000, orientation: 'south', features: ['corner'] },
      floorLevel: 4,
      skipped: [],
    });
    vi.mocked(api.attachListing).mockResolvedValue({} as never);
    const createUnit = vi.fn().mockResolvedValue({ unit: { id: 'new1' } });
    const user = userEvent.setup();
    render(<AddUnitsForm developmentId="d1" buildings={buildings} floors={[floor('f4', 4)]} createUnit={createUnit} isCreating={false} onError={vi.fn()} role="owner" />);

    await user.click(screen.getByRole('button', { name: 'inventory.prefill.open' }));
    await user.click(await screen.findByRole('button', { name: /Corner flat/ }));
    // The listing's floor 4 is chosen for you.
    expect((screen.getByLabelText('detail.floors') as HTMLSelectElement).value).toBe('f4');
    await user.click(screen.getByRole('button', { name: 'unit.add' }));

    await waitFor(() => expect(createUnit).toHaveBeenCalledTimes(1));
    expect(createUnit.mock.calls[0][0]).toMatchObject({ unitNumber: '401', floorId: 'f4', beds: 2, totalArea: 70, price: 150000, orientation: 'south', features: ['corner'] });
    await waitFor(() => expect(api.attachListing).toHaveBeenCalledWith('d1', 'new1', 'l9', false));
  });
});
