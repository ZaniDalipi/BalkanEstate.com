import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CategoryFilterChips from './CategoryFilterChips';

vi.mock('react-i18next', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-i18next')>()),
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('../hooks/useBusinessCategories', () => ({
  useBusinessCategories: () => ({
    categories: [{ key: 'cleaning', count: 2 }], // no unnamed "other" listings
    custom: [{ name: '360virtualtours', count: 1 }],
  }),
}));

describe('CategoryFilterChips', () => {
  it('offers the names owners gave "Other" as their own choices, not "Other"', () => {
    const onSelect = vi.fn();
    render(<CategoryFilterChips selected="" onSelect={onSelect} />);
    expect(screen.getByRole('button', { name: 'filters.all', pressed: true })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /360virtualtours/ }));
    expect(onSelect).toHaveBeenCalledWith('custom:360virtualtours');
    // every "other" listing here has its own name: no "Other" chip
    expect(screen.queryByRole('button', { name: /categories\.other/ })).toBeNull();
  });

  it('marks the selected owner-named choice', () => {
    render(<CategoryFilterChips selected="custom:360virtualtours" onSelect={() => {}} />);
    expect(screen.getByRole('button', { name: /360virtualtours/, pressed: true })).toBeInTheDocument();
  });
});
