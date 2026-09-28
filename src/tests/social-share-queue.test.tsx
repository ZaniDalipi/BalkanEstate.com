/**
 * Admin social share queue: a pending post can be edited and approved to the
 * connected channels, and an approved one is copied into the Facebook group.
 *
 * The test setup's i18n returns keys, so controls are found by their key.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SocialShareQueue from '../features/admin/components/SocialShareQueue';

const apiRequest = vi.fn();
vi.mock('@/src/shared/api', () => ({
  apiRequest: (...args: unknown[]) => apiRequest(...args),
  uploadRequest: vi.fn(),
}));

const basePost = {
  _id: 'p1',
  propertyId: 'prop1',
  caption: '🏡 Sea-view apartment\n👉 https://balkanestateai.com/property/prop1',
  listingUrl: 'https://balkanestateai.com/property/prop1',
  imageUrls: [],
  title: 'Sea-view apartment',
  city: 'Durrës',
  price: 125000,
  channels: { facebookPage: { state: 'not_sent' }, instagram: { state: 'not_sent' } },
  createdAt: '2026-09-28T10:00:00Z',
};

const config = { facebookPage: true, instagram: false, facebookGroupUrl: 'https://facebook.com/groups/balkan' };

const renderQueue = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <SocialShareQueue />
    </QueryClientProvider>
  );

describe('SocialShareQueue', () => {
  beforeEach(() => {
    apiRequest.mockReset();
  });

  it('approves a pending post with the edited caption and only configured channels', async () => {
    apiRequest.mockImplementation(async (url: string) => {
      if (url.endsWith('/config')) return config;
      if (url.includes('?status=')) return { posts: [{ ...basePost, status: 'pending' }], total: 1, hasMore: false };
      return { post: { ...basePost, status: 'approved' } };
    });
    renderQueue();

    const caption = await screen.findByLabelText('admin:socialShare.caption');
    expect(screen.queryByLabelText('Instagram')).toBeNull();
    fireEvent.change(caption, { target: { value: 'Edited caption' } });
    fireEvent.click(screen.getByRole('button', { name: 'admin:socialShare.approveAndPost' }));

    await waitFor(() =>
      expect(apiRequest).toHaveBeenCalledWith('/admin/social-posts/p1/approve', expect.objectContaining({
        method: 'POST',
        body: { caption: 'Edited caption', channels: ['facebookPage'] },
      }))
    );
  });

  it('copies the caption, opens the group and records the share', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    apiRequest.mockImplementation(async (url: string) => {
      if (url.endsWith('/config')) return config;
      if (url.includes('?status=')) return { posts: [{ ...basePost, status: 'approved' }], total: 1, hasMore: false };
      return { post: basePost };
    });
    renderQueue();

    fireEvent.click(await screen.findByRole('button', { name: 'admin:socialShare.approved' }));
    fireEvent.click(await screen.findByRole('button', { name: 'admin:socialShare.copyAndOpenGroup' }));

    expect(writeText).toHaveBeenCalledWith(basePost.caption);
    expect(open).toHaveBeenCalledWith(config.facebookGroupUrl, '_blank', 'noopener,noreferrer');
    await waitFor(() =>
      expect(apiRequest).toHaveBeenCalledWith('/admin/social-posts/p1/group-shared', expect.objectContaining({
        body: { shared: true },
      }))
    );
  });
});
