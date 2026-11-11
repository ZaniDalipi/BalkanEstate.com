import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { AdminAlertSettings } from '../../api/adminAlertSettingsApi';
import { AdminAlertEmailsCard } from './AdminAlertEmailsCard';

vi.mock('react-i18next', async () => (await import('@/src/features/developments/components/public/explorer/__tests__/i18nMock')).default);

const api = vi.hoisted(() => ({ getAdminAlertSettings: vi.fn(), saveAdminAlertEmails: vi.fn(), sendTestAdminAlert: vi.fn() }));
vi.mock('../../api/adminAlertSettingsApi', () => api);

const settings = (over: Partial<AdminAlertSettings> = {}): AdminAlertSettings => ({
  emails: [],
  recipients: ['boss@x.com'],
  source: 'admins',
  notifyNewUser: true,
  notifyNewProperty: true,
  disabled: false,
  canEdit: true,
  maxEmails: 10,
  ...over,
});

const renderIt = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
      <AdminAlertEmailsCard />
    </QueryClientProvider>
  );

const input = () => screen.getByLabelText('Add an email address');

beforeEach(() => Object.values(api).forEach((f) => f.mockReset()));

describe('AdminAlertEmailsCard', () => {
  it('shows who gets the emails now and why', async () => {
    api.getAdminAlertSettings.mockResolvedValue(settings());
    renderIt();
    expect(await screen.findByText(/Sending to: boss@x.com/)).toBeInTheDocument();
    expect(screen.getByText(/every admin account, because no list is set/)).toBeInTheDocument();
  });

  it('lets a super admin add addresses (pasted or typed) and save them', async () => {
    api.getAdminAlertSettings.mockResolvedValue(settings());
    api.saveAdminAlertEmails.mockImplementation(async (emails: string[]) => settings({ emails, recipients: emails, source: 'panel' }));
    renderIt();

    fireEvent.change(await screen.findByLabelText('Add an email address'), { target: { value: 'me@x.com, Team@x.com' } });
    fireEvent.keyDown(input(), { key: 'Enter' });
    fireEvent.click(screen.getByRole('button', { name: 'Save addresses' }));

    await waitFor(() => expect(api.saveAdminAlertEmails).toHaveBeenCalledWith(['me@x.com', 'team@x.com']));
    expect(await screen.findByText(/Sending to: me@x.com, team@x.com/)).toBeInTheDocument();
  });

  it('says which address is not an email, next to the field', async () => {
    api.getAdminAlertSettings.mockResolvedValue(settings());
    renderIt();

    fireEvent.change(await screen.findByLabelText('Add an email address'), { target: { value: 'nope' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Not a valid email: nope');
    expect(input()).toHaveAttribute('aria-invalid', 'true');
  });

  it('removes an address', async () => {
    api.getAdminAlertSettings.mockResolvedValue(settings({ emails: ['a@x.com', 'b@x.com'], recipients: ['a@x.com', 'b@x.com'], source: 'panel' }));
    api.saveAdminAlertEmails.mockResolvedValue(settings({ emails: ['b@x.com'] }));
    renderIt();

    fireEvent.click(await screen.findByRole('button', { name: 'Remove a@x.com' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save addresses' }));
    await waitFor(() => expect(api.saveAdminAlertEmails).toHaveBeenCalledWith(['b@x.com']));
  });

  it('is read-only for a regular admin', async () => {
    api.getAdminAlertSettings.mockResolvedValue(settings({ canEdit: false }));
    renderIt();
    expect(await screen.findByText('Only a super admin can change who gets these emails.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Add an email address')).not.toBeInTheDocument();
  });

  it('sends a test email and says where it went, or why it could not', async () => {
    api.getAdminAlertSettings.mockResolvedValue(settings());
    api.sendTestAdminAlert.mockResolvedValueOnce({ sent: ['boss@x.com'], failed: [] });
    renderIt();

    fireEvent.click(await screen.findByRole('button', { name: 'Send test email' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Test email sent to boss@x.com');

    api.sendTestAdminAlert.mockRejectedValueOnce(new Error('Email sending is not set up on the server'));
    fireEvent.click(screen.getByRole('button', { name: 'Send test email' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Email sending is not set up on the server');
  });
});
