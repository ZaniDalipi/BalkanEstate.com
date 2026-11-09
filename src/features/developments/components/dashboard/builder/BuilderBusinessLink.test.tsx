import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Development } from '../../../types';
import { BuilderBusinessLink } from './BuilderBusinessLink';

vi.mock('react-i18next', async () => (await import('../../public/explorer/__tests__/i18nMock')).default);

const h = vi.hoisted(() => ({
  navigate: vi.fn(),
  link: vi.fn(),
  mine: { listings: [] as unknown[], isLoading: false, error: null as unknown, refetch: vi.fn() },
}));
vi.mock('@/src/app/router/navigation', () => ({ navigate: h.navigate }));
vi.mock('@/src/features/business-directory/hooks/useBusinessListings', () => ({ useMyBusinessListings: () => h.mine }));
vi.mock('../../../api/developmentsApi', () => ({ linkBuilderBusiness: (...a: unknown[]) => h.link(...a) }));

const business = (id: string, name: string, extra: Record<string, unknown> = {}) => ({ id, name, slug: `${name.toLowerCase().replace(/\s/g, '-')}`, city: 'Skopje', isActive: true, ...extra });
const dev = (builder?: Development['builder']) => ({ id: 'd1', name: 'Aria', slug: 'aria', builder }) as Development;
const mount = (d: Development, canEdit = true) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <BuilderBusinessLink development={d} canEdit={canEdit} />
    </QueryClientProvider>
  );

beforeEach(() => {
  h.navigate.mockReset();
  h.link.mockReset().mockResolvedValue({ development: dev() });
  h.mine = { listings: [], isLoading: false, error: null, refetch: vi.fn() };
});

describe('BuilderBusinessLink', () => {
  it('with no company in the directory, offers to add one', () => {
    mount(dev({ name: 'Aria Build' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add your company' }));
    expect(h.navigate).toHaveBeenCalledWith('/business-directory/new');
  });

  it('links one of the user’s live companies (offline ones are not offered)', async () => {
    h.mine.listings = [business('b1', 'Aria Build Group'), business('b2', 'Old Co', { isActive: false }), business('b3', 'Second Co')];
    mount(dev({ name: 'Aria Build' }));
    const select = screen.getByLabelText('Your company');
    expect(Array.from((select as HTMLSelectElement).options).map((o) => o.text)).toEqual(['Aria Build Group · Skopje', 'Second Co · Skopje']);
    fireEvent.change(select, { target: { value: 'b3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Link company' }));
    await waitFor(() => expect(h.link).toHaveBeenCalledWith('d1', 'b3'));
  });

  it('shows the linked company, its page and Unlink', async () => {
    h.mine.listings = [business('b1', 'Aria Build Group')];
    mount(dev({ name: 'Aria Build', businessListingId: 'b1' }));
    expect(screen.getByText('Aria Build Group')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'View its page' }));
    expect(h.navigate).toHaveBeenCalledWith('/business-directory/aria-build-group');
    fireEvent.click(screen.getByRole('button', { name: 'Unlink' }));
    await waitFor(() => expect(h.link).toHaveBeenCalledWith('d1', null));
  });

  it('says why a link was refused, next to the card', async () => {
    h.mine.listings = [business('b1', 'Aria Build Group')];
    h.link.mockRejectedValue(Object.assign(new Error('nope'), { status: 404, code: 'BUSINESS_NOT_FOUND', details: { code: 'BUSINESS_NOT_FOUND' } }));
    mount(dev({ name: 'Aria Build' }));
    fireEvent.click(screen.getByRole('button', { name: 'Link company' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/not one of your Business Directory listings|Business Directory/);
  });

  it('offers to try again when the user’s companies could not load', () => {
    h.mine = { listings: [], isLoading: false, error: new Error('offline'), refetch: vi.fn() };
    mount(dev({ name: 'Aria Build' }));
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(h.mine.refetch).toHaveBeenCalled();
  });

  it('read-only for members who cannot edit', () => {
    mount(dev({ name: 'Aria Build' }), false);
    expect(screen.getByText('Not linked to a Business Directory company.')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
