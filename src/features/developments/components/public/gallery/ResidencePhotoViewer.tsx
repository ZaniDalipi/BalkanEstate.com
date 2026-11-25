import React, { Suspense, lazy } from 'react';

const ImageViewerModal = lazy(() => import('@/src/features/property-details/components/ImageViewerModal'));

interface ResidencePhotoViewerProps {
  photos: string[];
  /** The photo to open on. */
  start: number;
  onClose: () => void;
}

/** Every residence photo in the full-screen viewer (swipe, arrows, pinch to zoom, Esc or swipe down to close). */
export const ResidencePhotoViewer: React.FC<ResidencePhotoViewerProps> = ({ photos, start, onClose }) => (
  <Suspense fallback={null}>
    <ImageViewerModal images={photos.map((url) => ({ url, tag: 'other' }))} startIndex={start} onClose={onClose} />
  </Suspense>
);
