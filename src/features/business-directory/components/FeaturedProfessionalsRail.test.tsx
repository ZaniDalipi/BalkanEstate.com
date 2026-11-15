import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FeaturedProfessionalsRail from './FeaturedProfessionalsRail';
import type { BusinessListing } from '@/src/shared/types/businessListing.types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, fallback?: string) => (typeof fallback === 'string' ? fallback : key) }),
}));
const navigateMock = vi.fn();
vi.mock('@/src/app/router/navigation', () => ({
  navigate: (...args: unknown[]) => navigateMock(...args),
  localizePath: (p: string) => `/en${p}`,
}));

beforeAll(() => {
  if (!('ResizeObserver' in window)) {
    (window as unknown as { ResizeObserver: unknown }).ResizeObserver = class { observe() {} disconnect() {} unobserve() {} };
  }
});

const person = (over: Partial<BusinessListing> = {}): BusinessListing => ({
  id: 'p1', owner: {}, listingType: 'individual', name: 'Ana Kovač', slug: 'ana', category: 'cleaning',
  services: [], contactPhone: '+385 91', city: 'Pula', country: 'Croatia', isVerified: false, ...over,
} as BusinessListing);

describe('FeaturedProfessionalsRail', () => {
  it('renders nothing without individuals', () => {
    const { container } = render(<FeaturedProfessionalsRail listings={[person({ listingType: 'business' })]} onListYourself={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it('hangs a badge per professional and offers to list yourself', () => {
    const onList = vi.fn();
    render(<FeaturedProfessionalsRail listings={[person()]} onListYourself={onList} />);
    expect(screen.getByRole('heading', { name: 'Featured Professionals' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Ana Kovač/ })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Offer your services/ }));
    expect(onList).toHaveBeenCalledTimes(1);
  });

  it('opens a profile link inside the app instead of reloading', () => {
    const { container } = render(<FeaturedProfessionalsRail listings={[person()]} onListYourself={() => {}} />);
    const link = document.createElement('a');
    link.setAttribute('href', `/en/business-directory/${'ana-kova-cleaning-in-pula-croatia_p1'}`);
    container.querySelector('section')?.appendChild(link);
    const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    link.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(navigateMock).toHaveBeenCalledWith('/business-directory/ana-kova-cleaning-in-pula-croatia_p1');
  });
});
