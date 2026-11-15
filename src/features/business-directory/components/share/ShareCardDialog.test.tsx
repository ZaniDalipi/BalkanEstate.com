import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ShareCardDialog from './ShareCardDialog';
import type { BusinessListing } from '@/src/shared/types/businessListing.types';

vi.mock('react-i18next', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-i18next')>()),
  useTranslation: () => ({ t: (key: string, fallback?: unknown) => (typeof fallback === 'string' ? fallback : key) }),
}));

const listing = {
  id: 'p1', owner: {}, listingType: 'individual', name: 'Ana Kovač', slug: 'ana', category: 'cleaning',
  services: [], contactPhone: '1', city: 'Pula', country: 'Croatia', isVerified: false,
} as unknown as BusinessListing;

describe('ShareCardDialog', () => {
  it('is a labelled dialog that still offers the link when the card image cannot be made', async () => {
    const onCopy = vi.fn();
    render(<ShareCardDialog listing={listing} onClose={() => {}} onCopy={onCopy} />);
    expect(screen.getByRole('dialog', { name: 'Share as a card' })).toBeInTheDocument();
    // jsdom has no canvas: the card fails, and says so next to a retry.
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('couldn’t be made'));
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'WhatsApp' }).getAttribute('href')).toContain(encodeURIComponent('/business-directory/'));
    fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));
    expect(onCopy).toHaveBeenCalledWith(expect.stringContaining('/business-directory/'), expect.any(String));
  });

  it('closes from the close button and with Esc', () => {
    const onClose = vi.fn();
    render(<ShareCardDialog listing={listing} onClose={onClose} onCopy={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
