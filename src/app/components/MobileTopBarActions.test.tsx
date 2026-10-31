import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MobileTopBarActions } from './MobileTopBarActions';

vi.mock('react-i18next', async () => (await import('@/src/features/developments/components/public/explorer/__tests__/i18nMock')).default);

const nav = vi.hoisted(() => ({ navigate: vi.fn() }));
vi.mock('@/src/app/router/navigation', () => nav);
vi.mock('@/context/AppContext', () => ({ useAppContext: () => ({ state: { isAuthenticated: true, currentUser: { _id: 'u1' } } }) }));
vi.mock('@/services/socketService', () => ({ socketService: { onNewNotification: () => () => undefined } }));
vi.mock('@/services/notificationService', () => ({ notificationService: { showNotification: vi.fn() } }));

const notification = {
  _id: 'n1',
  type: 'development_unit_available',
  title: 'New home available at Aurora Residence',
  message: 'Apartment A3 is available.',
  isRead: false,
  createdAt: new Date().toISOString(),
  data: { actionUrl: '/developments/aurora?unit=u9' },
};
const api = vi.hoisted(() => ({ apiRequest: vi.fn() }));
vi.mock('@/src/shared/api', () => api);

beforeEach(() => {
  nav.navigate.mockReset();
  api.apiRequest.mockReset();
  api.apiRequest.mockImplementation((url: string) =>
    Promise.resolve(url.startsWith('/notifications/unread-count') ? { count: 1 } : url.startsWith('/notifications?') ? { notifications: [notification] } : {})
  );
});

describe('MobileTopBarActions', () => {
  it('shows only the home button when signed out', () => {
    render(<MobileTopBarActions isAuthenticated={false} />);
    expect(screen.getByRole('button', { name: 'Go to home' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Notifications' })).not.toBeInTheDocument();
  });

  it('signed in: the bell lists notifications and a tap opens the residence', async () => {
    render(<MobileTopBarActions isAuthenticated />);
    fireEvent.click(await screen.findByRole('button', { name: 'Notifications' }));
    fireEvent.click(await screen.findByText('New home available at Aurora Residence'));
    await waitFor(() => expect(nav.navigate).toHaveBeenCalledWith('/developments/aurora?unit=u9', expect.anything()));
  });

  it('Esc and the labelled close button close the list', async () => {
    render(<MobileTopBarActions isAuthenticated />);
    const bell = await screen.findByRole('button', { name: 'Notifications' });
    fireEvent.click(bell);
    await screen.findByText('New home available at Aurora Residence');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByText('New home available at Aurora Residence')).not.toBeInTheDocument();
    expect(bell).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(bell);
    await screen.findByText('New home available at Aurora Residence');
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByText('New home available at Aurora Residence')).not.toBeInTheDocument();
  });
});
