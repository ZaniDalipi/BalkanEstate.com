import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { BusinessListing } from '@/src/shared/types/businessListing.types';
import { BusinessResidencesSection } from './BusinessResidencesSection';

const h = vi.hoisted(() => ({ navigate: vi.fn(), residences: [] as unknown[] }));
vi.mock('@/src/app/router/navigation', () => ({ navigate: h.navigate }));
vi.mock('@/src/features/developments/hooks/useBusinessResidences', () => ({ useBusinessResidences: () => ({ residences: h.residences }) }));

const listing = { id: 'b1', slug: 'aria-build-group', name: 'Aria Build Group' } as BusinessListing;

describe('BusinessResidencesSection', () => {
  it('lists the residences the company builds, each opening its page', () => {
    h.residences = [{ id: 'd1', name: 'Aria Residences', slug: 'aria-residences', city: 'Skopje', country: 'MK', category: 'apartment_building', stats: { buildings: 1, units: 20, available: 5 } }];
    render(<BusinessResidencesSection listing={listing} />);
    expect(screen.getByRole('heading', { name: /Residences/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Aria Residences/ }));
    expect(h.navigate).toHaveBeenCalledWith('/developments/aria-residences');
  });

  it('shows nothing when it builds none here', () => {
    h.residences = [];
    const { container } = render(<BusinessResidencesSection listing={listing} />);
    expect(container).toBeEmptyDOMElement();
  });
});
