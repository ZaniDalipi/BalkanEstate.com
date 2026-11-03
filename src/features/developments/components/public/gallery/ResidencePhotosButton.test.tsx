import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ResidencePhotosButton } from './ResidencePhotosButton';

vi.mock('@/src/features/property-details/components/ImageViewerModal', () => ({
  default: ({ images, onClose }: { images: { url: string }[]; onClose: () => void }) => (
    <div role="dialog" aria-label="viewer">
      {images.length} photos <button type="button" onClick={onClose}>close</button>
    </div>
  ),
}));

describe('ResidencePhotosButton', () => {
  it('shows nothing for the cover alone, and opens every photo in the viewer otherwise', async () => {
    const { rerender } = render(<ResidencePhotosButton photos={['c']} variant="outline" />);
    expect(screen.queryByRole('button')).toBeNull();
    rerender(<ResidencePhotosButton photos={['c', 'a', 'b']} variant="glass" />);
    fireEvent.click(screen.getByRole('button', { name: /gallery.showAll/ }));
    expect(await screen.findByRole('dialog', { name: 'viewer' })).toHaveTextContent('3 photos');
    fireEvent.click(screen.getByRole('button', { name: 'close' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
