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
const security = vi.hoisted(() => ({ requestClaimEmailCode: vi.fn() }));
vi.mock('../../api/adminSecurityApi', () => security);

/** Open the card's dialog, ask for the emailed code and confirm with it. */
async function claimWithEmailCode() {
  fireEvent.click(await screen.findByRole('button', { name: 'Become super admin' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Email me a code' }));
  fireEvent.change(await screen.findByLabelText('Code we emailed to me••@x.com'), { target: { value: '123 456' } });
  fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
}

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
  security.requestClaimEmailCode.mockReset().mockResolvedValue({ challengeId: 'c1', sentTo: 'me••@x.com', expiresAt: '' });
});

describe('ClaimSuperAdminCard', () => {
  it('lets an admin become the first super admin, confirmed with the emailed code', async () => {
    api.getSuperAdminStatus.mockResolvedValue({ superAdminCount: 0, canClaim: true });
    api.claimSuperAdmin.mockResolvedValue({ message: 'ok', user: { role: 'super_admin' } });
    renderIt();

    await claimWithEmailCode();

    expect(await screen.findByRole('status')).toHaveTextContent('You are now super admin');
    expect(api.claimSuperAdmin).toHaveBeenCalledWith({ challengeId: 'c1', emailCode: '123456' });
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

    await claimWithEmailCode();
    expect(await screen.findByRole('alert')).toHaveTextContent('already has a super admin');
  });
});
