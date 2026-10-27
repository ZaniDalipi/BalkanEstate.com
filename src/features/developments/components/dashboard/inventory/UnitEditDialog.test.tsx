import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, userEvent } from '@/src/tests/test-utils';
import { ConfirmationProvider } from '@/src/shared/hooks/useConfirmation';
import { NotificationProvider } from '@/src/shared/hooks/useNotification';
import type { DashboardUnit, DevelopmentBuilding, DevelopmentFloor } from '../../../types';

vi.mock('../../../api/developmentsApi', () => ({
  listUnits: vi.fn(),
  bulkUpdateUnits: vi.fn(),
  downloadUnitsCsv: vi.fn(),
  updateUnit: vi.fn(),
  deleteUnit: vi.fn(),
  uploadUnitFloorplan: vi.fn(),
  getUnitPrefill: vi.fn(),
  getAttachableListings: vi.fn(),
  attachListing: vi.fn(),
}));

import * as api from '../../../api/developmentsApi';
import { UnitEditDialog } from './UnitEditDialog';

const UNIT: DashboardUnit = {
  id: 'u1',
  developmentId: 'dev1',
  buildingId: 'b1',
  floorId: 'f1',
  unitNumber: 'A1',
  unitType: 'apartment',
  beds: 2,
  baths: 1,
  netArea: 64.5,
  price: 120000,
  currency: 'EUR',
  orientation: 'south',
  availability: 'available',
  visibility: 'public',
  priceVisibility: 'public',
  features: ['corner'],
  effectiveAvailability: 'available',
  availabilitySource: 'unit',
  listingIds: [],
  linkedListings: [],
};
const BUILDINGS = [
  { id: 'b1', name: 'A' },
  { id: 'b2', name: 'B' },
] as DevelopmentBuilding[];
const FLOORS = [
  { id: 'f1', buildingId: 'b1', label: 'A-1', level: 1 },
  { id: 'f2', buildingId: 'b2', label: 'B-1', level: 1 },
  { id: 'f3', buildingId: 'b2', label: 'B-2', level: 2 },
] as DevelopmentFloor[];

const onClose = vi.fn();
const renderDialog = (role?: string) =>
  render(
    <NotificationProvider>
      <ConfirmationProvider>
        <UnitEditDialog developmentId="dev1" unit={UNIT} role={role} buildings={BUILDINGS} floors={FLOORS} onClose={onClose} />
      </ConfirmationProvider>
    </NotificationProvider>
  );

const field = (label: string) => screen.getByLabelText(new RegExp(`^${label.replace('.', '\\.')}`)) as HTMLInputElement;

