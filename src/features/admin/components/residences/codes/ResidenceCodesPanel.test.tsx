import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ResidenceCode } from '../../../api/residenceCodeAdminApi';
import { ResidencesAdmin } from '../ResidencesAdmin';

vi.mock('react-i18next', async () => (await import('@/src/features/developments/components/public/explorer/__tests__/i18nMock')).default);

const api = vi.hoisted(() => ({
  listResidenceCodes: vi.fn(),
  createResidenceCodes: vi.fn(),
  updateResidenceCode: vi.fn(),
  deleteResidenceCode: vi.fn(),
}));
vi.mock('../../../api/residenceCodeAdminApi', () => api);
vi.mock('../ResidenceManager', () => ({ ResidenceManager: () => <p>residence list</p> }));
const nav = vi.hoisted(() => ({ router: null as null | { navigate: (to: string) => Promise<void> } }));
vi.mock('@/src/app/router/navigation', () => ({ navigate: (to: string) => nav.router!.navigate(to) }));

const code = (over: Partial<ResidenceCode> = {}): ResidenceCode => ({
  id: 'c1', code: 'RES-7K3P-QW9X', kind: 'pass', discountType: 'percentage', discountValue: 100, status: 'active', usedCount: 0, usageLimit: 1,
  validFrom: '2026-11-01T00:00:00Z', validUntil: '2027-02-01T00:00:00Z', note: 'Vardar Homes', isSent: false, sentAt: null,
  createdAt: '2026-11-01T00:00:00Z', createdBy: 'Admin', uses: [], ...over,
});

const mount = (entry = '/en/admin/residences?tab=codes') => {
  const router = createMemoryRouter([{ path: '/en/admin/residences', element: <ResidencesAdmin /> }], { initialEntries: [entry] });
  nav.router = router as never;
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
  return router;
};

beforeEach(() => {
  Object.values(api).forEach((f) => f.mockReset());
  api.listResidenceCodes.mockResolvedValue({ items: [code(), code({ id: 'c2', code: 'RES-USED-0001', status: 'used', usedCount: 1, uses: [{ residence: { name: 'Aria Residences', slug: 'aria' }, at: '2026-11-05T00:00:00Z' }] })], total: 2, page: 1, pageSize: 25 });
  api.updateResidenceCode.mockResolvedValue({});
  api.deleteResidenceCode.mockResolvedValue({});
});

describe('Admin › Residences › Unlock codes', () => {
  it('opens from the URL, and the tabs switch it', async () => {
    const router = mount('/en/admin/residences');
    expect(screen.getByText('residence list')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Unlock codes' }));
    await waitFor(() => expect(router.state.location.search).toBe('?tab=codes'));
    expect(await screen.findByText('RES-7K3P-QW9X')).toBeInTheDocument();
  });

  it('creates codes, checking the form first, and shows them ready to copy', async () => {
    api.createResidenceCodes.mockResolvedValue({ codes: ['RES-AAAA-BBBB', 'RES-CCCC-DDDD'], kind: 'extra_building', discountType: 'percentage', discountValue: 100, validUntil: '2027-01-01T00:00:00Z', usageLimit: 1 });
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'New codes' }));
    fireEvent.click(screen.getByLabelText('Extra buildings'));
    fireEvent.change(screen.getByLabelText('How many codes'), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create codes' }));
    expect(await screen.findByText('Enter a whole number from 1 to 50.')).toBeInTheDocument();
    expect(api.createResidenceCodes).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('How many codes'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('Note (who it is for)'), { target: { value: ' Vardar Homes ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create codes' }));
    await waitFor(() => expect(api.createResidenceCodes).toHaveBeenCalledWith({ kind: 'extra_building', discountType: 'percentage', discountValue: 100, count: 2, usageLimit: 1, days: 90, note: 'Vardar Homes' }));
    const ready = await screen.findByRole('region', { name: 'Codes ready: 2' });
    expect(within(ready).getByText('RES-AAAA-BBBB')).toBeInTheDocument();
    expect(within(ready).getByRole('button', { name: 'Copy all' })).toBeInTheDocument();
  });

  it('creates discount codes: a percentage or an amount off, checked first', async () => {
    api.createResidenceCodes.mockResolvedValue({ codes: ['RES-EEEE-FFFF'], kind: 'pass', discountType: 'percentage', discountValue: 20, validUntil: '2027-01-01T00:00:00Z', usageLimit: 1 });
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'New codes' }));
    fireEvent.click(screen.getByLabelText('Percent off'));
    fireEvent.change(screen.getByLabelText('Percent off (%)'), { target: { value: '100' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create codes' }));
    expect(await screen.findByText('Enter a whole number from 1 to 99.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Percent off (%)'), { target: { value: '20' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create codes' }));
    await waitFor(() => expect(api.createResidenceCodes).toHaveBeenCalledWith(expect.objectContaining({ kind: 'pass', discountType: 'percentage', discountValue: 20 })));
    expect(await screen.findByText(/20% off/)).toBeInTheDocument();
  });

  it('shows each code’s discount in the list', async () => {
    api.listResidenceCodes.mockResolvedValue({ items: [code({ id: 'c3', code: 'RES-FIX-0050', discountType: 'fixed', discountValue: 50 })], total: 1, page: 1, pageSize: 25 });
    mount();
    const row = (await screen.findByText('RES-FIX-0050')).closest('li') as HTMLElement;
    expect(row).toHaveTextContent(/€\s?50 off|50\s?€ off/);
  });

  it('marks a code sent, switches it off, and deletes an unused one only on a second press', async () => {
    mount();
    const row = (await screen.findByText('RES-7K3P-QW9X')).closest('li') as HTMLElement;
    fireEvent.click(within(row).getByRole('button', { name: 'Mark sent' }));
    await waitFor(() => expect(api.updateResidenceCode).toHaveBeenCalledWith('c1', { isActive: undefined, isSent: true }));
    fireEvent.click(within(row).getByRole('button', { name: 'Switch off' }));
    await waitFor(() => expect(api.updateResidenceCode).toHaveBeenLastCalledWith('c1', { isActive: false, isSent: undefined }));
    fireEvent.click(within(row).getByRole('button', { name: 'Delete' }));
    expect(api.deleteResidenceCode).not.toHaveBeenCalled();
    fireEvent.click(within(row).getByRole('button', { name: 'Press again to delete' }));
    await waitFor(() => expect(api.deleteResidenceCode).toHaveBeenCalledWith('c1'));
  });

  it('shows who used a code, and offers no Delete for it', async () => {
    mount();
    const row = (await screen.findByText('RES-USED-0001')).closest('li') as HTMLElement;
    expect(within(row).getByRole('button', { name: /Aria Residences/ })).toBeInTheDocument();
    expect(within(row).queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
  });

  it('says when an action was refused', async () => {
    api.updateResidenceCode.mockRejectedValue(Object.assign(new Error('gone'), { status: 404, code: 'CODE_NOT_FOUND', details: { code: 'CODE_NOT_FOUND' } }));
    mount();
    const row = (await screen.findByText('RES-7K3P-QW9X')).closest('li') as HTMLElement;
    fireEvent.click(within(row).getByRole('button', { name: 'Switch off' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/no longer exists|code/i);
  });

  it('offers to try again when the codes could not load', async () => {
    api.listResidenceCodes.mockRejectedValueOnce(new Error('offline'));
    mount();
    expect(await screen.findByText('Could not load the codes.')).toBeInTheDocument();
  });
});
