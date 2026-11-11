import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { ArchivedListing, ArchivedListingPage } from '../../api/archivedListingsAdminApi';
import { ArchivedListingsManager } from './ArchivedListingsManager';

vi.mock('react-i18next', async () => (await import('@/src/features/developments/components/public/explorer/__tests__/i18nMock')).default);

const api = vi.hoisted(() => ({ listArchivedListings: vi.fn() }));
vi.mock('../../api/archivedListingsAdminApi', () => api);

const listing = (over: Partial<ArchivedListing> = {}): ArchivedListing => ({
  _id: 'a1',
  originalPropertyId: 'p1',
  title: 'Sea view flat',
  archiveReason: 'deleted',
  archivedAt: '2026-11-01T10:00:00.000Z',
  deletedBy: { kind: 'admin', name: 'Zana' },
  previousStatus: 'active',
  sellerName: 'Ana',
  sellerEmail: 'ana@example.com',
  listingType: 'sale',
  price: 120000,
  address: 'Rruga 1',
  city: 'Durrës',
  country: 'Albania',
  propertyType: 'apartment',
  totalViews: 40,
  totalSaves: 2,
  daysOnMarket: 12,
  originalCreatedAt: '2026-10-20T00:00:00.000Z',
  ...over,
});

const page = (listings: ArchivedListing[], extra: Partial<ArchivedListingPage> = {}): ArchivedListingPage => ({
  listings, total: listings.length, page: 1, pages: 1, counts: { deleted: 5, sold: 2, rented: 1 }, ...extra,
});

const renderIt = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <ArchivedListingsManager />
    </QueryClientProvider>
  );

beforeEach(() => api.listArchivedListings.mockReset());

describe('ArchivedListingsManager', () => {
  it('shows each archived listing with who removed it and the seller', async () => {
    api.listArchivedListings.mockResolvedValue(page([listing()]));
    renderIt();

    expect(await screen.findByText('Sea view flat')).toBeInTheDocument();
    expect(screen.getByText(/Seller: Ana \(ana@example.com\)/)).toBeInTheDocument();
    expect(screen.getByText(/by admin Zana/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'All (8)' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('filters by reason and by who removed it, from the first page', async () => {
    api.listArchivedListings.mockResolvedValue(page([listing()]));
    renderIt();
    await screen.findByText('Sea view flat');

    fireEvent.click(screen.getByRole('button', { name: 'Sold (2)' }));
    await waitFor(() => expect(api.listArchivedListings).toHaveBeenLastCalledWith(expect.objectContaining({ reason: 'sold', page: 1 })));

    fireEvent.change(screen.getByRole('combobox', { name: 'Removed by' }), { target: { value: 'owner' } });
    await waitFor(() =>
      expect(api.listArchivedListings).toHaveBeenLastCalledWith(expect.objectContaining({ reason: 'sold', deletedBy: 'owner' }))
    );
  });

  it('offers a retry when the archive fails to load', async () => {
    api.listArchivedListings.mockRejectedValueOnce(new Error('down')).mockResolvedValue(page([listing()]));
    renderIt();

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load the archive.');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Sea view flat')).toBeInTheDocument();
  });

  it('says so when nothing matches', async () => {
    api.listArchivedListings.mockResolvedValue(page([], { counts: { deleted: 0, sold: 0, rented: 0 } }));
    renderIt();
    expect(await screen.findByText('No archived listings match.')).toBeInTheDocument();
  });
});
