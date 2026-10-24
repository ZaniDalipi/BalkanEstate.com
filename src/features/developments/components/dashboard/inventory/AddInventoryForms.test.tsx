import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, userEvent, waitFor } from '@/src/tests/test-utils';
import type { DevelopmentBuilding, DevelopmentFloor } from '../../../types';

const unitsOnFloor = vi.fn(() => [] as { unitNumber: string }[]);
vi.mock('../../../hooks', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, useDevelopmentUnits: () => ({ units: unitsOnFloor(), total: 0, isLoading: false, error: null }) };
});

import { AddFloorsForm } from './AddFloorsForm';
import { AddUnitsForm } from './AddUnitsForm';

const buildings = [{ id: 'b1', name: 'Object A' }] as DevelopmentBuilding[];
const floor = (id: string, level: number): DevelopmentFloor => ({ id, buildingId: 'b1', developmentId: 'd1', label: `Floor ${level}`, level, kind: 'standard', order: level });

describe('AddFloorsForm', () => {
  beforeEach(() => vi.clearAllMocks());

  it('preselects the only building, suggests the next level and names the floor', async () => {
    const createFloor = vi.fn().mockResolvedValue({});
    const user = userEvent.setup();
    render(<AddFloorsForm buildings={buildings} floors={[floor('f1', 1), floor('f2', 2), floor('f3', 3)]} createFloor={createFloor} isCreating={false} onError={vi.fn()} />);
    expect(screen.getByLabelText('floor.level')).toHaveValue(4);
    await user.click(screen.getByRole('button', { name: 'floor.add' }));
    await waitFor(() => expect(createFloor).toHaveBeenCalledWith({ buildingId: 'b1', level: 4, label: 'floor.named', kind: 'standard' }));
  });

  it('adds a range of floors in one go, skipping existing levels', async () => {
    const createFloor = vi.fn().mockResolvedValue({});
    const user = userEvent.setup();
    render(<AddFloorsForm buildings={buildings} floors={[floor('f2', 2)]} createFloor={createFloor} isCreating={false} onError={vi.fn()} />);
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
});
