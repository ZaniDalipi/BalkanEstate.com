import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ApartmentDetailsDrawer } from './ApartmentDetailsDrawer';
import { useUnitDrawer } from '../../../../hooks/useUnitDrawer';
import type { PublicUnitDetail } from '../../../../types';

vi.mock('react-i18next', async () => (await import('../__tests__/i18nMock')).default);

const h = vi.hoisted(() => ({
  router: null as null | { navigate: (to: unknown, o?: unknown) => Promise<void> },
  detail: null as null | PublicUnitDetail,
}));

vi.mock('@/src/app/router/navigation', () => ({
  navigate: (to: string, o?: { replace?: boolean; state?: unknown }) => h.router!.navigate(to, { replace: o?.replace, state: o?.state }),
  goBack: () => h.router!.navigate(-1),
  replaceQueryString: () => undefined,
}));
vi.mock('../../../../api/developmentsApi', () => ({
  getPublicUnit: () => Promise.resolve(h.detail),
  sendUnitInquiry: vi.fn(),
}));
vi.mock('@/context/AppContext', () => ({
  useAppContext: () => ({
    state: { isAuthenticated: false, savedHomes: [], comparisonList: [], currentUser: null },
    dispatch: vi.fn(),
    toggleSavedHome: vi.fn(),
  }),
}));
vi.mock('@/src/features/properties/hooks/useProperty', () => ({ useProperty: () => ({ property: null }) }));
vi.mock('@/src/components/marketing/SocialShare', () => ({ SocialShare: () => null }));

const PLAN = { url: 'https://media.test/plan.png', width: 1200, height: 900 };
const detail = (over: Partial<PublicUnitDetail['unit']> = {}): PublicUnitDetail => ({
  unit: {
    id: 'u1', developmentId: 'd', buildingId: 'b', floorId: 'f', unitNumber: 'A12', unitType: 'apartment',
    availability: 'available', listingIds: [], beds: 2, totalArea: 80, price: 150000, currency: 'EUR', floorplan: PLAN, ...over,
  },
  development: { name: 'East Gate', slug: 'res', city: 'Skopje', country: 'MK', allowUnitInquiries: true },
  listings: [],
});

/** The apartment's region on the explorer picture, on screen where the buyer clicked it. */
const FacadeRegion = () => (
  <svg>
    <g
      data-unit-id="u1"
      ref={(el) => {
        if (el) el.getBoundingClientRect = () => ({ left: 300, top: 200, width: 60, height: 30, right: 360, bottom: 230, x: 300, y: 200, toJSON: () => ({}) });
      }}
    />
  </svg>
);

const Harness = ({ onFacade }: { onFacade: boolean }) => {
  const d = useUnitDrawer();
  return (
    <>
      {onFacade && <FacadeRegion />}
      <ApartmentDetailsDrawer slug="res" unitId={d.unitId} onClose={d.close} />
    </>
  );
};

const mount = (onFacade = true) => {
  const router = createMemoryRouter([{ path: '/en/developments/res', element: <Harness onFacade={onFacade} /> }], {
    initialEntries: ['/en/developments/res?unit=u1'],
  });
  h.router = router as never;
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
  return router;
};

const matchMedia = window.matchMedia;
beforeEach(() => {
  h.detail = detail();
  // A desktop screen: the details open as a column beside the showcase.
  window.matchMedia = ((query: string) => ({
    matches: query === '(min-width: 768px)',
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  })) as never;
});
afterEach(() => {
  window.matchMedia = matchMedia;
});

describe('desktop apartment showcase', () => {
  it('shows the floor plan as a tilted model beside the details, and lays it flat on request', async () => {
    mount();
    const showcase = await screen.findByTestId('apartment-showcase');
    expect(within(showcase).getByRole('img', { name: 'Floor plan of Apt A12' })).toBeInTheDocument();
    expect(screen.getByTestId('floor-plan-model')).toHaveAttribute('data-pose', 'tilted');

    const modes = within(showcase).getByRole('group', { name: 'Floor plan view' });
    expect(within(modes).getByRole('button', { name: '3D' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(within(modes).getByRole('button', { name: '2D' }));
    expect(within(modes).getByRole('button', { name: '2D' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('floor-plan-model')).toHaveAttribute('data-pose', 'flat');
  });

  it('keeps the showcase inside the dialog, so its buttons are reachable from the keyboard', async () => {
    mount();
    const dialog = await screen.findByRole('dialog', { name: 'Apartment details' });
    expect(dialog).toContainElement(await screen.findByTestId('apartment-showcase'));
  });

  it('does not repeat the plan as the details’ main picture; the floor-plan button stays', async () => {
    mount();
    await screen.findByRole('heading', { name: 'Apt A12' });
    expect(screen.queryByRole('button', { name: 'Open photos' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Floor plan' })).toBeInTheDocument();
  });

  it('“Back to building” closes the apartment', async () => {
    const router = mount();
    fireEvent.click(await screen.findByRole('button', { name: 'Back to building' }));
    await waitFor(() => expect(router.state.location.search).toBe(''));
  });

  it('says just “Back” when the apartment was opened away from the building picture', async () => {
    mount(false);
    expect(await screen.findByRole('button', { name: 'Back' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Back to building' })).not.toBeInTheDocument();
  });

  it('without a floor plan, the apartment’s photos rise instead, and the card does not repeat them', async () => {
    const photos = ['https://media.test/a.jpg', 'https://media.test/b.jpg', 'https://media.test/c.jpg'];
    h.detail = { ...detail({ floorplan: undefined }), unit: { ...detail({ floorplan: undefined }).unit, gallery: photos.map((url) => ({ url })) } };
    mount();
    const showcase = await screen.findByTestId('apartment-showcase');
    expect(within(showcase).getByRole('img', { name: 'Apt A12, photo 1' })).toBeInTheDocument();
    expect(within(showcase).queryByRole('group', { name: 'Floor plan view' })).not.toBeInTheDocument();
    const dock = within(showcase).getByRole('group', { name: 'Open photos' });
    fireEvent.click(within(dock).getByRole('button', { name: 'Photo 2' }));
    expect(within(dock).getByRole('button', { name: 'Photo 2' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(showcase).getByRole('img', { name: 'Apt A12, photo 2' })).toBeInTheDocument();
    // The details card shows no photos of its own.
    expect(screen.getAllByRole('button', { name: 'Photo 2' })).toHaveLength(1);
    expect(screen.queryByRole('button', { name: 'Open photos' })).not.toBeInTheDocument();
  });

  it('without a floor plan, the page is dimmed as before and a click on it closes', async () => {
    h.detail = detail({ floorplan: undefined });
    const router = mount();
    await screen.findByRole('heading', { name: 'Apt A12' });
    expect(screen.queryByTestId('apartment-showcase')).not.toBeInTheDocument();
    const dimmed = document.querySelector('.bg-slate-950\\/50');
    expect(dimmed).not.toBeNull();
    fireEvent.click(dimmed as Element);
    await waitFor(() => expect(router.state.location.search).toBe(''));
  });
});
