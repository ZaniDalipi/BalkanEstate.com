import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

/**
 * The "Reimagine this room" button in the photo viewer shows for our own
 * listing photos — on the media CDN (R2) or still on Cloudinary — and for
 * nothing else (the AI styler only accepts our photos).
 */
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_key: string, fallback?: string) => fallback ?? _key }),
}));
vi.mock('@/context/AppContext', () => ({
  useAppContext: () => ({ state: { isAuthenticated: true, currentUser: { id: 'u1' } }, dispatch: vi.fn() }),
}));
vi.mock('../../services/apiService', () => ({
  createConversation: vi.fn(),
  sendMessage: vi.fn(),
  uploadMessageImage: vi.fn(),
}));
vi.mock('@/src/app/router/navigation', () => ({ navigate: vi.fn() }));

import ImageViewerModal from '../features/property-details/components/ImageViewerModal';

const show = (url: string) =>
  render(<ImageViewerModal images={[{ url, tag: 'living_room' }]} startIndex={0} onClose={() => undefined} />);

describe('Reimagine button', () => {
  it('shows for a photo on our media CDN (R2)', () => {
    show('https://media.test/users/zani_1/listings/flat_2/photos/0mv42zfqkbe42b477/original.jpg');
    expect(screen.getByRole('button', { name: 'Reimagine this room' })).toBeTruthy();
  });

  it('shows for a photo still on Cloudinary', () => {
    show('https://res.cloudinary.com/dh8tbq8wy/image/upload/v1/balkan-estate/listings/p1.jpg');
    expect(screen.getByRole('button', { name: 'Reimagine this room' })).toBeTruthy();
  });

  it('does not show for an external feed photo', () => {
    show('https://feeds.example.com/listing/1.jpg');
    expect(screen.queryByRole('button', { name: 'Reimagine this room' })).toBeNull();
  });
});
