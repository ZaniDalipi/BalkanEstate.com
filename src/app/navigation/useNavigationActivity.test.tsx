import { describe, expect, it } from 'vitest';
import React from 'react';
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import { navigate, registerRouter } from '@/src/app/router/navigation';
import { useNavigationActivity } from './useNavigationActivity';

/** A page that fetches something slow whenever its query string changes (like a sheet loading its apartment). */
const Page = () => {
  const { search } = useLocation();
  useQuery({ queryKey: ['thing', search], queryFn: () => new Promise((r) => setTimeout(() => r(search), 500)), enabled: search !== '' });
  const busy = useNavigationActivity();
  return <p data-testid="circle">{busy ? 'shown' : 'hidden'}</p>;
};

const mount = () => {
  const router = createMemoryRouter([{ path: '/en/res', element: <Page /> }], { initialEntries: ['/en/res'] });
  registerRouter(router);
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
};
const pause = (ms: number) => act(() => new Promise((r) => setTimeout(r, ms)));

describe('useNavigationActivity', () => {
  it('shows no page-loading circle for an in-page change, even while the page fetches', async () => {
    mount();
    act(() => navigate('/en/res?unit=1', { inPage: true }));
    await pause(350);
    expect(screen.getByTestId('circle')).toHaveTextContent('hidden');
  });

  it('still shows it for a change that is not marked in-page', async () => {
    mount();
    act(() => navigate('/en/res?unit=2'));
    await waitFor(() => expect(screen.getByTestId('circle')).toHaveTextContent('shown'), { timeout: 1000 });
  });
});
