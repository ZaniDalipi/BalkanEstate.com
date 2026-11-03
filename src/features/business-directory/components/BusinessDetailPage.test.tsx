import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { BusinessListing } from '@/src/shared/types/businessListing.types';
import BusinessDetailPage from './BusinessDetailPage';

const h = vi.hoisted(() => ({
  detail: { listing: null as unknown, isLoading: false, error: null as unknown },
  list: { listings: [] as unknown[], total: 0, isLoading: false, error: null },
  user: null as null | { id: string },
}));

vi.mock('@/src/features/business-directory/hooks/useBusinessListings', () => {
  const mutation = { isLoading: false, error: null };
  return {
    useBusinessListing: () => h.detail,
    useBusinessListings: () => h.list,
    useMyBusinessListings: () => ({ listings: [], isLoading: false }),
    useCreateBusinessListing: () => ({ createListing: vi.fn(), ...mutation }),
    useUpdateBusinessListing: () => ({ updateListing: vi.fn(), ...mutation }),
    useDeleteBusinessListing: () => ({ deleteListing: vi.fn(), ...mutation }),
    useUploadBusinessLogo: () => ({ uploadLogo: vi.fn(), ...mutation }),
    useUploadBusinessBanner: () => ({ uploadBanner: vi.fn(), ...mutation }),
  };
});
vi.mock('@/context/AppContext', () => ({
  useAppContext: () => ({ state: { isAuthenticated: !!h.user, currentUser: h.user }, dispatch: vi.fn() }),
}));
vi.mock('@/src/components/seo', () => ({ SEO: () => null }));
vi.mock('@/components/shared/Footer', () => ({ default: () => null }));
vi.mock('@/shared/components/NotificationCenter', () => ({ default: () => null }));
vi.mock('./detail/BusinessLocationMap', () => ({ default: () => <div data-testid="location-map" /> }));

const listing: BusinessListing = {
  id: 'b1', slug: 'regina', owner: { id: 'owner1', name: 'sales' }, listingType: 'business',
  name: 'Regina Group Construction', category: 'construction', services: ['Real Estate'],
  description: 'A'.repeat(500), contactPhone: '+3550686060190', contactEmail: 'sales@regina.al',
  website: 'https://www.reginaconstruction.al/', whatsapp: '+355686060190',
  address: 'Rruga Pavllo Flloko, Vlorë', city: 'Vlore', country: 'Albania', latitude: 40.45, longitude: 19.48,
  languages: ['Albanian', 'English', 'Italian'], serviceAreas: ['vlore', 'palase'], paymentMethods: ['bank_transfer'],
  yearEstablished: 2022, socialMedia: { facebook: 'facebook.com/regina', instagram: 'https://instagram.com/regina' },
  isActive: true, isVerified: false, views: 7, createdAt: '2026-11-01T00:00:00Z', updatedAt: '2026-11-01T00:00:00Z',
};

beforeEach(() => {
  h.detail = { listing, isLoading: false, error: null };
  h.list = { listings: [], total: 0, isLoading: false, error: null };
  h.user = null;
});

describe('BusinessDetailPage', () => {
  it('puts the ways to reach the business at the top, with dialable links', () => {
    render(<BusinessDetailPage listingId="regina" onBack={vi.fn()} />);
    expect(screen.getByRole('heading', { level: 1, name: /Regina Group Construction/ })).toBeInTheDocument();
    const actions = within(screen.getByRole('group', { name: 'detail.actions.label' }));
    expect(actions.getByRole('link', { name: /detail.actions.call/ })).toHaveAttribute('href', 'tel:+355686060190');
    expect(actions.getByRole('link', { name: /detail.actions.whatsapp/ })).toHaveAttribute('href', 'https://wa.me/355686060190');
    expect(actions.getByRole('link', { name: /detail.actions.directions/ })).toHaveAttribute('href', expect.stringContaining('destination=40.45,19.48'));
    expect(actions.getByRole('button', { name: /detail.share/ })).toBeInTheDocument();
  });

  it('shows the phone readably, socials as brand links, and facts in one list', () => {
    render(<BusinessDetailPage listingId="regina" onBack={vi.fn()} />);
    expect(screen.getAllByText('+355 68 606 0190').length).toBeGreaterThan(0);
    const socials = screen.getAllByRole('link', { name: 'detail.openSocial' }).map((a) => a.getAttribute('href'));
    expect(socials).toEqual(['https://facebook.com/regina', 'https://instagram.com/regina']);
    const facts = within(screen.getByRole('region', { name: 'detail.atAGlance' }));
    expect(facts.getByText('Vlore')).toBeInTheDocument(); // service areas capitalised
    expect(facts.getByText('paymentMethods.bank_transfer')).toBeInTheDocument();
  });

  it('shows a view-only map — no location editor on a public profile', () => {
    render(<BusinessDetailPage listingId="regina" onBack={vi.fn()} />);
    return screen.findByTestId('location-map').then(() => {
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });
  });

  it('folds a long description behind "Read more"', () => {
    render(<BusinessDetailPage listingId="regina" onBack={vi.fn()} />);
    const more = screen.getByRole('button', { name: 'detail.readMore' });
    expect(more).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(more);
    expect(screen.getByRole('button', { name: 'detail.readLess' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('suggests other businesses in the same trade, but not this one', () => {
    h.list = { ...h.list, listings: [listing, { ...listing, id: 'b2', slug: 'other', name: 'Other Builders' }] };
    render(<BusinessDetailPage listingId="regina" onBack={vi.fn()} />);
    const similar = within(screen.getByRole('region', { name: 'detail.similar' }));
    expect(similar.getByRole('link', { name: /Other Builders/ })).toBeInTheDocument();
    expect(similar.queryByRole('link', { name: /Regina/ })).not.toBeInTheDocument();
  });

  it('gives the owner Edit and Customize; visitors get neither', () => {
    const { unmount } = render(<BusinessDetailPage listingId="regina" onBack={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'edit.button' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /banner.customize/ })).not.toBeInTheDocument();
    unmount();
    h.user = { id: 'owner1' };
    render(<BusinessDetailPage listingId="regina" onBack={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'edit.button' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /banner.customize/ })).toBeInTheDocument();
  });

  it('when the listing is gone, says so and offers the way back', () => {
    h.detail = { listing: null, isLoading: false, error: new Error('404') };
    const onBack = vi.fn();
    render(<BusinessDetailPage listingId="gone" onBack={onBack} />);
    fireEvent.click(screen.getByRole('button', { name: /detail.backToDirectory/ }));
    expect(onBack).toHaveBeenCalled();
  });
});
