/**
 * Email preference toggles
 *
 * Covers the Explore-Cities digest opt-out: it is a switch of its own (turning
 * it off must not touch the other categories), and a save that fails must roll
 * the switch back instead of telling the reader they are unsubscribed.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const apiRequest = vi.fn();

vi.mock('@/src/shared/api', () => ({
  apiRequest: (...args: unknown[]) => apiRequest(...args),
}));

vi.mock('../features/notifications/hooks/usePushNotifications', () => ({
  usePushNotifications: () => ({
    isSupported: false,
    permission: 'unsupported',
    isSubscribed: false,
    isLoading: false,
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
    error: null,
  }),
}));

import NotificationSettingsSection from '../features/notifications/components/NotificationSettingsSection';

const ALL_ON = {
  weeklyStats: true,
  propertyAlerts: true,
  priceDrops: true,
  messages: true,
  cityMarketUpdates: true,
  marketing: true,
  transactional: true,
};

/** The digest's own switch, addressed the way a screen reader would. */
const digestSwitch = () => screen.getByRole('switch', { name: 'account:notifications.email_cityMarketUpdates' });

const renderSection = async (prefs = ALL_ON) => {
  apiRequest.mockImplementation((path: string, options?: { method?: string }) => {
    if (path === '/auth/email-preferences' && (!options?.method || options.method === 'GET')) {
      return Promise.resolve({ emailPreferences: prefs });
    }
    return Promise.resolve({});
  });

  const utils = render(<NotificationSettingsSection />);
  await waitFor(() => expect(digestSwitch()).toBeInTheDocument());
  return utils;
};

describe('Email preferences — city market updates', () => {
  beforeEach(() => {
    apiRequest.mockReset();
  });

  it('offers the digest as its own switch, reflecting the stored preference', async () => {
    await renderSection();

    expect(digestSwitch()).toHaveAttribute('aria-checked', 'true');
  });

  it('shows the digest as off when the reader has unsubscribed', async () => {
    await renderSection({ ...ALL_ON, cityMarketUpdates: false });

    expect(digestSwitch()).toHaveAttribute('aria-checked', 'false');
  });

  it('turns off only the digest, leaving every other category alone', async () => {
    await renderSection();

    fireEvent.click(digestSwitch());

    await waitFor(() => {
      const put = apiRequest.mock.calls.find(([, options]) => options?.method === 'PUT');
      expect(put).toBeTruthy();
      expect(put?.[1].body).toEqual({ ...ALL_ON, cityMarketUpdates: false });
    });
    expect(digestSwitch()).toHaveAttribute('aria-checked', 'false');
  });

  it('rolls the switch back and warns when the save fails', async () => {
    await renderSection();

    apiRequest.mockImplementation((_path: string, options?: { method?: string }) => {
      if (options?.method === 'PUT') return Promise.reject(new Error('network down'));
      return Promise.resolve({ emailPreferences: ALL_ON });
    });

    fireEvent.click(digestSwitch());

    await waitFor(() => expect(screen.getByText('account:notifications.saveError')).toBeInTheDocument());
    // Still subscribed — the reader is not told they opted out when they did not.
    expect(digestSwitch()).toHaveAttribute('aria-checked', 'true');
  });

  it('includes the digest in "turn off all"', async () => {
    await renderSection();

    fireEvent.click(screen.getByText('account:notifications.unsubscribeAll'));

    await waitFor(() => {
      const put = apiRequest.mock.calls.find(([, options]) => options?.method === 'PUT');
      expect(put?.[1].body).toMatchObject({
        cityMarketUpdates: false,
        marketing: false,
        propertyAlerts: false,
        transactional: true,
      });
    });
  });
});
