import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import HomeResidencesSection from './HomeResidencesSection';
import type { Development } from '@/src/features/developments/types';

const h = vi.hoisted(() => ({ state: { developments: [] as unknown[], total: 0, isLoading: false, error: null as unknown } }));
vi.mock('@/src/features/developments/hooks/useDevelopments', () => ({ usePublicDevelopments: () => h.state }));

const dev = (over: Partial<Development>) =>
  ({ id: 'd1', slug: 'plaza', name: 'Plaza Tirana', city: 'Tirana', country: 'Albania', category: 'mixed_use', constructionStatus: 'under_construction', ...over }) as Development;

beforeEach(() => {
  h.state = { developments: [], total: 0, isLoading: false, error: null };
});

describe('HomeResidencesSection', () => {
  it('shows each residence as a link with its availability and builder, and a link to all of them', () => {
    h.state = { ...h.state, developments: [dev({ coverImage: 'https://cdn.example.com/c.webp', stats: { buildings: 2, units: 102, available: 48 }, builder: { name: 'Balkan Build' } })], total: 9 };
    render(<HomeResidencesSection />);
    const card = screen.getByRole('link', { name: /Plaza Tirana/ });
    expect(card).toHaveAttribute('href', expect.stringContaining('/developments/plaza'));
    expect(card).toHaveTextContent('residences.available');
    expect(card).toHaveTextContent('residences.builtBy');
    expect(screen.getByRole('link', { name: /residences.viewAllCount/ })).toHaveAttribute('href', expect.stringContaining('/developments'));
  });

  it('hides itself with nothing to show, and offers the residences page when loading fails', () => {
    const { container, rerender } = render(<HomeResidencesSection />);
    expect(container).toBeEmptyDOMElement();
    h.state = { ...h.state, error: new Error('down') };
    rerender(<HomeResidencesSection />);
    expect(screen.getByRole('status')).toHaveTextContent('residences.loadFailed');
    expect(screen.getByRole('link', { name: 'residences.viewAll' })).toHaveAttribute('href', expect.stringContaining('/developments'));
  });
});
