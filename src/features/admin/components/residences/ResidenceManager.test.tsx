import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import type { AdminResidence, AdminResidenceList } from '../../api/residenceAdminApi';
import { ResidenceManager } from './ResidenceManager';

vi.mock('react-i18next', async () => (await import('@/src/features/developments/components/public/explorer/__tests__/i18nMock')).default);
vi.mock('@/src/shared/hooks/useNotification', () => ({ useNotification: () => ({ success: vi.fn(), error: vi.fn() }) }));

const api = vi.hoisted(() => ({
  listAdminResidences: vi.fn(),
  setResidenceBuildingLimit: vi.fn(),
  grantResidencePass: vi.fn(),
  getAgencyResidenceAllowance: vi.fn(),
  addAgencyResidences: vi.fn(),
}));
vi.mock('../../api/residenceAdminApi', () => api);

const residence = (over: Partial<AdminResidence> = {}): AdminResidence => ({
  id: 'r1',
  name: 'Aurora Residence',
  slug: 'aurora',
  city: 'Tirana',
  status: 'published',
  state: 'agency',
  publicNow: true,
  visibleUntil: '2027-10-01T00:00:00.000Z',
  owner: { name: 'Owner', email: 'o@test.com' },
  agency: { id: 'a1', name: 'Blue Agency' },
  buildings: { used: 4, limit: 5, adminLimit: null },
  ...over,
});
const list = (items: AdminResidence[]): AdminResidenceList => ({ items, total: items.length, page: 1, pageSize: 20, includedBuildings: 5 });

const renderIt = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <ResidenceManager />
    </QueryClientProvider>
  );

/** The card list (phones and tablets) is in the DOM alongside the table; use the cards. */
const firstCard = async () => within((await screen.findAllByRole('listitem'))[0]);

beforeEach(() => Object.values(api).forEach((f) => f.mockReset()));

describe('ResidenceManager', () => {
  it('lists residences with their plan and building use', async () => {
    api.listAdminResidences.mockResolvedValue(list([residence()]));
    renderIt();
    const card = await firstCard();
    expect(card.getByText('Aurora Residence')).toBeInTheDocument();
    expect(card.getAllByText('Agency free').length).toBeGreaterThan(0);
    expect(card.getByRole('button', { name: 'Agency residences' })).toBeInTheDocument();
  });

  it('shows an error with a retry when the list fails', async () => {
    api.listAdminResidences.mockRejectedValueOnce(new Error('boom')).mockResolvedValue(list([]));
    renderIt();
    const alert = await screen.findByRole('alert');
    fireEvent.click(within(alert).getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('No residences match.')).toBeInTheDocument();
  });

  it('refuses a building limit below the buildings already there, then saves a valid one', async () => {
    api.listAdminResidences.mockResolvedValue(list([residence()]));
    api.setResidenceBuildingLimit.mockResolvedValue({ limit: 8, used: 4 });
    renderIt();
    fireEvent.click((await firstCard()).getByRole('button', { name: 'Building limit' }));
    const dialog = await screen.findByRole('dialog');
    const input = within(dialog).getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '3' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save limit' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('already has 4 buildings');
    expect(api.setResidenceBuildingLimit).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: '8' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save limit' }));
    await waitFor(() => expect(api.setResidenceBuildingLimit).toHaveBeenCalledWith('r1', 8));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('keeps the dialog open with the server’s reason when saving fails', async () => {
    api.listAdminResidences.mockResolvedValue(list([residence()]));
    api.grantResidencePass.mockRejectedValue(new Error('Residence not found'));
    renderIt();
    fireEvent.click((await firstCard()).getByRole('button', { name: 'Give pass' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Give pass' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Residence not found');
    expect(api.grantResidencePass).toHaveBeenCalledWith('r1', { months: 12, note: undefined });
  });
});
