/**
 * "Your Ad Here" placeholder: shown in one slot per page so advertisers can
 * get in touch, never in the secondary slots.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_k: string, fallback?: string) => fallback ?? _k }),
}));
vi.mock('@/src/features/promo/hooks/useBanners', () => ({
  useAdBanners: () => ({ data: [] }),
  selectByPlacement: () => [],
}));
vi.mock('@/src/features/promo/hooks/usePreview', () => ({
  useAdPreview: () => ({ active: false }),
}));
vi.mock('@/src/features/promo/components/NetworkFill', () => ({
  default: () => null,
  useNetworkAdFill: () => false,
}));
vi.mock('@/src/app/router/navigation', () => ({
  navigate: vi.fn(),
  localizePath: (p: string) => `/en${p}`,
}));

import AdSlot from '@/src/features/promo/components/Slot';

describe('AdSlot placeholder', () => {
  it('shows "Your Ad Here", linking to the advertising contact form, on the page\'s main slot', () => {
    render(<AdSlot page="home" showPlaceholder />);
    const link = screen.getByText('Your Ad Here').closest('a');
    expect(link?.getAttribute('href')).toBe('/en/contact?topic=advertise');
  });

  it('renders nothing in a secondary slot with nothing booked', () => {
    const { container } = render(<AdSlot page="home" index={1} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('hidePlaceholder wins over showPlaceholder', () => {
    const { container } = render(<AdSlot page="home" showPlaceholder hidePlaceholder />);
    expect(container).toBeEmptyDOMElement();
  });
});
