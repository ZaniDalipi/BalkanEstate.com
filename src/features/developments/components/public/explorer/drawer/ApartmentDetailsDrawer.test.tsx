import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ApartmentDetailsDrawer } from './ApartmentDetailsDrawer';
import { useUnitDrawer } from '../../../../hooks/useUnitDrawer';
import type { PublicUnitDetail } from '../../../../types';

vi.mock('react-i18next', async () => (await import('../__tests__/i18nMock')).default);

const h = vi.hoisted(() => ({
  router: null as null | { navigate: (to: unknown, o?: unknown) => Promise<void> },
  detail: null as null | PublicUnitDetail,
  sendUnitInquiry: vi.fn(),
}));

vi.mock('@/src/app/router/navigation', () => ({
  navigate: (to: string, o?: { replace?: boolean; state?: unknown }) => h.router!.navigate(to, { replace: o?.replace, state: o?.state }),
  goBack: () => h.router!.navigate(-1),
  replaceQueryString: () => undefined,
}));
vi.mock('../../../../api/developmentsApi', () => ({
  getPublicUnit: () => Promise.resolve(h.detail),
  sendUnitInquiry: (...a: unknown[]) => h.sendUnitInquiry(...a),
}));
vi.mock('@/context/AppContext', () => ({
  useAppContext: () => ({
    state: { isAuthenticated: false, savedHomes: [], comparisonList: [], currentUser: null },
    dispatch: vi.fn(),
    toggleSavedHome: vi.fn(),
  }),
}));
vi.mock('@/src/features/properties/hooks/useProperty', () => ({
  useProperty: (id: string) => ({ property: id ? { id, title: 'Listing', imageUrl: '' } : null }),
}));
vi.mock('@/src/components/marketing/SocialShare', () => ({ SocialShare: () => <button type="button">Share</button> }));

const detail = (over: Partial<PublicUnitDetail['unit']> = {}, allowUnitInquiries = true): PublicUnitDetail => ({
  unit: {
    id: 'u1', developmentId: 'd', buildingId: 'b', floorId: 'f', unitNumber: 'A12', unitType: 'apartment',
    availability: 'available', listingIds: [], beds: 2, totalArea: 80, price: 150000, currency: 'EUR', ...over,
  },
  development: { name: 'East Gate', slug: 'res', city: 'Skopje', country: 'MK', allowUnitInquiries },
  listings: over.primaryListingId ? [{ id: over.primaryListingId, title: 'Listing' }] : [],
});

const Harness = () => {
  const d = useUnitDrawer();
  return (
    <>
      <button type="button" onClick={() => d.open('u1')}>open-unit</button>
      <ApartmentDetailsDrawer slug="res" unitId={d.unitId} onClose={d.close} />
    </>
  );
};

const mount = (entry: string) => {
  const router = createMemoryRouter([{ path: '/en/developments/res', element: <Harness /> }], { initialEntries: [entry] });
  h.router = router as never;
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
  return router;
};

beforeEach(() => {
  h.detail = detail();
  h.sendUnitInquiry.mockReset();
});

describe('ApartmentDetailsDrawer + useUnitDrawer', () => {
  it('opens from ?unit= and closing removes the param (replace)', async () => {
    const router = mount('/en/developments/res?unit=u1&beds=2');
    expect(await screen.findByRole('heading', { name: 'Apt A12' })).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(router.state.location.search).toBe('?beds=2'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('opening pushes a history entry so Back (or Esc) closes it', async () => {
    const router = mount('/en/developments/res');
    fireEvent.click(screen.getByText('open-unit'));
    await screen.findByRole('dialog');
    expect(router.state.location.search).toBe('?unit=u1');
    expect(router.state.historyAction).toBe('PUSH');
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    await waitFor(() => expect(router.state.location.search).toBe(''));
    expect(router.state.historyAction).toBe('POP');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('a unit without a listing shows the validated inquiry form', async () => {
    h.sendUnitInquiry.mockResolvedValue({ message: 'ok' });
    mount('/en/developments/res?unit=u1');
    const form = await screen.findByRole('form', { name: 'Ask about this apartment' });
    expect(screen.queryByText('Schedule viewing')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Send inquiry' }));
    expect(await screen.findAllByText('This field is required.')).toHaveLength(2);
    expect(h.sendUnitInquiry).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Ana' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ana@example.com' } });
    await act(async () => {
      fireEvent.submit(form);
    });
    await screen.findByRole('status');
    expect(h.sendUnitInquiry).toHaveBeenCalledWith('res', 'u1', expect.objectContaining({ name: 'Ana', email: 'ana@example.com' }));
  });

  it('shows the error state when the inquiry fails', async () => {
    h.sendUnitInquiry.mockRejectedValue(new Error('boom'));
    mount('/en/developments/res?unit=u1');
    const form = await screen.findByRole('form');
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Ana' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ana@example.com' } });
    await act(async () => {
      fireEvent.submit(form);
    });
    expect(await screen.findByText('Your inquiry could not be sent. Please try again.')).toBeInTheDocument();
  });

  it('hides the inquiry form when the development disallows unit inquiries', async () => {
    h.detail = detail({}, false);
    mount('/en/developments/res?unit=u1');
    await screen.findByRole('heading', { name: 'Apt A12' });
    expect(screen.queryByRole('form')).not.toBeInTheDocument();
  });

  it('a unit with a primary listing offers the listing actions', async () => {
    h.detail = detail({ primaryListingId: 'p1', hasListing: true });
    mount('/en/developments/res?unit=u1');
    expect(await screen.findByRole('button', { name: /Send inquiry/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Schedule viewing/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Open full listing/ })).toBeInTheDocument();
  });

  it('a sold unit shows no inquiry or viewing CTAs', async () => {
    h.detail = detail({ availability: 'sold', primaryListingId: 'p1', hasListing: true });
    mount('/en/developments/res?unit=u1');
    expect(await screen.findByRole('button', { name: /Open full listing/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Send inquiry/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Schedule viewing/ })).not.toBeInTheDocument();
  });

  it('a sold unit without a listing shows no inquiry form', async () => {
    h.detail = detail({ availability: 'sold' });
    mount('/en/developments/res?unit=u1');
    expect(await screen.findByText('This apartment is no longer available.')).toBeInTheDocument();
    expect(screen.queryByRole('form')).not.toBeInTheDocument();
  });
});
