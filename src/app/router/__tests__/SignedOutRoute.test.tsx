import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

const auth = vi.hoisted(() => ({ isAuthenticated: false }));
vi.mock('@/context/AppContext', () => ({ useAppContext: () => ({ state: { isAuthenticated: auth.isAuthenticated } }) }));

const last = vi.hoisted(() => ({ page: null as string | null }));
vi.mock('../lastPage', () => ({ readLastPage: () => last.page, rememberLastPage: vi.fn() }));

vi.mock('@/src/app/components/QueryErrorBoundary', () => ({ QueryErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

import { SignedOutRoute } from '../routeElements';

const Where: React.FC = () => <p>at {useLocation().pathname}</p>;

const renderLogin = () =>
  render(
    <MemoryRouter initialEntries={['/en/login']}>
      <Routes>
        <Route path="/en/login" element={<SignedOutRoute><p>sign-in form</p></SignedOutRoute>} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  auth.isAuthenticated = false;
  last.page = null;
});

describe('SignedOutRoute', () => {
  it('shows the sign-in form to a signed-out visitor', () => {
    renderLogin();
    expect(screen.getByText('sign-in form')).toBeInTheDocument();
  });

  it('sends a signed-in user back to the last page they had open', () => {
    auth.isAuthenticated = true;
    last.page = '/en/property/abc';
    renderLogin();
    expect(screen.queryByText('sign-in form')).not.toBeInTheDocument();
    expect(screen.getByText('at /en/property/abc')).toBeInTheDocument();
  });

  it('sends a signed-in user home when there is no last page', () => {
    auth.isAuthenticated = true;
    renderLogin();
    expect(screen.queryByText('sign-in form')).not.toBeInTheDocument();
    expect(screen.getByText(/^at \/en/)).toBeInTheDocument();
  });
});
