import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { daysLeft, hasListings, shouldShowAnnouncement } from './announcementRules';
import { useEventsAnnouncementStore } from './announcementStore';
import EventsAnnouncementDialog from './EventsAnnouncementDialog';

vi.mock('react-i18next', async () => (await import('../components/testI18n')).englishDefaults());
const nav = vi.hoisted(() => ({ navigate: vi.fn() }));
vi.mock('@/src/app/router/navigation', () => ({ navigate: (...a: unknown[]) => nav.navigate(...a) }));

const DAY = 24 * 60 * 60 * 1000;
const seller = { listingsCount: 2 };
const fresh = { firstSeenAt: null, dismissed: false };

describe('announcement rules', () => {
  it('is for people with listings only, trusting real counts only', () => {
    expect(hasListings(null)).toBe(false);
    expect(hasListings({})).toBe(false);
    expect(hasListings({ listingsCount: 0, subscription: { activeListingsCount: 0 } })).toBe(false);
    expect(hasListings({ listingsCount: Number.NaN })).toBe(false);
    expect(hasListings({ listingsCount: '3' as unknown as number })).toBe(false);
    expect(hasListings({ subscription: { activeListingsCount: 1 } })).toBe(true);
    expect(hasListings(seller)).toBe(true);
  });

  it('shows during one week from the first time it is seen, never after turning it off', () => {
    const now = 1_000 * DAY;
    expect(shouldShowAnnouncement(seller, fresh, now)).toBe(true);
    expect(shouldShowAnnouncement(seller, { firstSeenAt: now - 6.9 * DAY, dismissed: false }, now)).toBe(true);
    expect(shouldShowAnnouncement(seller, { firstSeenAt: now - 7 * DAY, dismissed: false }, now)).toBe(false);
    expect(shouldShowAnnouncement(seller, { firstSeenAt: now, dismissed: true }, now)).toBe(false);
    expect(shouldShowAnnouncement({ listingsCount: 0 }, fresh, now)).toBe(false);
  });

  it('treats a broken stored date as "never seen"', () => {
    const now = 1_000 * DAY;
    expect(shouldShowAnnouncement(seller, { firstSeenAt: Number.NaN, dismissed: false }, now)).toBe(true);
    expect(shouldShowAnnouncement(seller, { firstSeenAt: now + 30 * DAY, dismissed: false }, now)).toBe(true);
    expect(daysLeft(Number.NaN, now)).toBe(7);
  });

  it('counts the days left', () => {
    expect(daysLeft(null, 0)).toBe(7);
    expect(daysLeft(0, 2.5 * DAY)).toBe(5);
    expect(daysLeft(0, 6.99 * DAY)).toBe(1);
  });
});

describe('EventsAnnouncementDialog', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    nav.navigate.mockReset();
    act(() => useEventsAnnouncementStore.setState({ firstSeenAt: null, dismissed: false, hiddenThisVisit: false }));
  });
  afterEach(() => vi.useRealTimers());

  const openAfterDelay = () => act(() => { vi.advanceTimersByTime(1600); });
  const dialog = () => screen.queryByRole('dialog', { name: /You can now host open houses and announce auctions/ });

  it('never opens for someone without listings', () => {
    render(<EventsAnnouncementDialog user={{ listingsCount: 0 }} />);
    openAfterDelay();
    expect(dialog()).toBeNull();
    expect(useEventsAnnouncementStore.getState().firstSeenAt).toBeNull();
  });

  it('opens for a seller a moment after the app loads, starts their week, focuses the main action', () => {
    render(<EventsAnnouncementDialog user={seller} />);
    expect(dialog()).toBeNull();
    openAfterDelay();
    expect(dialog()).not.toBeNull();
    expect(useEventsAnnouncementStore.getState().firstSeenAt).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Add one to a listing' })).toHaveFocus();
    expect(screen.getByText('Days left: 7')).toBeInTheDocument();
  });

  it('waits while another dialog is open', () => {
    const { rerender } = render(
      <>
        <div role="dialog" aria-label="Sign in">x</div>
        <EventsAnnouncementDialog user={seller} />
      </>,
    );
    // jsdom has no layout, so pretend the sign-in dialog is visible.
    const signIn = screen.getByRole('dialog', { name: 'Sign in' });
    vi.spyOn(signIn, 'getClientRects').mockReturnValue([{}] as unknown as DOMRectList);
    openAfterDelay();
    expect(dialog()).toBeNull();
    rerender(<><EventsAnnouncementDialog user={seller} /></>); // the sign-in dialog closed
    act(() => { vi.advanceTimersByTime(2100); });
    expect(dialog()).not.toBeNull();
  });

  it('"Not now" and Esc close it for this visit only', () => {
    render(<EventsAnnouncementDialog user={seller} />);
    openAfterDelay();
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
    expect(useEventsAnnouncementStore.getState()).toMatchObject({ hiddenThisVisit: true, dismissed: false });

    act(() => useEventsAnnouncementStore.setState({ hiddenThisVisit: false })); // next visit
    openAfterDelay();
    expect(dialog()).not.toBeNull();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(useEventsAnnouncementStore.getState()).toMatchObject({ hiddenThisVisit: true, dismissed: false });
  });

  it('"Add one to a listing" opens My Listings and turns it off', () => {
    render(<EventsAnnouncementDialog user={seller} />);
    openAfterDelay();
    fireEvent.click(screen.getByRole('button', { name: 'Add one to a listing' }));
    expect(nav.navigate).toHaveBeenCalledWith('/account/listings', { direction: 'forward' });
    expect(useEventsAnnouncementStore.getState().dismissed).toBe(true);
  });

  it('"Don\'t show this again" turns it off for good', () => {
    render(<EventsAnnouncementDialog user={seller} />);
    openAfterDelay();
    fireEvent.click(screen.getByRole('button', { name: "Don't show this again" }));
    expect(useEventsAnnouncementStore.getState().dismissed).toBe(true);
  });

  it('stays closed once the week is over', () => {
    act(() => useEventsAnnouncementStore.setState({ firstSeenAt: Date.now() - 8 * DAY }));
    render(<EventsAnnouncementDialog user={seller} />);
    openAfterDelay();
    expect(dialog()).toBeNull();
  });
});
