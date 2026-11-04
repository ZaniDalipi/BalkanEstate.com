import { describe, it, expect, vi, afterEach } from 'vitest';
import React, { lazy } from 'react';
import { act, render, screen } from '@testing-library/react';
import { createMemoryRouter, Outlet, RouterProvider, useLocation } from 'react-router-dom';
import { registerRouter } from '@/src/app/router/navigation';
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

const Shell: React.FC = () => {
  const { pathname } = useLocation();
  return (
    <PageStage pageKey={pathname}>
      <Outlet />
    </PageStage>
  );
};

function setup() {
  const listings = deferredPage('Listings page');
  const router = createMemoryRouter(
    [{ path: '/', element: <Shell />, children: [
      { index: true, element: <h1>Home page</h1> },
      { path: 'listings', element: <listings.Page /> },
    ] }],
    { initialEntries: ['/'] },
  );
  registerRouter(router);
  render(<RouterProvider router={router} />);
  return { router, listings };
}

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
    expect(screen.queryByTestId('navigation-pending')).not.toBeInTheDocument();

    // A slow load gets the small spinner so the tap does not look ignored.
    await act(async () => { vi.advanceTimersByTime(200); });
    expect(screen.getByTestId('navigation-pending')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Home page' })).toBeInTheDocument();

    await listings.load();
    expect(await screen.findByRole('heading', { name: 'Listings page' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Home page' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('navigation-pending')).not.toBeInTheDocument();
  });

  it('shows no spinner when the next page is ready at once', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { router } = setup();
    await act(async () => { void router.navigate('/listings'); });
    await act(async () => { void router.navigate('/'); });
    await act(async () => { vi.advanceTimersByTime(300); });
    expect(screen.getByRole('heading', { name: 'Home page' })).toBeInTheDocument();
    expect(screen.queryByTestId('navigation-pending')).not.toBeInTheDocument();
  });

  it('fades the arriving page in', () => {
    setup();
    expect(screen.getByRole('heading', { name: 'Home page' }).parentElement).toHaveClass('be-page-fade');
  });
});
