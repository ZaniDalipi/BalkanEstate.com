import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within, userEvent } from '@/src/tests/test-utils';
import { ConfirmationProvider } from '@/src/shared/hooks/useConfirmation';
import { NotificationProvider } from '@/src/shared/hooks/useNotification';
import type { DashboardUnit } from '../../../types';

vi.mock('../../../api/developmentsApi', () => ({
  listUnits: vi.fn(),
  bulkUpdateUnits: vi.fn(),
  getDevelopmentStructure: vi.fn(),
  downloadUnitsCsv: vi.fn(),
  updateUnit: vi.fn(),
  deleteUnit: vi.fn(),
  uploadUnitFloorplan: vi.fn(),
}));

import * as api from '../../../api/developmentsApi';
import { InventoryTable } from './InventoryTable';

const unit = (id: string, unitNumber: string, extra: Partial<DashboardUnit> = {}): DashboardUnit => ({
  id,
  developmentId: 'dev1',
  buildingId: 'b1',
  floorId: 'f1',
  unitNumber,
  unitType: 'apartment',
  availability: 'available',
  effectiveAvailability: 'available',
  availabilitySource: 'unit',
  listingIds: [],
  linkedListings: [],
  buildingName: 'A',
  floorLabel: '1',
  ...extra,
});

const UNITS = [unit('u1', 'A1'), unit('u2', 'A2', { effectiveAvailability: 'sold', availabilitySource: 'listing' }), unit('u3', 'A3')];

const renderTable = (role?: string) =>
  render(
    <NotificationProvider>
      <ConfirmationProvider>
        <InventoryTable developmentId="dev1" role={role} />
      </ConfirmationProvider>
    </NotificationProvider>
  );

const lastQuery = () => vi.mocked(api.listUnits).mock.lastCall?.[1];

describe('InventoryTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Desktop layout (the table, not the mobile cards).
    vi.mocked(window.matchMedia).mockImplementation(
      (query: string) =>
        ({ matches: true, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() }) as unknown as MediaQueryList
    );
    vi.mocked(api.listUnits).mockResolvedValue({ items: UNITS, total: 3 });
    vi.mocked(api.getDevelopmentStructure).mockResolvedValue({ buildings: [], entrances: [], floors: [] });
    vi.mocked(api.bulkUpdateUnits).mockResolvedValue({ updated: 2 });
  });

  it('debounces search and sends only the settled term to the server', async () => {
    renderTable();
    await screen.findByText('A1');
    expect(lastQuery()).toMatchObject({ sort: 'unitNumber', limit: 25, skip: 0 });
    expect(lastQuery()?.search).toBeUndefined();

    await userEvent.type(screen.getByLabelText('inventory.search'), 'B12');
    await waitFor(() => expect(lastQuery()?.search).toBe('B12'), { timeout: 2000 });
    const searches = vi.mocked(api.listUnits).mock.calls.map((c) => c[1]?.search);
    expect(searches).not.toContain('B');
    expect(searches).not.toContain('B1');
  });

  it('toggles sort direction from the column header', async () => {
    renderTable();
    await screen.findByText('A1');
    const header = screen.getByRole('button', { name: 'unit.number' });
    await userEvent.click(header);
    await waitFor(() => expect(lastQuery()?.sort).toBe('-unitNumber'));
    await userEvent.click(screen.getByRole('button', { name: 'unit.price' }));
    await waitFor(() => expect(lastQuery()?.sort).toBe('price'));
  });

  it('shows declared and effective availability when a listing overrides the unit', async () => {
    renderTable();
    await screen.findByText('A2');
    expect(screen.getByText('inventory.availability.declared')).toBeInTheDocument();
    expect(screen.getByText('inventory.availability.effective')).toBeInTheDocument();
  });

  it('bulk-sets availability on the selected units after confirmation', async () => {
    renderTable();
    await screen.findByText('A1');
    const boxes = screen.getAllByLabelText('inventory.selectUnit');
    await userEvent.click(boxes[0]);
    await userEvent.click(boxes[2]);

    const bar = screen.getByRole('region', { name: 'inventory.bulk.label' });
    await userEvent.selectOptions(within(bar).getByLabelText('inventory.bulk.setAvailability'), 'reserved');
    await userEvent.click(within(bar).getByRole('button', { name: 'inventory.bulk.apply' }));

    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'inventory.bulk.apply' }));

    await waitFor(() =>
      expect(api.bulkUpdateUnits).toHaveBeenCalledWith('dev1', { unitIds: ['u1', 'u3'], availability: 'reserved' })
    );
    await waitFor(() => expect(screen.queryByRole('region', { name: 'inventory.bulk.label' })).not.toBeInTheDocument());
  });

  it('does not call the API when the bulk confirmation is cancelled', async () => {
    renderTable();
    await screen.findByText('A1');
    await userEvent.click(screen.getAllByLabelText('inventory.selectUnit')[1]);
    const bar = screen.getByRole('region', { name: 'inventory.bulk.label' });
    await userEvent.selectOptions(within(bar).getByLabelText('inventory.bulk.setVisibility'), 'hidden');
    await userEvent.click(within(bar).getByRole('button', { name: 'inventory.bulk.applyVisibility' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'wizard.cancel' }));
    expect(api.bulkUpdateUnits).not.toHaveBeenCalled();
  });

  it('hides bulk availability for a role without availability.change', async () => {
    renderTable('editor');
    await screen.findByText('A1');
    await userEvent.click(screen.getAllByLabelText('inventory.selectUnit')[0]);
    const bar = screen.getByRole('region', { name: 'inventory.bulk.label' });
    expect(within(bar).queryByLabelText('inventory.bulk.setAvailability')).not.toBeInTheDocument();
    expect(within(bar).getByLabelText('inventory.bulk.setVisibility')).toBeInTheDocument();
  });
});
