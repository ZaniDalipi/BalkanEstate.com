import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent } from '@testing-library/react';
import { ClaimSuperAdminCard } from './ClaimSuperAdminCard';

vi.mock('react-i18next', async () => (await import('@/src/features/developments/components/public/explorer/__tests__/i18nMock')).default);

const ctx = vi.hoisted(() => ({ role: 'admin', dispatch: vi.fn() }));
vi.mock('@/context/AppContext', () => ({
  useAppContext: () => ({ state: { currentUser: { id: 'me', role: ctx.role } }, dispatch: ctx.dispatch }),
}));

const api = vi.hoisted(() => ({ getSuperAdminStatus: vi.fn(), claimSuperAdmin: vi.fn() }));
vi.mock('../../api/superAdminApi', () => api);

const renderIt = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
      <ClaimSuperAdminCard />
    </QueryClientProvider>
  );

beforeEach(() => {
  ctx.role = 'admin';
  ctx.dispatch.mockReset();
  api.getSuperAdminStatus.mockReset();
  api.claimSuperAdmin.mockReset();
});

describe('ClaimSuperAdminCard', () => {
  it('lets an admin become the first super admin after confirming', async () => {
    api.getSuperAdminStatus.mockResolvedValue({ superAdminCount: 0, canClaim: true });
    api.claimSuperAdmin.mockResolvedValue({ message: 'ok', user: { role: 'super_admin' } });
    renderIt();

    fireEvent.click(await screen.findByRole('button', { name: 'Become super admin' }));
    expect(api.claimSuperAdmin).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Yes, make me super admin' }));

    expect(await screen.findByRole('status')).toHaveTextContent('You are now super admin');
    expect(ctx.dispatch).toHaveBeenCalledWith({ type: 'UPDATE_USER', payload: { role: 'super_admin' } });
  });

  it('shows nothing once the site has a super admin', async () => {
    api.getSuperAdminStatus.mockResolvedValue({ superAdminCount: 1, canClaim: false });
    const { container } = renderIt();
    await vi.waitFor(() => expect(api.getSuperAdminStatus).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('does not even ask when I am already super admin', () => {
    ctx.role = 'super_admin';
    const { container } = renderIt();
    expect(api.getSuperAdminStatus).not.toHaveBeenCalled();
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the reason when someone else claimed it first', async () => {
    api.getSuperAdminStatus.mockResolvedValue({ superAdminCount: 0, canClaim: true });
    api.claimSuperAdmin.mockRejectedValue(new Error('This site already has a super admin. Ask them to make you super admin.'));
    renderIt();

    fireEvent.click(await screen.findByRole('button', { name: 'Become super admin' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, make me super admin' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('already has a super admin');
  });
});
