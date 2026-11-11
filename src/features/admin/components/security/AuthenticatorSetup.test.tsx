import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthenticatorSetup } from './AuthenticatorSetup';

vi.mock('react-i18next', async () => (await import('@/src/features/developments/components/public/explorer/__tests__/i18nMock')).default);
const api = vi.hoisted(() => ({ startAuthenticatorSetup: vi.fn(), confirmAuthenticatorSetup: vi.fn() }));
vi.mock('../../api/adminSecurityApi', () => api);

const renderIt = (onDone = vi.fn()) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
      <AuthenticatorSetup onDone={onDone} />
    </QueryClientProvider>
  );

beforeEach(() => {
  api.startAuthenticatorSetup.mockReset().mockResolvedValue({
    secret: 'JBSWY3DPEHPK3PXP', otpauthUri: 'otpauth://totp/x?secret=JBSWY3DPEHPK3PXP', challengeId: 'c1', sentTo: 'me••@x.com', expiresAt: '',
  });
  api.confirmAuthenticatorSetup.mockReset();
});

describe('AuthenticatorSetup', () => {
  it('shows the QR code and key, then turns on with both codes', async () => {
    const onDone = vi.fn();
    api.confirmAuthenticatorSetup.mockResolvedValue({ enabled: true });
    renderIt(onDone);

    fireEvent.click(screen.getByRole('button', { name: 'Set up authenticator app' }));
    expect(await screen.findByRole('img', { name: 'QR code for your authenticator app' })).toBeInTheDocument();
    expect(screen.getByText('JBSW Y3DP EHPK 3PXP')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Code we emailed to me••@x.com'), { target: { value: '111111' } });
    fireEvent.change(screen.getByLabelText('The 6-digit code the app shows now'), { target: { value: '222222' } });
    fireEvent.click(screen.getByRole('button', { name: 'Turn on' }));

    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(api.confirmAuthenticatorSetup).toHaveBeenCalledWith({ challengeId: 'c1', emailCode: '111111', appCode: '222222' });
  });

  it('puts a wrong emailed code next to the email field', async () => {
    api.confirmAuthenticatorSetup.mockRejectedValue(Object.assign(new Error('The emailed code is not right.'), { details: { error: 'EMAIL_CODE_INVALID' } }));
    renderIt();

    fireEvent.click(screen.getByRole('button', { name: 'Set up authenticator app' }));
    fireEvent.change(await screen.findByLabelText('Code we emailed to me••@x.com'), { target: { value: '111111' } });
    fireEvent.change(screen.getByLabelText('The 6-digit code the app shows now'), { target: { value: '222222' } });
    fireEvent.click(screen.getByRole('button', { name: 'Turn on' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('The emailed code is not right.');
    expect(screen.getByLabelText('Code we emailed to me••@x.com')).toHaveAttribute('aria-invalid', 'true');
  });
});
