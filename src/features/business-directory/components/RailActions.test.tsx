import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RailActions from './RailActions';
import type { BusinessListing } from '@/src/shared/types/businessListing.types';

vi.mock('react-i18next', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-i18next')>()),
  useTranslation: () => ({ t: (key: string, fallback?: unknown) => (typeof fallback === 'string' ? fallback : key) }),
}));

const person = { id: 'p1', name: 'Ana' } as BusinessListing;

describe('RailActions', () => {
  it('offers only listing yourself while nobody is up front', () => {
    render(<RailActions person={null} onOpen={() => {}} onShare={() => {}} onListYourself={() => {}} />);
    expect(screen.queryByRole('button', { name: 'View profile' })).toBeNull();
    expect(screen.getByRole('button', { name: /Offer your services/ })).toBeInTheDocument();
  });

  it('opens or shares the professional up front', () => {
    const onOpen = vi.fn();
    const onShare = vi.fn();
    render(<RailActions person={person} onOpen={onOpen} onShare={onShare} onListYourself={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'View profile' }));
    fireEvent.click(screen.getByRole('button', { name: /Share card/ }));
    expect(onOpen).toHaveBeenCalledWith(person);
    expect(onShare).toHaveBeenCalledWith(person);
  });
});
