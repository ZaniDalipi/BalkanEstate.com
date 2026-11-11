import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ResidenceGallerySection } from './ResidenceGallerySection';

const h = vi.hoisted(() => ({ add: vi.fn(), remove: vi.fn(), reorder: vi.fn(), confirm: vi.fn() }));
vi.mock('../../../hooks/useResidenceGallery', () => ({ useResidenceGallery: () => ({ ...h, isUploading: false, isBusy: false }) }));
vi.mock('@/src/shared/hooks/useConfirmation', () => ({ useConfirmation: () => ({ confirm: h.confirm }) }));

const photos = (n: number) => Array.from({ length: n }, (_, i) => ({ url: `https://cdn.example.com/p${i}.webp` }));
const png = (name = 'a.png') => new File([new Uint8Array(10)], name, { type: 'image/png' });
const pick = (files: File[]) => fireEvent.change(screen.getByLabelText('gallery.add'), { target: { files } });

beforeEach(() => {
  Object.values(h).forEach((f) => f.mockReset().mockResolvedValue({}));
  h.confirm.mockResolvedValue(true);
});

describe('ResidenceGallerySection', () => {
  it('uploads the chosen photos, and refuses before uploading when they would pass 15', async () => {
    render(<ResidenceGallerySection developmentId="d1" photos={photos(13)} canEdit />);
    pick([png(), png('b.png'), png('c.png')]);
    expect(screen.getByRole('alert')).toHaveTextContent('developments:apiErrors.RESIDENCE_GALLERY_FULL');
    expect(h.add).not.toHaveBeenCalled();
    const two = [png(), png('b.png')];
    pick(two);
    await waitFor(() => expect(h.add).toHaveBeenCalledWith(two));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('refuses a file that is not a picture, with the reason', () => {
    render(<ResidenceGallerySection developmentId="d1" photos={[]} canEdit />);
    pick([new File(['<svg/>'], 'x.svg', { type: 'image/svg+xml' })]);
    expect(screen.getByRole('alert')).toHaveTextContent('inventory.gallery.badType');
  });

  it('moves a photo, removes one after confirming, and shows a server refusal', async () => {
    h.reorder.mockRejectedValueOnce(Object.assign(new Error('x'), { statusCode: 400, code: 'GALLERY_ORDER_INVALID', details: { code: 'GALLERY_ORDER_INVALID' } }));
    render(<ResidenceGallerySection developmentId="d1" photos={photos(3)} canEdit />);
    fireEvent.click(screen.getAllByRole('button', { name: 'gallery.moveLater' })[0]);
    expect(h.reorder).toHaveBeenCalledWith(['https://cdn.example.com/p1.webp', 'https://cdn.example.com/p0.webp', 'https://cdn.example.com/p2.webp']);
    expect(await screen.findByRole('alert')).toHaveTextContent('developments:apiErrors.GALLERY_ORDER_INVALID');
    fireEvent.click(screen.getAllByRole('button', { name: 'gallery.remove' })[2]);
    await waitFor(() => expect(h.remove).toHaveBeenCalledWith(2));
  });

  it('is read-only without the right to upload media, and has no add tile when full', () => {
    const { rerender } = render(<ResidenceGallerySection developmentId="d1" photos={photos(2)} canEdit={false} />);
    expect(screen.queryByLabelText('gallery.add')).toBeNull();
    screen.getAllByRole('button', { name: 'gallery.remove' }).forEach((b) => expect(b).toBeDisabled());
    rerender(<ResidenceGallerySection developmentId="d1" photos={photos(15)} canEdit />);
    expect(screen.queryByLabelText('gallery.add')).toBeNull();
  });
});
