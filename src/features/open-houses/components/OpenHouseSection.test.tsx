import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { OpenHouse } from '../types';
import OpenHouseSection from './OpenHouseSection';

const h = vi.hoisted(() => ({
  list: vi.fn(),
  rsvp: vi.fn(),
  cancel: vi.fn(),
}));

// Read the English defaults (with {{values}} filled in), as a user sees them.
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      const text = typeof opts?.defaultValue === 'string' ? opts.defaultValue : key;
      return text.replace(/\{\{(\w+)\}\}/g, (_, k: string) => String(opts?.[k] ?? ''));
    },
    i18n: { language: 'en' },
  }),
}));

vi.mock('../api/openHouseApi', () => ({
  fetchPropertyOpenHouses: (...a: unknown[]) => h.list(...a),
  rsvpOpenHouse: (...a: unknown[]) => h.rsvp(...a),
  cancelRsvp: (...a: unknown[]) => h.cancel(...a),
}));

const soon = (days: number, hours = 2): Pick<OpenHouse, 'startsAt' | 'endsAt'> => {
  const s = new Date(Date.now() + days * 86_400_000);
  return { startsAt: s.toISOString(), endsAt: new Date(s.getTime() + hours * 3_600_000).toISOString() };
};
const openHouse = (over: Partial<OpenHouse> = {}): OpenHouse => ({
  id: 'oh1', propertyId: 'p1', ...soon(3), spotsLeft: null, rsvpCount: 0, isFull: false, isGoing: false, ...over,
});

const property = { id: 'p1', title: 'Sea view flat', city: 'Budva', country: 'Montenegro' };
const guest = { name: '', email: '', phone: '', isSignedIn: false };

function renderSection(props: Partial<React.ComponentProps<typeof OpenHouseSection>> = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const handlers = { onRequestViewing: vi.fn(), onAskSeller: vi.fn() };
  const utils = render(
    <QueryClientProvider client={qc}>
      <OpenHouseSection property={property} viewer={guest} {...handlers} {...props} />
    </QueryClientProvider>,
  );
  return { ...utils, ...handlers };
}

beforeEach(() => {
  h.list.mockReset();
  h.rsvp.mockReset();
  h.cancel.mockReset();
  // The shared setup stubs localStorage as a no-op; give this file a real one.
  const store = new Map<string, string>();
  vi.mocked(window.localStorage.getItem).mockImplementation((k: string) => store.get(k) ?? null);
  vi.mocked(window.localStorage.setItem).mockImplementation((k: string, v: string) => { store.set(k, v); });
});

describe('OpenHouseSection', () => {
  it('shows nothing when the owner has not planned an open house', async () => {
    h.list.mockResolvedValue([]);
    const { container } = renderSection();
    await waitFor(() => expect(h.list).toHaveBeenCalledWith('p1'));
    expect(container).toBeEmptyDOMElement();
  });

  it('lets a guest sign up, checking the fields first', async () => {
    h.list.mockResolvedValueOnce([openHouse()]);
    h.rsvp.mockResolvedValue(openHouse({ isGoing: true, myRsvpId: 'r1', rsvpCount: 1 }));
    h.list.mockResolvedValue([openHouse({ isGoing: false, rsvpCount: 1 })]);
    renderSection();

    fireEvent.click(await screen.findByRole('button', { name: "I'm coming" }));
    const dialog = await screen.findByRole('dialog', { name: 'Come to the open house' });
    expect(dialog).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Count me in' }));
    const alerts = await screen.findAllByRole('alert');
    expect(alerts.map((a) => a.textContent)).toEqual(['Please enter your name', 'Please enter a valid email address']);
    expect(h.rsvp).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'Ana' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ana@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Count me in' }));

    // {}: no captcha token when no site key is set
    await waitFor(() => expect(h.rsvp).toHaveBeenCalledWith('oh1', { name: 'Ana', email: 'ana@example.com', phone: undefined }, {}));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    // The guest's sign-up is remembered in this browser, so the page shows it.
    expect(await screen.findByText(/You're going/)).toBeInTheDocument();
  });

  it('offers a private viewing when the open house is full', async () => {
    h.list.mockResolvedValue([openHouse({ isFull: true, spotsLeft: 0, capacity: 5, rsvpCount: 5 })]);
    const { onRequestViewing } = renderSection();
    expect(await screen.findByText('Full')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: "I'm coming" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Request a private viewing' }));
    expect(onRequestViewing).toHaveBeenCalled();
  });

  it('falls back to asking the seller when the listing takes no viewings', async () => {
    h.list.mockResolvedValue([openHouse({ isFull: true, spotsLeft: 0, capacity: 5, rsvpCount: 5 })]);
    const { onAskSeller } = renderSection({ onRequestViewing: undefined });
    fireEvent.click(await screen.findByRole('button', { name: 'Ask the seller for another time' }));
    expect(onAskSeller).toHaveBeenCalled();
  });

  it('lets someone who is going cancel', async () => {
    h.list.mockResolvedValue([openHouse({ isGoing: true, myRsvpId: 'r9' })]);
    h.cancel.mockResolvedValue(openHouse());
    renderSection({ viewer: { ...guest, isSignedIn: true } });
    fireEvent.click(await screen.findByRole('button', { name: "Can't make it" }));
    await waitFor(() => expect(h.cancel).toHaveBeenCalledWith('oh1', 'r9'));
  });
});
