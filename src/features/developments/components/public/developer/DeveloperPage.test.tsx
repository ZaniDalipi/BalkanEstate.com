import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { Development, PublicDeveloper } from '../../../types';
import DeveloperPage from './DeveloperPage';

vi.mock('react-i18next', async () => (await import('../explorer/__tests__/i18nMock')).default);

const h = vi.hoisted(() => ({
  navigate: vi.fn(),
  goBack: vi.fn(),
  development: null as null | Development,
  developer: vi.fn(),
}));

vi.mock('@/src/app/router/navigation', () => ({ navigate: h.navigate, goBack: h.goBack }));
vi.mock('../../../api/developmentsApi', () => ({
  getPublicDevelopment: () => Promise.resolve({ development: h.development, buildings: [], floors: [], entrances: [] }),
  getPublicDeveloper: () => h.developer(),
}));

const residence = (over: Partial<Development> = {}): Development =>
  ({ id: 'd1', name: 'East Gate', slug: 'east-gate', city: 'Skopje', country: 'North Macedonia', category: 'apartment_building', status: 'published', stats: { buildings: 1, units: 20, available: 8 }, amenities: [], ...over }) as Development;
const builder = {
  name: 'Balkan Build',
  tagline: 'Homes in Skopje since 2004',
  about: 'A family company.',
  foundedYear: 2004,
  completedProjects: 18,
  licenseNumber: 'MK-1182',
  address: 'Bul. Partizanski 12, Skopje',
  phone: '+389 2 123 4567',
};
const sister = residence({ id: 'd2', name: 'Sea Gate', slug: 'sea-gate' });

const mount = () => {
  const router = createMemoryRouter([{ path: '/en/developments/:slug/developer', element: <DeveloperPage /> }], { initialEntries: ['/en/developments/east-gate/developer'] });
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
};

const matchMedia = window.matchMedia;
const asDesktop = () => {
  window.matchMedia = ((query: string) => ({ matches: query === '(min-width: 768px)', media: query, addEventListener: () => undefined, removeEventListener: () => undefined })) as never;
};

beforeEach(() => {
  h.navigate.mockReset();
  h.goBack.mockReset();
  h.development = residence({ builder });
  h.developer.mockReset().mockResolvedValue({ builder, residences: [residence({ builder, previewImage: 'https://media.test/east.webp' }), sister] } satisfies PublicDeveloper);
});
afterEach(() => {
  window.matchMedia = matchMedia;
});

describe('the company page', () => {
  it('introduces the company: who, track record, about, office with a map search, contacts', async () => {
    mount();
    expect(await screen.findByRole('heading', { level: 1, name: 'Balkan Build' })).toBeInTheDocument();
    expect(screen.getByText('Developer of East Gate')).toBeInTheDocument();
    expect(screen.getByText('Homes in Skopje since 2004')).toBeInTheDocument();
    expect(screen.getByText('18')).toBeInTheDocument();
    expect(screen.getByText('MK-1182')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'About Balkan Build' })).toBeInTheDocument();
    const office = screen.getByRole('region', { name: 'Office and contact' });
    expect(office).toHaveTextContent('Bul. Partizanski 12, Skopje');
    const map = within(office).getByRole('link', { name: /Open in Maps/ });
    expect(map).toHaveAttribute('href', 'https://www.google.com/maps/search/?api=1&query=Bul.%20Partizanski%2012%2C%20Skopje');
    expect(map).toHaveAttribute('rel', 'noopener noreferrer');
    expect(within(office).getByRole('link', { name: /\+389 2 123 4567/ })).toHaveAttribute('href', 'tel:+38921234567');
  });

  it('lists this residence first, then the others it builds, each opening its page', async () => {
    mount();
    const list = await screen.findByRole('region', { name: 'Residences by Balkan Build' });
    await within(list).findByText('Sea Gate');
    const items = within(list).getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('This residence');
    expect(items[0]).toHaveTextContent('East Gate');
    // Its card uses the picture the server picked for it.
    expect(items[0].querySelector('img')?.getAttribute('src')).toContain('east');
    expect(items).toHaveLength(2);
    fireEvent.click(within(items[1]).getByRole('button'));
    expect(h.navigate).toHaveBeenCalledWith('/developments/sea-gate');
  });

  it('says when the other residences could not load, and tries again on request', async () => {
    h.developer.mockRejectedValueOnce(new Error('offline'));
    mount();
    expect(await screen.findByRole('alert')).toHaveTextContent('Their other residences could not be loaded.');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Sea Gate')).toBeInTheDocument();
  });

  it('“See the homes” opens the residence at its homes', async () => {
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'See the homes in East Gate' }));
    expect(h.navigate).toHaveBeenCalledWith('/developments/east-gate', { state: { section: 'units' } });
  });

  it('a residence without a builder says so, leads back, and never asks for a company', async () => {
    h.development = residence();
    mount();
    const note = await screen.findByRole('status');
    expect(note).toHaveTextContent('This residence has not introduced its builder yet.');
    fireEvent.click(within(note).getByRole('button', { name: 'Back to East Gate' }));
    expect(h.navigate).toHaveBeenCalledWith('/developments/east-gate');
    expect(h.developer).not.toHaveBeenCalled();
  });

  it('on tablet and up, the residence bar marks the company page and its sections open on the residence page', async () => {
    asDesktop();
    mount();
    const bar = await screen.findByRole('navigation', { name: 'Residence' });
    expect(within(bar).getByRole('button', { name: 'The builder' })).toHaveAttribute('aria-current', 'page');
    fireEvent.click(within(bar).getByRole('button', { name: 'Location' }));
    expect(h.navigate).toHaveBeenCalledWith('/developments/east-gate', { state: { section: 'location' } });
    fireEvent.click(within(bar).getByRole('button', { name: 'Back to East Gate' }));
    expect(h.goBack).toHaveBeenCalledWith('/developments/east-gate');
  });

  it('when the agency that published the residence stands in, calls it the company and links its agency page', async () => {
    const agency = { name: 'Vardar Homes', source: 'agency' as const, agencySlug: 'north-macedonia/vardar-homes', about: 'We sell and build.' };
    h.development = residence({ builder: agency });
    h.developer.mockResolvedValue({ builder: agency, residences: [residence({ builder: agency })] });
    asDesktop();
    mount();
    expect(await screen.findByText('The company behind East Gate')).toBeInTheDocument();
    expect(screen.queryByText('Developer of East Gate')).not.toBeInTheDocument();
    const bar = screen.getByRole('navigation', { name: 'Residence' });
    expect(within(bar).getByRole('button', { name: 'The company' })).toHaveAttribute('aria-current', 'page');
    fireEvent.click(screen.getByRole('button', { name: 'Agency profile' }));
    expect(h.navigate).toHaveBeenCalledWith('/agencies/north-macedonia/vardar-homes');
  });
});
