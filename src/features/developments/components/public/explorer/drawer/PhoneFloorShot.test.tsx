import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { ApartmentDetailsDrawer } from './ApartmentDetailsDrawer';
import { useUnitDrawer } from '../../../../hooks/useUnitDrawer';
import type { PublicSceneView, PublicUnitDetail } from '../../../../types';

vi.mock('react-i18next', async () => (await import('../__tests__/i18nMock')).default);

const h = vi.hoisted(() => ({
  router: null as null | { navigate: (to: unknown, o?: unknown) => Promise<void> },
  detail: null as null | PublicUnitDetail,
  views: (() => Promise.resolve({ views: [] as unknown[] })) as () => Promise<{ views: unknown[] }>,
}));

vi.mock('@/src/app/router/navigation', () => ({
  navigate: (to: string, o?: { replace?: boolean; state?: unknown }) => h.router!.navigate(to, { replace: o?.replace, state: o?.state }),
  goBack: () => h.router!.navigate(-1),
  replaceQueryString: () => undefined,
}));
vi.mock('../../../../api/developmentsApi', () => ({
  getPublicUnit: () => Promise.resolve(h.detail),
  getPublicViews: () => h.views(),
  sendUnitInquiry: vi.fn(),
}));
vi.mock('@/context/AppContext', () => ({
  useAppContext: () => ({ state: { isAuthenticated: false, savedHomes: [], comparisonList: [], currentUser: null }, dispatch: vi.fn(), toggleSavedHome: vi.fn() }),
}));
vi.mock('@/src/features/properties/hooks/useProperty', () => ({ useProperty: () => ({ property: null }) }));
vi.mock('@/src/components/marketing/SocialShare', () => ({ SocialShare: () => null }));

const floorView: PublicSceneView = {
  viewKey: 'ground', viewDirection: 'custom', sortOrder: 0, imageUrl: 'https://media.test/ground.jpg', imageWidth: 1600, imageHeight: 900,
  hotspots: [{ id: 'r1', shape: 'rect', points: [[0.1, 0.1], [0.4, 0.5]], linkType: 'unit', linkId: 'u1', z: 0 }],
};
const detail = (over: Partial<PublicUnitDetail['unit']> = {}): PublicUnitDetail => ({
  unit: {
    id: 'u1', developmentId: 'd', buildingId: 'b', floorId: 'f', floorLabel: 'Ground floor', unitNumber: 'A12', unitType: 'apartment',
    availability: 'available', listingIds: [], beds: 2, totalArea: 80, price: 150000, currency: 'EUR', ...over,
  },
  development: { name: 'East Gate', slug: 'res', city: 'Skopje', country: 'MK', allowUnitInquiries: true },
  listings: [],
});

const Harness = () => {
  const d = useUnitDrawer();
  return <ApartmentDetailsDrawer slug="res" unitId={d.unitId} onClose={d.close} floors={[{ id: 'f', hasViews: true }]} />;
};

const mount = () => {
  const router = createMemoryRouter([{ path: '/en/developments/res', element: <Harness /> }], { initialEntries: ['/en/developments/res?unit=u1'] });
  h.router = router as never;
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
};

beforeEach(() => {
  h.views = () => Promise.resolve({ views: [floorView] });
});

describe('phone details sheet: the apartment on its floor’s picture', () => {
  it('leads with the floor picture when the apartment has no photo or plan', async () => {
    h.detail = detail();
    mount();
    const shot = await screen.findByTestId('floor-shot');
    expect(within(shot).getByRole('img', { name: 'Ground floor: Apt A12 highlighted' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'On its floor' })).not.toBeInTheDocument();
  });

  it('adds it as a section under the specs when the apartment has a plan', async () => {
    h.detail = detail({ floorplan: { url: 'https://media.test/plan.png' } });
    mount();
    const section = await screen.findByRole('region', { name: 'On its floor' });
    expect(await within(section).findByTestId('floor-shot')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Floor plan' })).toBeInTheDocument();
  });

  it('offers to try again when the picture could not load', async () => {
    let fail = true;
    h.views = () => (fail ? Promise.reject(new Error('offline')) : Promise.resolve({ views: [floorView] }));
    h.detail = detail();
    mount();
    expect(await screen.findByRole('alert')).toHaveTextContent('The floor picture could not be loaded.');
    fail = false;
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByTestId('floor-shot')).toBeInTheDocument();
  });
});
