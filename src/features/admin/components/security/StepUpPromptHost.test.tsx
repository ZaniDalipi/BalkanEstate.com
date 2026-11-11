import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { codeForRetry } from '@/src/shared/api/adminStepUp';
import { StepUpPromptHost } from './StepUpPromptHost';

vi.mock('react-i18next', async () => (await import('@/src/features/developments/components/public/explorer/__tests__/i18nMock')).default);
vi.mock('../../api/adminSecurityApi', () => ({ startAuthenticatorSetup: vi.fn(), confirmAuthenticatorSetup: vi.fn() }));

const renderHost = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <StepUpPromptHost />
    </QueryClientProvider>
  );

describe('StepUpPromptHost', () => {
  it('asks for the authenticator code and hands it back', async () => {
    renderHost();
    const answer = codeForRetry(403, { error: 'STEP_UP_REQUIRED', message: '' }, 0);

    fireEvent.change(await screen.findByLabelText('Authenticator code'), { target: { value: '12 34 56' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    await expect(answer).resolves.toBe('123456');
    await waitFor(() => expect(screen.queryByLabelText('Authenticator code')).not.toBeInTheDocument());
  });

  it('shows why a code was refused, and cancelling gives up', async () => {
    renderHost();
    const answer = codeForRetry(403, { error: 'STEP_UP_INVALID', message: 'That code is not right.' }, 1);

    expect(await screen.findByRole('alert')).toHaveTextContent('That code is not right.');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await expect(answer).resolves.toBeNull();
  });

  it('walks through setting up the authenticator when there is none', async () => {
    renderHost();
    void codeForRetry(403, { error: 'STEP_UP_SETUP_REQUIRED', message: '' }, 0);
    expect(await screen.findByRole('button', { name: 'Set up authenticator app' })).toBeInTheDocument();
  });
});
