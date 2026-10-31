import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BuildingEntrancesCard } from './BuildingEntrancesCard';
import type { DevelopmentBuilding, DevelopmentEntrance } from '../../../types';

const h = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn(), remove: vi.fn(), confirm: vi.fn() }));
vi.mock('../../../hooks/useEntranceActions', () => ({ useEntranceActions: () => ({ create: h.create, update: h.update, remove: h.remove, isBusy: false }) }));
vi.mock('@/src/shared/hooks/useConfirmation', () => ({ useConfirmation: () => ({ confirm: h.confirm }) }));
vi.mock('../inventory/import/ImportUnitsButton', () => ({ ImportUnitsButton: ({ building }: { building: { name: string } }) => <button type="button">import {building.name}</button> }));

const building = { id: 'b1', name: 'Block A' } as DevelopmentBuilding;
const entranceA: DevelopmentEntrance = { id: 'e1', buildingId: 'b1', name: 'Entrance A', kind: 'main', accessible: true, order: 0 };
const apiError = (status: number, code: string, field?: string, params?: object) =>
  Object.assign(new Error(code), { statusCode: status, code, details: { code, details: { field, params } } });

const renderCard = (entrances: DevelopmentEntrance[] = [entranceA], canManage = true) =>
  render(<BuildingEntrancesCard developmentId="d1" building={building} entrances={entrances} canManage={canManage} canImport />);

beforeEach(() => {
  h.create.mockReset().mockResolvedValue({ entrance: { ...entranceA, id: 'e2', name: 'Garage', kind: 'garage' } });
  h.remove.mockReset().mockResolvedValue({ success: true });
  h.confirm.mockReset().mockResolvedValue(true);
});

describe('BuildingEntrancesCard', () => {
  it('lists the entrances with their kind and step-free access, and imports for this building', () => {
    renderCard();
    expect(screen.getByText('Entrance A')).toBeInTheDocument();
    expect(screen.getByText('entrance.stepFree')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'import Block A' })).toBeInTheDocument();
  });

  it('adds an entrance, refusing a name the building already uses next to the field', async () => {
    renderCard();
    await userEvent.click(screen.getByRole('button', { name: 'entrance.add' }));
    const name = screen.getByLabelText(/^entrance\.name/);
    await userEvent.type(name, 'entrance a');
    await userEvent.click(screen.getByRole('button', { name: 'entrance.save' }));
    expect(document.getElementById(name.getAttribute('aria-describedby') ?? '')).toHaveTextContent('developments:apiErrors.ENTRANCE_NAME_TAKEN');
    expect(h.create).not.toHaveBeenCalled();

    await userEvent.clear(name);
    await userEvent.type(name, ' Garage ');
    await userEvent.selectOptions(screen.getByLabelText(/^entrance\.kindLabel/), 'garage');
    await userEvent.click(screen.getByRole('button', { name: 'entrance.save' }));
    await waitFor(() => expect(h.create).toHaveBeenCalledWith({ buildingId: 'b1', payload: { name: 'Garage', code: undefined, kind: 'garage', accessible: false, note: undefined } }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'entrance.save' })).toBeNull());
  });

  it('says why an entrance in use cannot be deleted', async () => {
    h.remove.mockRejectedValueOnce(apiError(409, 'ENTRANCE_IN_USE', undefined, { count: 3 }));
    renderCard();
    await userEvent.click(screen.getByRole('button', { name: 'entrance.delete' }));
    expect(h.confirm).toHaveBeenCalled();
    expect(await screen.findByRole('alert')).toHaveTextContent('developments:apiErrors.ENTRANCE_IN_USE');
  });

  it('is read-only without the right to manage buildings', () => {
    renderCard([entranceA], false);
    expect(screen.queryByRole('button', { name: 'entrance.add' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'entrance.delete' })).toBeNull();
  });
});
