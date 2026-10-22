import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, userEvent } from '@/src/tests/test-utils';
import { ConfirmationProvider } from '@/src/shared/hooks/useConfirmation';
import { NotificationProvider } from '@/src/shared/hooks/useNotification';
import type { DashboardUnit } from '../../../types';

vi.mock('../../../api/developmentsApi', () => ({
  updateUnit: vi.fn(),
  deleteUnit: vi.fn(),
  bulkUpdateUnits: vi.fn(),
  downloadUnitsCsv: vi.fn(),
  uploadUnitFloorplan: vi.fn(),
  deleteUnitFloorplan: vi.fn(),
  uploadUnitGallery: vi.fn(),
  deleteUnitGalleryImage: vi.fn(),
}));

import * as api from '../../../api/developmentsApi';
import { UnitMediaSections } from './UnitMediaSections';

const UNIT: DashboardUnit = {
  id: 'u1',
  developmentId: 'dev1',
  buildingId: 'b1',
  floorId: 'f1',
  unitNumber: 'A1',
  unitType: 'apartment',
  availability: 'available',
  effectiveAvailability: 'available',
  availabilitySource: 'unit',
  listingIds: [],
  linkedListings: [],
  floorplan: { url: 'https://img.example/fp.jpg' },
  gallery: [{ url: 'https://img.example/g1.jpg' }, { url: 'https://img.example/g2.jpg' }],
};

const renderMedia = (role?: string) =>
  render(
    <NotificationProvider>
      <ConfirmationProvider>
        <UnitMediaSections developmentId="dev1" unit={UNIT} role={role} />
      </ConfirmationProvider>
    </NotificationProvider>
  );

const image = (name: string, type = 'image/jpeg') => new File(['x'], name, { type });
/** The confirmation modal's confirm button is the last one carrying the label. */
const confirmLast = async (name: string) => {
  const buttons = await screen.findAllByRole('button', { name });
  await userEvent.click(buttons[buttons.length - 1]);
};

describe('UnitMediaSections', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uploads picked photos and shows the returned gallery', async () => {
    vi.mocked(api.uploadUnitGallery).mockResolvedValue({
      unit: { ...UNIT, gallery: [...UNIT.gallery!, { url: 'https://img.example/g3.jpg' }] },
    });
    renderMedia();
    expect(screen.getAllByRole('img', { name: 'inventory.gallery.alt' })).toHaveLength(2);
    const files = [image('a.jpg'), image('b.png', 'image/png')];
    await userEvent.upload(screen.getByLabelText('inventory.gallery.add'), files);
    await waitFor(() => expect(api.uploadUnitGallery).toHaveBeenCalledWith('dev1', 'u1', files));
    await waitFor(() => expect(screen.getAllByRole('img', { name: 'inventory.gallery.alt' })).toHaveLength(3));
  });

  it('rejects an unsupported file type without calling the API', async () => {
    renderMedia();
    await userEvent.upload(screen.getByLabelText('inventory.gallery.add'), [image('a.gif', 'image/gif')], { applyAccept: false });
    expect(await screen.findByRole('alert')).toHaveTextContent('inventory.gallery.badType');
    expect(api.uploadUnitGallery).not.toHaveBeenCalled();
  });

  it('removes a photo by index after confirmation', async () => {
    vi.mocked(api.deleteUnitGalleryImage).mockResolvedValue({ unit: { ...UNIT, gallery: [UNIT.gallery![0]] } });
    renderMedia();
    await userEvent.click(screen.getAllByRole('button', { name: 'inventory.gallery.remove' })[1]);
    await confirmLast('inventory.gallery.removeConfirm');
    await waitFor(() => expect(api.deleteUnitGalleryImage).toHaveBeenCalledWith('dev1', 'u1', 1));
    await waitFor(() => expect(screen.getAllByRole('img', { name: 'inventory.gallery.alt' })).toHaveLength(1));
  });

  it('removes the floor plan after confirmation', async () => {
    vi.mocked(api.deleteUnitFloorplan).mockResolvedValue({ unit: { ...UNIT, floorplan: undefined } });
    renderMedia();
    await userEvent.click(screen.getByRole('button', { name: 'inventory.floorplan.remove' }));
    await confirmLast('inventory.floorplan.remove');
    await waitFor(() => expect(api.deleteUnitFloorplan).toHaveBeenCalledWith('dev1', 'u1'));
    expect(await screen.findByText('inventory.floorplan.none')).toBeInTheDocument();
  });

  it('hides remove controls without unit.manage and upload without media.upload', () => {
    renderMedia('sales_agent');
    expect(screen.queryByRole('button', { name: 'inventory.gallery.remove' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'inventory.floorplan.remove' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('inventory.gallery.add')).not.toBeInTheDocument();
  });
});
