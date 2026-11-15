import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { daysLeft, hasListings, shouldShowAnnouncement } from './announcementRules';
import { useEventsAnnouncementStore } from './announcementStore';
import EventsAnnouncementCard from './EventsAnnouncementCard';

vi.mock('react-i18next', async () => (await import('../components/testI18n')).englishDefaults());
const nav = vi.hoisted(() => ({ navigate: vi.fn() }));
vi.mock('@/src/app/router/navigation', () => ({ navigate: (...a: unknown[]) => nav.navigate(...a) }));

const DAY = 24 * 60 * 60 * 1000;
const seller = { listingsCount: 2 };
const fresh = { firstSeenAt: null, dismissed: false };

describe('announcement rules', () => {
  it('is for people with listings only', () => {
    expect(hasListings(null)).toBe(false);
    expect(hasListings({})).toBe(false);
    expect(hasListings({ listingsCount: 0, subscription: { activeListingsCount: 0 } })).toBe(false);
    expect(hasListings({ subscription: { activeListingsCount: 1 } })).toBe(true);
    expect(hasListings(seller)).toBe(true);
  });

  it('shows for one week from the first time it is seen, and never after closing', () => {
    const now = 1_000 * DAY;
    expect(shouldShowAnnouncement(seller, fresh, now)).toBe(true);
    expect(shouldShowAnnouncement(seller, { firstSeenAt: now - 6.9 * DAY, dismissed: false }, now)).toBe(true);
    expect(shouldShowAnnouncement(seller, { firstSeenAt: now - 7 * DAY, dismissed: false }, now)).toBe(false);
    expect(shouldShowAnnouncement(seller, { firstSeenAt: now, dismissed: true }, now)).toBe(false);
    expect(shouldShowAnnouncement({ listingsCount: 0 }, fresh, now)).toBe(false);
  });

  it('counts the days left', () => {
    expect(daysLeft(null, 0)).toBe(7);
    expect(daysLeft(0, 2.5 * DAY)).toBe(5);
    expect(daysLeft(0, 6.99 * DAY)).toBe(1);
  });
});

describe('EventsAnnouncementCard', () => {
  beforeEach(() => {
    nav.navigate.mockReset();
    act(() => useEventsAnnouncementStore.setState({ firstSeenAt: null, dismissed: false }));
  });

  it('shows nothing to someone without listings', () => {
    const { container } = render(<EventsAnnouncementCard user={{ listingsCount: 0 }} />);
    expect(container).toBeEmptyDOMElement();
    expect(useEventsAnnouncementStore.getState().firstSeenAt).toBeNull();
  });

  it('tells a seller, starts their week, and leads to My Listings', () => {
    render(<EventsAnnouncementCard user={seller} />);
    expect(screen.getByRole('region', { name: /You can now host open houses and announce auctions/ })).toBeInTheDocument();
    expect(screen.getByText('Days left: 7')).toBeInTheDocument();
    expect(useEventsAnnouncementStore.getState().firstSeenAt).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Add one to a listing' }));
    expect(nav.navigate).toHaveBeenCalledWith('/account/listings', { direction: 'forward' });
  });

  it('stays closed once closed', async () => {
    const { rerender } = render(<EventsAnnouncementCard user={seller} />);
    fireEvent.click(screen.getByRole('button', { name: 'Close this message' }));
    expect(useEventsAnnouncementStore.getState().dismissed).toBe(true);
    rerender(<EventsAnnouncementCard user={seller} />);
    // It animates out, then is gone.
    await waitFor(() => expect(screen.queryByRole('region')).not.toBeInTheDocument());
  });

  it('is gone after the week', () => {
    act(() => useEventsAnnouncementStore.setState({ firstSeenAt: Date.now() - 8 * DAY }));
    const { container } = render(<EventsAnnouncementCard user={seller} />);
    expect(container).toBeEmptyDOMElement();
  });
});