describe('UnitEditDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.updateUnit).mockResolvedValue({ unit: UNIT });
  });

  it('sends only the changed fields, with null for a cleared field', async () => {
    renderDialog();
    const number = field('unit.number');
    await userEvent.clear(number);
    await userEvent.type(number, 'A1b');
    await userEvent.clear(field('unit.beds'));
    // Orientation is a dropdown now; "Not set" clears it.
    await userEvent.selectOptions(field('unit.orientation'), '');
    await userEvent.click(screen.getByLabelText('feature.duplex'));
    await userEvent.click(screen.getByRole('button', { name: 'inventory.edit.save' }));

    await waitFor(() => expect(api.updateUnit).toHaveBeenCalledTimes(1));
    expect(api.updateUnit).toHaveBeenCalledWith('dev1', 'u1', {
      unitNumber: 'A1b',
      beds: null,
      orientation: null,
      features: ['corner', 'duplex'],
    });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('shows a server refusal next to the field it names, in the reader’s language', async () => {
    vi.mocked(api.updateUnit).mockRejectedValueOnce(
      Object.assign(new Error('Unit number A2 is already used in this building'), {
        statusCode: 409,
        code: 'UNIT_NUMBER_TAKEN',
        details: { message: 'Unit number A2 is already used in this building', code: 'UNIT_NUMBER_TAKEN', details: { field: 'unitNumber', params: { number: 'A2' } } },
      })
    );
    renderDialog();
    const number = field('unit.number');
    await userEvent.clear(number);
    await userEvent.type(number, 'A2');
    await userEvent.click(screen.getByRole('button', { name: 'inventory.edit.save' }));

    await waitFor(() => expect(number).toHaveAttribute('aria-invalid', 'true'));
    const describedBy = number.getAttribute('aria-describedby') ?? '';
    expect(describedBy.split(' ').some((id) => document.getElementById(id)?.textContent === 'developments:apiErrors.UNIT_NUMBER_TAKEN')).toBe(true);
    expect(screen.queryByText(/already used/)).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('a lost connection says so instead of a raw error', async () => {
    vi.mocked(api.updateUnit).mockRejectedValueOnce(new TypeError('Failed to fetch'));
    renderDialog();
    await userEvent.type(field('unit.number'), 'x');
    await userEvent.click(screen.getByRole('button', { name: 'inventory.edit.save' }));
    expect(await screen.findByText('developments:apiErrors.status.offline')).toBeInTheDocument();
    expect(screen.queryByText('Failed to fetch')).not.toBeInTheDocument();
  });

  it('filters floors by the chosen building and clears the floor on building change', async () => {
    renderDialog();
    await userEvent.selectOptions(field('inventory.filters.building'), 'b2');
    const floor = field('inventory.filters.floor') as unknown as HTMLSelectElement;
    expect(floor.value).toBe('');
    const labels = Array.from(floor.options).map((o) => o.textContent);
    expect(labels).toEqual(['inventory.edit.selectFloor', 'B-1', 'B-2']);
  });

  it('picks the parking spot an apartment comes with; a spot taken by another unit cannot be picked', async () => {
    const spot = (id: string, unitNumber: string, soldWith: DashboardUnit['soldWith'] = []) =>
      ({ ...UNIT, id, unitNumber, unitType: 'parking', soldWith }) as DashboardUnit;
    vi.mocked(api.listUnits).mockImplementation(async (_dev, filters) =>
      filters?.unitType ? { items: [spot('p1', 'P1', [{ id: 'u9', unitNumber: 'A9' }]), spot('p2', 'P2')], total: 2 } : { items: [], total: 0 }
    );
    // The shape httpClient throws: the body's code on the error, the whole body (with its details) in `details`.
    vi.mocked(api.updateUnit).mockRejectedValueOnce(
      Object.assign(new Error('P2 already comes with A7'), {
        statusCode: 409,
        code: 'LINKS_TAKEN',
        details: { message: 'P2 already comes with A7', code: 'LINKS_TAKEN', details: { field: 'linkedUnitIds', params: { unit: 'P2', owner: 'A7' } } },
      })
    );
    renderDialog();
    const taken = await screen.findByRole('checkbox', { name: /P1/ });
    expect(taken).toBeDisabled();
    await userEvent.click(screen.getByRole('checkbox', { name: /P2/ }));
    await userEvent.click(screen.getByRole('button', { name: 'inventory.edit.save' }));

    await waitFor(() => expect(api.updateUnit).toHaveBeenCalledWith('dev1', 'u1', { linkedUnitIds: ['p2'] }));
    // Translated (never the server's English), next to the "comes with" field and above the buttons.
    const alerts = await screen.findAllByRole('alert');
    expect(alerts.filter((a) => a.textContent === 'developments:apiErrors.LINKS_TAKEN')).toHaveLength(2);
    const onField = alerts.find((a) => a.closest('fieldset'));
    expect(onField?.closest('fieldset')).toHaveAttribute('aria-describedby', onField?.id);
    expect(screen.queryByText('P2 already comes with A7')).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('selling the apartment: the seller ticks which parking spots are sold with it', async () => {
    const withParking = { ...UNIT, linkedUnitIds: ['p1', 'p2'] } as DashboardUnit;
    const spot = (id: string, unitNumber: string) => ({ ...UNIT, id, unitNumber, unitType: 'parking', soldWith: [{ id: 'u1', unitNumber: 'A1' }] }) as DashboardUnit;
    vi.mocked(api.listUnits).mockImplementation(async (_dev, filters) =>
      filters?.unitType ? { items: [spot('p1', 'P1'), spot('p2', 'P2')], total: 2 } : { items: [], total: 0 }
    );
    render(
      <NotificationProvider>
        <ConfirmationProvider>
          <UnitEditDialog developmentId="dev1" unit={withParking} buildings={BUILDINGS} floors={FLOORS} onClose={onClose} />
        </ConfirmationProvider>
      </NotificationProvider>
    );
    // Nothing to decide until the status changes.
    expect(screen.queryByRole('checkbox', { name: /companions.status.alsoMark/ })).not.toBeInTheDocument();
    await userEvent.selectOptions(field('unit.availability') as unknown as HTMLSelectElement, 'sold');
    const boxes = await screen.findAllByRole('checkbox', { name: /companions.status.alsoMark/ });
    expect(boxes).toHaveLength(2);
    boxes.forEach((b) => expect(b).not.toBeChecked());
    await userEvent.click(boxes[0]);
    await userEvent.click(screen.getByRole('button', { name: 'inventory.edit.save' }));
    await waitFor(() => expect(api.updateUnit).toHaveBeenCalledWith('dev1', 'u1', { availability: 'sold', alsoLinkedUnitIds: ['p1'] }));
  });

  it('explains a 403 on price changes in place', async () => {
    vi.mocked(api.updateUnit).mockRejectedValue(Object.assign(new Error('Forbidden'), { statusCode: 403 }));
    renderDialog();
    const price = field('unit.price');
    await userEvent.clear(price);
    await userEvent.type(price, '130000');
    await userEvent.click(screen.getByRole('button', { name: 'inventory.edit.save' }));

    await waitFor(() => expect(api.updateUnit).toHaveBeenCalled());
    const alerts = await screen.findAllByRole('alert');
    expect(alerts.some((a) => a.textContent?.includes('inventory.edit.forbiddenPrice'))).toBe(true);
    // The price field itself is flagged too.
    expect(field('unit.price')).toHaveAttribute('aria-invalid', 'true');
    // Prices are always sent in euros.
    expect(api.updateUnit).toHaveBeenCalledWith('dev1', 'u1', { price: 130000, currency: 'EUR' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('disables price fields for a role without price.change', () => {
    renderDialog('editor');
    expect(field('unit.price')).toBeDisabled();
    expect(field('inventory.edit.pricePerSqm')).toBeDisabled();
    // No currency field: every price is in euros.
    expect(screen.queryByLabelText(/inventory\.edit\.currency/)).not.toBeInTheDocument();
    expect(screen.getByText('inventory.edit.euroOnly')).toBeInTheDocument();
    expect(field('unit.number')).not.toBeDisabled();
    expect(screen.getByText('inventory.edit.priceLocked')).toBeInTheDocument();
  });

  it('blocks saving invalid values without calling the API', async () => {
    renderDialog();
    await userEvent.clear(field('unit.number'));
    await userEvent.type(field('unit.baths'), '.5');
    await userEvent.click(screen.getByRole('button', { name: 'inventory.edit.save' }));
    expect(api.updateUnit).not.toHaveBeenCalled();
    expect(screen.getAllByText(/inventory\.edit\.errors\./).length).toBeGreaterThan(0);
  });

  it('offers fixed choices for type, orientation and view', () => {
    renderDialog();
    const options = (label: string) => Array.from((field(label) as unknown as HTMLSelectElement).options).map((o) => o.value);
    expect(options('unit.type')).toEqual(expect.arrayContaining(['apartment', 'studio', 'penthouse', 'office']));
    expect(options('unit.orientation')).toEqual(['', 'north', 'northEast', 'east', 'southEast', 'south', 'southWest', 'west', 'northWest']);
    expect(options('inventory.edit.viewType')).toEqual(expect.arrayContaining(['', 'sea', 'mountain', 'city', 'courtyard']));
  });

  it('fills the form from a listing and links it on save', async () => {
    vi.mocked(api.getUnitPrefill).mockResolvedValue({
      listing: { id: 'l9', title: 'Sea view flat', listingType: 'sale' },
      fields: { beds: 3, totalArea: 95, orientation: 'southEast', viewType: 'sea', features: ['sea_view'] },
      skipped: [],
    });
    vi.mocked(api.getAttachableListings).mockResolvedValue({ listings: [{ id: 'l9', title: 'Sea view flat', price: 200000, listingType: 'sale', city: 'Budva' }] } as never);
    vi.mocked(api.updateUnit).mockResolvedValue({} as never);
    vi.mocked(api.attachListing).mockResolvedValue({} as never);
    renderDialog();

    await userEvent.click(screen.getByRole('button', { name: 'inventory.prefill.open' }));
    await userEvent.click(await screen.findByRole('button', { name: /Sea view flat/ }));
    expect(await screen.findByText('inventory.prefill.done')).toBeInTheDocument();
    expect(field('unit.beds')).toHaveValue(3);
    expect((field('unit.orientation') as unknown as HTMLSelectElement).value).toBe('southEast');

    await userEvent.click(screen.getByRole('button', { name: 'inventory.edit.save' }));
    await waitFor(() => expect(api.attachListing).toHaveBeenCalledWith('dev1', 'u1', 'l9', false));
    expect(api.updateUnit).toHaveBeenCalledWith('dev1', 'u1', expect.objectContaining({ beds: 3, totalArea: 95, orientation: 'southEast', viewType: 'sea' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
