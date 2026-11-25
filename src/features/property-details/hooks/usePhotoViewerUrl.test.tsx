import { describe, expect, it } from 'vitest';
import React from 'react';
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router-dom';
import { act, render, screen } from '@testing-library/react';
import { registerRouter } from '@/src/app/router/navigation';
import { usePhotoViewerUrl } from './usePhotoViewerUrl';

let api: ReturnType<typeof usePhotoViewerUrl>;
const Page = () => {
  api = usePhotoViewerUrl(5);
  const { search, state } = useLocation();
  return <p data-testid="loc">{`${search}|${(state as { property?: string } | null)?.property ?? ''}`}</p>;
};

const mount = (entry: string) => {
  const router = createMemoryRouter([{ path: '/en/property/:id', element: <Page /> }], {
    initialEntries: [{ pathname: entry.split('?')[0], search: entry.includes('?') ? `?${entry.split('?')[1]}` : '', state: { property: 'p1' } }],
  });
  registerRouter(router);
  render(<RouterProvider router={router} />);
  return router;
};
const loc = () => screen.getByTestId('loc').textContent;

describe('usePhotoViewerUrl', () => {
  it('opens on a photo link and pages by replacing the entry, keeping the route state', () => {
    const router = mount('/en/property/x');
    expect(api.photoIndex).toBeNull();
    act(() => api.open(1));
    expect(loc()).toBe('?photo=2|p1');
    expect(router.state.historyAction).toBe('PUSH');
    act(() => api.show(3));
    expect(loc()).toBe('?photo=4|p1');
    expect(api.photoIndex).toBe(3);
    expect(router.state.historyAction).toBe('REPLACE');
  });

  it('closes a viewer reached through a shared link by dropping the photo from the URL', () => {
    mount('/en/property/x?photo=3');
    expect(api.photoIndex).toBe(2);
    act(() => api.close());
    expect(loc()).toBe('|p1');
    expect(api.photoIndex).toBeNull();
  });

  it('closes a viewer it opened', () => {
    mount('/en/property/x');
    act(() => api.open(0));
    act(() => api.close());
    expect(loc()).toBe('|p1');
  });
});
