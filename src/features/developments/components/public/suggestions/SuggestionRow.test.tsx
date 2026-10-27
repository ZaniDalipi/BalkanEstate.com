import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, userEvent, waitFor } from '@/src/tests/test-utils';
import type { Development, NearbySuggestion } from '../../../types';

vi.mock('../../../api/developmentsApi', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, attachListing: vi.fn(), attachListingToDevelopment: vi.fn(), listUnits: vi.fn(), getListingResidence: vi.fn() };
});
vi.mock('../../dashboard/listings/UnitPickerDialog', () => ({
  UnitPickerDialog: ({ onPick }: { onPick: (u: { id: string; unitNumber: string }) => void }) => (
    <button type="button" onClick={() => onPick({ id: 'u7', unitNumber: 'T1203' })}>
      pick T1203
    </button>
  ),
}));

import * as api from '../../../api/developmentsApi';
import { SuggestionRow } from './SuggestionRow';
import { ListingResidenceBadge } from '../listing/ListingResidenceBadge';

const suggestion = (over: Partial<NearbySuggestion> = {}): NearbySuggestion => ({
  development: { id: 'd1', slug: 'plaza', name: 'Plaza', city: 'Tirana' } as Development,
  distanceM: 200,
  matchScore: 98,
  canAttach: true,
  attachment: null,
  ...over,
});

describe('SuggestionRow', () => {
  beforeEach(() => vi.clearAllMocks());

  it('puts the listing on the chosen apartment', async () => {
    vi.mocked(api.attachListing).mockResolvedValue({} as never);
    const user = userEvent.setup();
    render(<SuggestionRow suggestion={suggestion()} listingId="l1" />);
    await user.click(screen.getByRole('button', { name: 'suggest.chooseApartment' }));
    await user.click(screen.getByRole('button', { name: 'pick T1203' }));
    await waitFor(() => expect(api.attachListing).toHaveBeenCalledWith('d1', 'u7', 'l1', false));
  });

  it('offers "Attach anyway" for a non-blocking conflict and retries with force', async () => {
    vi.mocked(api.attachListing)
      .mockRejectedValueOnce({
        message: 'conflict',
        statusCode: 409,
        details: { conflicts: [{ code: 'listing_already_attached_elsewhere', message: 'This listing is already attached to another unit.', blocking: false }] },
      })
      .mockResolvedValueOnce({} as never);
    const user = userEvent.setup();
    render(<SuggestionRow suggestion={suggestion()} listingId="l1" />);
    await user.click(screen.getByRole('button', { name: 'suggest.chooseApartment' }));
    await user.click(screen.getByRole('button', { name: 'pick T1203' }));
    expect(await screen.findByText('developments:apiErrors.conflict.listing_already_attached_elsewhere')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'suggest.attachAnyway' }));
    await waitFor(() => expect(api.attachListing).toHaveBeenLastCalledWith('d1', 'u7', 'l1', true));
  });

  it('shows where the listing already is', () => {
    render(<SuggestionRow suggestion={suggestion({ attachment: { unitId: 'u7', unitNumber: 'T1203', buildingName: 'Plaza Tower' } })} listingId="l1" />);
    expect(screen.getByText('suggest.onApartment')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'suggest.changeApartment' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'suggest.linkResidenceOnly' })).not.toBeInTheDocument();
  });
});

describe('ListingResidenceBadge', () => {
  it('links to the apartment in the residence', async () => {
    vi.mocked(api.getListingResidence).mockResolvedValue({
      residence: { name: 'Plaza', slug: 'plaza', city: 'Tirana', unit: { id: 'u7', unitNumber: 'T1203', buildingName: 'Plaza Tower' } },
    });
    render(<ListingResidenceBadge listingId="l1" />);
    const link = await screen.findByRole('link', { name: /listingResidence.partOf/ });
    expect(link.getAttribute('href')).toMatch(/\/developments\/plaza\/units\/u7$/);
  });

  it('renders nothing for a listing outside a residence', async () => {
    vi.mocked(api.getListingResidence).mockResolvedValue({ residence: null });
    const { container } = render(<ListingResidenceBadge listingId="l2" />);
    await waitFor(() => expect(api.getListingResidence).toHaveBeenCalled());
    expect(container.querySelector('a')).toBeNull();
  });
});
