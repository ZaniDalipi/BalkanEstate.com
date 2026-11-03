import React, { Suspense, lazy, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Images } from 'lucide-react';
import { optimizeImageUrl } from '@/config/mediaConfig';
import { cn } from '@/src/lib/utils';

const ImageViewerModal = lazy(() => import('@/src/features/property-details/components/ImageViewerModal'));

interface ResidencePhotosButtonProps {
  /** Cover first, then the gallery (see residencePhotos). */
  photos: string[];
  /** `glass` over the cover photo (with small previews on wider screens), `outline` on a white page. */
  variant: 'glass' | 'outline';
  className?: string;
}

/**
 * "Photos (N)" — opens every photo of the residence in the full-screen viewer
 * (swipe, arrows, zoom, Esc to close). Shown only when there is more than the
 * cover to see.
 */
export const ResidencePhotosButton: React.FC<ResidencePhotosButtonProps> = ({ photos, variant, className }) => {
  const { t } = useTranslation('developments');
  const [open, setOpen] = useState(false);
  if (photos.length < 2) return null;
  const label = t('gallery.showAll', { n: photos.length, defaultValue: 'Photos ({{n}})' });

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'inline-flex min-h-[44px] items-center gap-2 rounded-2xl px-3 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2',
          variant === 'glass'
            ? 'border border-white/30 bg-black/35 text-white backdrop-blur-md hover:bg-black/50 focus-visible:ring-white'
            : 'border border-slate-300 bg-white text-slate-800 hover:border-primary/50 hover:text-primary focus-visible:ring-primary',
          className
        )}
      >
        {variant === 'glass' && (
          <span className="hidden -space-x-2 sm:flex" aria-hidden="true">
            {photos.slice(1, 4).map((url) => (
              <img key={url} src={optimizeImageUrl(url, { width: 80, height: 80 })} alt="" className="h-8 w-8 rounded-lg object-cover ring-2 ring-white/80" />
            ))}
          </span>
        )}
        <Images className="h-4 w-4" aria-hidden="true" />
        {label}
      </button>
      {open && (
        <Suspense fallback={null}>
          <ImageViewerModal images={photos.map((url) => ({ url, tag: 'other' }))} startIndex={0} onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </>
  );
};
