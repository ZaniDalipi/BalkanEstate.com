import React from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HomeProfessionalsSection from './HomeProfessionalsSection';

const h = vi.hoisted(() => ({
  state: { listings: [] as unknown[], isLoading: false, error: null as unknown },
  user: null as unknown,
  dispatch: vi.fn(),
  navigate: vi.fn(),
  filters: undefined as unknown,
}));
vi.mock('@/src/features/business-directory/hooks/useBusinessListings', () => ({
  useBusinessListings: (filters: unknown) => { h.filters = filters; return h.state; },
}));
vi.mock('@/context/AppContext', () => ({ useAppContext: () => ({ state: { currentUser: h.user }, dispatch: h.dispatch }) }));
vi.mock('@/src/app/router/navigation', () => ({ navigate: (...a: unknown[]) => h.navigate(...a), localizePath: (p: string) => `/en${p}` }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, fallback?: string) => (typeof fallback === 'string' ? fallback : key) }),
}));

beforeAll(() => {
  if (!('ResizeObserver' in window)) {
    (window as unknown as { ResizeObserver: unknown }).ResizeObserver = class { observe() {} disconnect() {} unobserve() {} };
  }
});

const person = { id: 'p1', slug: 'ana', name: 'Ana Kovač', category: 'cleaning', city: 'Pula', country: 'Croatia', services: [], contactPhone: '1', owner: {}, listingType: 'individual', isVerified: false };

beforeEach(() => {
  h.state = { listings: [], isLoading: false, error: null };
  h.user = null;
  h.dispatch.mockClear();
  h.navigate.mockClear();
});

describe('HomeProfessionalsSection', () => {
  it('asks for individuals only and hangs them on the rail', () => {
    h.state = { ...h.state, listings: [person] };
    render(<HomeProfessionalsSection />);
    expect(h.filters).toMatchObject({ listingType: 'individual' });
    expect(screen.getByRole('heading', { name: 'Featured Professionals' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ana Kovač/ })).toBeInTheDocument();
  });

  it('hides itself with nobody to show or when loading fails', () => {
    const { container, rerender } = render(<HomeProfessionalsSection />);
    expect(container).toBeEmptyDOMElement();
    h.state = { ...h.state, listings: [person], error: new Error('down') };
    rerender(<HomeProfessionalsSection />);
    expect(container).toBeEmptyDOMElement();
  });

  it('sends a signed-out visitor to sign in, and a signed-in one to the new listing form', () => {
    h.state = { ...h.state, listings: [person] };
    const { rerender } = render(<HomeProfessionalsSection />);
    fireEvent.click(screen.getByRole('button', { name: /Offer your services/ }));
    expect(h.dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'TOGGLE_AUTH_MODAL' }));
    h.user = { id: 'u1' };
    rerender(<HomeProfessionalsSection />);
    fireEvent.click(screen.getByRole('button', { name: /Offer your services/ }));
    expect(h.navigate).toHaveBeenCalledWith('/business-directory/new?type=individual');
  });
});
