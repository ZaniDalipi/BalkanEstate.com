import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import HomeBusinessesSection from './HomeBusinessesSection';

const h = vi.hoisted(() => ({ state: { listings: [] as unknown[], total: 0, isLoading: false, error: null as unknown } }));
vi.mock('@/src/features/business-directory/hooks/useBusinessListings', () => ({ useBusinessListings: () => h.state }));

const listing = (over: Record<string, unknown>) => ({ id: 'b1', slug: 'nota-notary', name: 'Nota Notary', category: 'notary', city: 'Tirana', country: 'Albania', services: [], contactPhone: '1', owner: {}, listingType: 'business', ...over });

beforeEach(() => {
  h.state = { listings: [], total: 0, isLoading: false, error: null };
});

describe('HomeBusinessesSection', () => {
  it('lists businesses as links (custom category shown as written) and links to the directory', () => {
    h.state = { ...h.state, listings: [listing({}), listing({ id: 'b2', slug: 'x', name: 'Fix It', category: 'other', customCategory: 'Handyman' })], total: 2 };
    render(<HomeBusinessesSection />);
    expect(screen.getByRole('link', { name: /Nota Notary/ })).toHaveAttribute('href', expect.stringContaining('/business-directory/nota-notary'));
    expect(screen.getByRole('link', { name: /Fix It/ })).toHaveTextContent('Handyman');
    expect(screen.getByRole('link', { name: /businesses.viewAll/ })).toHaveAttribute('href', expect.stringContaining('/business-directory'));
    expect(screen.getByRole('button', { name: 'businesses.next' })).toBeInTheDocument();
  });

  it('hides itself with nothing to show, and offers the directory when loading fails', () => {
    const { container, rerender } = render(<HomeBusinessesSection />);
    expect(container).toBeEmptyDOMElement();
    h.state = { ...h.state, error: new Error('down') };
    rerender(<HomeBusinessesSection />);
    expect(screen.getByRole('status')).toHaveTextContent('businesses.loadFailed');
  });
});
