import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { ResidencePhotoStrip } from './ResidencePhotoStrip';

vi.mock('react-i18next', async () => (await import('../explorer/__tests__/i18nMock')).default);
vi.mock('@/src/features/property-details/components/ImageViewerModal', () => ({
  default: ({ images, startIndex, onClose }: { images: { url: string }[]; startIndex: number; onClose: () => void }) => (
    <div role="dialog" aria-label="viewer">
      photo {startIndex + 1} of {images.length} <button type="button" onClick={onClose}>close</button>
    </div>
  ),
}));

describe('ResidencePhotoStrip', () => {
  it('shows nothing for the cover alone', () => {
    render(<ResidencePhotoStrip photos={['https://cdn.example.com/c.jpg']} />);
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('lists every photo, and tapping one opens the viewer on that photo', async () => {
    const photos = ['c', 'a', 'b'].map((n) => `https://cdn.example.com/${n}.jpg`);
    render(<ResidencePhotoStrip photos={photos} />);
    const strip = screen.getByRole('list', { name: 'Photos' });
    expect(within(strip).getAllByRole('button')).toHaveLength(3);
    expect(strip).toHaveTextContent('Photos (3)');

    fireEvent.click(screen.getByRole('button', { name: 'Open photo 2 of 3' }));
    expect(await screen.findByRole('dialog', { name: 'viewer' })).toHaveTextContent('photo 2 of 3');
    fireEvent.click(screen.getByRole('button', { name: 'close' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
