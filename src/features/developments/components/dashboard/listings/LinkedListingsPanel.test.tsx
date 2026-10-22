import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, userEvent, within } from '@/src/tests/test-utils';
import { ConfirmationProvider } from '@/src/shared/hooks/useConfirmation';
import { NotificationProvider } from '@/src/shared/hooks/useNotification';
import type { DashboardUnit, UnitListQuery } from '../../../types';

vi.mock('../../../api/developmentsApi', () => ({
  listUnits: vi.fn(),
  attachListing: vi.fn(),
  detachListing: vi.fn(),
  previewAttachment: vi.fn(),
  getAttachableListings: vi.fn(() => Promise.resolve({ listings: [] })),
}));

import * as api from '../../../api/developmentsApi';
import { LinkedListingsPanel } from './LinkedListingsPanel';

const unit = (id: string, unitNumber: string, linked: DashboardUnit['linkedListings']): DashboardUnit => ({
  id,
  developmentId: 'dev1',
  buildingId: 'b1',
  floorId: 'f1',
  unitNumber,
  unitType: 'apartment',
  availability: 'available',
  effectiveAvailability: 'available',
  availabilitySource: 'unit',
  listingIds: linked.map((l) => l.id),
  linkedListings: linked,
});

const LINKED = unit('u1', 'A1', [{ id: 'l1', title: 'Flat A1', status: 'active' }]);
const FREE = unit('u2', 'A2', []);

const renderPanel = (role?: string) =>
  render(
    <NotificationProvider>
      <ConfirmationProvider>
        <LinkedListingsPanel developmentId="dev1" role={role} />
      </ConfirmationProvider>
    </NotificationProvider>
  );

describe('LinkedListingsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.listUnits).mockImplementation(async (_id: string, q: UnitListQuery = {}) =>
      q.hasListing ? { items: [LINKED], total: 41 } : { items: [LINKED, FREE], total: 2 }
    );
  });

  it('asks the server for units with a linked listing and shows its total', async () => {
    renderPanel();
    expect(await screen.findByText('Flat A1', { exact: false })).toBeInTheDocument();
    expect(vi.mocked(api.listUnits).mock.calls[0][1]).toMatchObject({ hasListing: true, skip: 0 });
    expect(screen.getByText('manage.listings.linkedTotal')).toBeInTheDocument();
    expect(screen.queryByText('A2')).not.toBeInTheDocument();
  });

  it('attaches to any unit through the unit picker', async () => {
    renderPanel();
    await screen.findByText('Flat A1', { exact: false });
    await userEvent.click(screen.getByRole('button', { name: 'manage.listings.attachToUnit' }));
    const dialog = await screen.findByRole('dialog');
    await waitFor(() => expect(within(dialog).getByText('A2')).toBeInTheDocument());
    const pickerQuery = vi.mocked(api.listUnits).mock.calls.map((c) => c[1]).find((q) => !q?.hasListing);
    expect(pickerQuery?.hasListing).toBeUndefined();
    await userEvent.click(within(dialog).getByText('A2'));
    expect(await screen.findByText('manage.listings.attachTitle')).toBeInTheDocument();
  });

  it('hides attaching for a role without listing.attach', async () => {
    renderPanel('viewer');
    await screen.findByText('Flat A1', { exact: false });
    expect(screen.queryByRole('button', { name: 'manage.listings.attachToUnit' })).not.toBeInTheDocument();
  });
});
