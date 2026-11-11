import { describe, it, expect, vi, afterEach } from 'vitest';
import React, { lazy } from 'react';
import { act, render, screen } from '@testing-library/react';
import { createMemoryRouter, Outlet, RouterProvider, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { registerRouter } from '@/src/app/router/navigation';
import { RouteLoader } from '@/src/shared/components/ui/RouteLoader';
import { PageStage } from './PageStage';

vi.mock('react-i18next', async () => (await import('@/src/features/developments/components/public/explorer/__tests__/i18nMock')).default);
vi.mock('@/src/lib/sentry', () => ({ captureError: vi.fn(), addBreadcrumb: vi.fn() }));

/** A route whose code arrives only when the test says so, like a lazy chunk on a slow phone network. */
function deferredPage(text: string) {
  let resolve: () => void = () => undefined;
  const loaded = new Promise<{ default: React.FC }>((done) => {
    resolve = () => done({ default: () => <h1>{text}</h1> });
  });
  return { Page: lazy(() => loaded), load: () => act(async () => { resolve(); await loaded; }) };
}

/** A request the test answers when it chooses, like the API on a slow network. */
function deferredRequest() {
  let resolve: () => void = () => undefined;
  const done = new Promise<string>((ok) => { resolve = () => ok('Sea view, 3 rooms'); });
  return { fetcher: () => done, answer: () => act(async () => { resolve(); await done; }) };
}

const Shell: React.FC = () => {
  const { pathname } = useLocation();
  return (
    <PageStage pageKey={pathname}>
      <Outlet />
    </PageStage>
  );
};

function setup(extraRoutes: { path: string; element: React.ReactNode }[] = []) {
  const listings = deferredPage('Listings page');
  const router = createMemoryRouter(
    [{ path: '/', element: <Shell />, children: [
      { index: true, element: <h1>Home page</h1> },
      { path: 'listings', element: <listings.Page /> },
      ...extraRoutes,
    ] }],
    { initialEntries: ['/'] },
  );
  registerRouter(router);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { router, listings };
}

const pending = () => screen.queryByTestId('navigation-pending');
const wait = (ms: number) => act(async () => { vi.advanceTimersByTime(ms); });

afterEach(() => {
  vi.useRealTimers();
});

describe('PageStage', () => {
  it('keeps the current page on screen while the next one loads, then swaps', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { router, listings } = setup();
    expect(screen.getByRole('heading', { name: 'Home page' })).toBeInTheDocument();

    await act(async () => { void router.navigate('/listings'); });

    // No blank screen and no full-page loader: the old page is still there.
    expect(screen.getByRole('heading', { name: 'Home page' })).toBeInTheDocument();
    expect(pending()).not.toBeInTheDocument();

    // A slow load gets the small spinner so the tap does not look ignored.
    await wait(200);
    expect(pending()).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Home page' })).toBeInTheDocument();

    await listings.load();
    expect(await screen.findByRole('heading', { name: 'Listings page' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Home page' })).not.toBeInTheDocument();
    await wait(600);
    expect(pending()).not.toBeInTheDocument();
  });

  it('keeps the circle while the opened page fetches its data', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const request = deferredRequest();
    const ListingPage: React.FC = () => {
      const { data } = useQuery({ queryKey: ['listing', 7], queryFn: request.fetcher });
      return <h1>{data ?? 'Listing'}</h1>;
    };
    const { router } = setup([{ path: 'listing', element: <ListingPage /> }]);

    await act(async () => { void router.navigate('/listing'); });
    expect(screen.getByRole('heading', { name: 'Listing' })).toBeInTheDocument();

    await wait(300);
    expect(pending()).toBeInTheDocument();

    await request.answer();
    await wait(10);
    expect(screen.getByRole('heading', { name: 'Sea view, 3 rooms' })).toBeInTheDocument();
    await wait(600);
    expect(pending()).not.toBeInTheDocument();
  });

  it('shows no spinner when the next page is ready at once', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { router } = setup([{ path: 'about', element: <h1>About page</h1> }]);
    await act(async () => { void router.navigate('/about'); });
    await act(async () => { void router.navigate('/'); });
    expect(screen.getByRole('heading', { name: 'Home page' })).toBeInTheDocument();
    for (let i = 0; i < 6; i += 1) {
      await wait(50);
      expect(pending()).not.toBeInTheDocument();
    }
  });

  it('leaves the loading to the page when it shows its own big circle', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const request = deferredRequest();
    const SharedLinkPage: React.FC = () => {
      const { data } = useQuery({ queryKey: ['shared', 1], queryFn: request.fetcher });
      return data ? <h1>{data}</h1> : <RouteLoader />;
    };
    const { router } = setup([{ path: 'shared', element: <SharedLinkPage /> }]);

    await act(async () => { void router.navigate('/shared'); });
    await wait(300);
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(pending()).not.toBeInTheDocument();

    await request.answer();
    await wait(10);
    expect(screen.getByRole('heading', { name: 'Sea view, 3 rooms' })).toBeInTheDocument();
  });

  it('fades the arriving page in', () => {
    setup();
    expect(screen.getByRole('heading', { name: 'Home page' }).parentElement).toHaveClass('be-page-fade');
  });
});
