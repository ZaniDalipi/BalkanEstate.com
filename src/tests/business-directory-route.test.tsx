import React, { Suspense } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { matchRoutes, MemoryRouter, Routes, Route } from 'react-router-dom';

// The directory page is replaced by a probe that shows the props the route hands it.
vi.mock('@/src/features/business-directory/components/BusinessDirectoryPage', () => ({
  default: (props: { creating?: boolean; initialTab?: string; selectedListingId?: string | null }) => (
    <div data-testid="directory">
      {props.creating ? 'create-form' : 'directory-list'}
    </div>
  ),
}));
vi.mock('@/context/AppContext', () => ({ useAppContext: () => ({ state: {}, dispatch: vi.fn() }) }));
vi.mock('@sentry/react', () => ({
  ErrorBoundary: ({ children }: { children?: unknown }) => children,
  withProfiler: <T,>(c: T) => c,
  withErrorBoundary: <T,>(c: T) => c,
  captureException: vi.fn(), captureMessage: vi.fn(), init: vi.fn(), setUser: vi.fn(),
  withScope: vi.fn(), addBreadcrumb: vi.fn(),
  browserTracingIntegration: vi.fn(), replayIntegration: vi.fn(),
}));

const { appRoutes } = await import('@/src/app/router/routes');

/** Renders only the matched directory route's element, at `url`. */
async function renderDirectoryRoute(url: string) {
  const matches = matchRoutes(appRoutes(null), url);
  const element = matches?.[matches.length - 1].route.element;
  render(
    <MemoryRouter initialEntries={[url]}>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/en/business-directory/*" element={element} />
        </Routes>
      </Suspense>
    </MemoryRouter>,
  );
  return screen.findByTestId('directory');
}

describe('business directory routes', () => {
  it('opens the create form on /business-directory/new ("List Your Business")', async () => {
    expect((await renderDirectoryRoute('/en/business-directory/new')).textContent).toBe('create-form');
  });

  it('shows the list on the directory itself', async () => {
    expect((await renderDirectoryRoute('/en/business-directory')).textContent).toBe('directory-list');
  });
});
