import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Images } from 'lucide-react';
import { optimizeImageUrl } from '@/config/mediaConfig';
import { cn } from '@/src/lib/utils';
import { ResidencePhotoViewer } from './ResidencePhotoViewer';

interface ResidencePhotoStripProps {
  /** Cover first, then the gallery (see residencePhotos). */
  photos: string[];
  className?: string;
}

/**
 * The residence photos as a row to swipe through with a thumb; tapping one opens
 * the full-screen viewer on that photo. Phones get this instead of a "Photos (N)"
 * button, so the photos are visible without hunting for them.
 */
export const ResidencePhotoStrip: React.FC<ResidencePhotoStripProps> = ({ photos, className }) => {
  const { t } = useTranslation('developments');
  const [openAt, setOpenAt] = useState<number | null>(null);
  if (photos.length < 2) return null;
  const total = photos.length;

  return (
    <>
      <ul
        aria-label={t('gallery.heading', 'Photos')}
        className={cn('-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto scroll-px-4 px-4 pb-1 [scrollbar-width:none]', className)}
      >
        {photos.map((url, i) => (
          <li key={url} className="shrink-0 snap-start">
            <button
              type="button"
              onClick={() => setOpenAt(i)}
              aria-label={t('gallery.open', { n: i + 1, total, defaultValue: 'Open photo {{n}} of {{total}}' })}
              className="relative block h-24 w-36 overflow-hidden rounded-xl bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <img
                src={optimizeImageUrl(url, { width: 288, height: 192 })}
                alt=""
                loading={i < 3 ? 'eager' : 'lazy'}
                className="h-full w-full object-cover"
              />
              {i === 0 && (
                <span className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-semibold text-white" aria-hidden="true">
                  <Images className="h-3 w-3" />
                  {t('gallery.showAll', { n: total, defaultValue: 'Photos ({{n}})' })}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
      {openAt !== null && <ResidencePhotoViewer photos={photos} start={openAt} onClose={() => setOpenAt(null)} />}
    </>
  );
};
