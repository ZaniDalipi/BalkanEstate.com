import React, { Suspense, lazy, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Building2, LayoutGrid, Images } from 'lucide-react';
import { optimizeImageUrl, imageSrcSet } from '@/config/mediaConfig';
import type { LinkedListing, PublicUnit } from '../../../../types';
import { unitGallery } from './unitGallery';

const ImageViewerModal = lazy(() => import('@/src/features/property-details/components/ImageViewerModal'));
const FloorPlanViewerModal = lazy(() => import('@/src/features/property-details/components/FloorPlanViewerModal'));

interface UnitMediaProps {
  unit: PublicUnit;
  primaryListing?: LinkedListing;
  onModalChange: (open: boolean) => void;
}

/**
 * Hero photo + thumbnails and a floor-plan button, opening the platform's own
 * ImageViewerModal / FloorPlanViewerModal (portalled so the drawer's transform
 * can't trap their fixed positioning).
 */
export const UnitMedia: React.FC<UnitMediaProps> = ({ unit, primaryListing, onModalChange }) => {
  const { t } = useTranslation('developments');
  const photos = unitGallery(unit, primaryListing);
  const [viewer, setViewer] = useState<{ kind: 'photos'; index: number } | { kind: 'plan' } | null>(null);
  const open = (v: NonNullable<typeof viewer>) => {
    setViewer(v);
    onModalChange(true);
  };
  const close = () => {
    setViewer(null);
    onModalChange(false);
  };
  const hero = photos[0] ?? unit.floorplan?.url;

  return (
    <div>
      {hero ? (
        <button type="button" onClick={() => (photos.length ? open({ kind: 'photos', index: 0 }) : open({ kind: 'plan' }))} className="block w-full" aria-label={t('explorer.drawer.openGallery', 'Open photos')}>
          <img src={optimizeImageUrl(hero, { width: 960 })} srcSet={imageSrcSet(hero, [480, 960, 1280]) || undefined} sizes="(min-width: 768px) 460px, 100vw" alt="" className="aspect-[4/3] w-full bg-slate-100 object-cover" />
        </button>
      ) : (
        <div className="flex aspect-[16/9] w-full items-center justify-center bg-slate-100 text-slate-400">
          <Building2 className="h-12 w-12" aria-hidden="true" />
        </div>
      )}
      {(photos.length > 1 || unit.floorplan?.url) && (
        <div className="flex gap-2 overflow-x-auto px-5 pt-3">
          {photos.slice(1, 6).map((url, i) => (
            <button key={url} type="button" onClick={() => open({ kind: 'photos', index: i + 1 })} className="shrink-0 overflow-hidden rounded-lg" aria-label={`${t('explorer.drawer.photo', 'Photo')} ${i + 2}`}>
              <img src={optimizeImageUrl(url, { width: 160 })} alt="" className="h-14 w-20 object-cover" loading="lazy" />
            </button>
          ))}
          {photos.length > 6 && (
            <button type="button" onClick={() => open({ kind: 'photos', index: 0 })} className="inline-flex min-h-[44px] shrink-0 items-center gap-1 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700">
              <Images className="h-4 w-4" aria-hidden="true" />+{photos.length - 6}
            </button>
          )}
          {unit.floorplan?.url && (
            <button type="button" onClick={() => open({ kind: 'plan' })} className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 hover:border-primary/50">
              <LayoutGrid className="h-4 w-4 text-primary" aria-hidden="true" />
              {t('explorer.drawer.floorplan', 'Floor plan')}
            </button>
          )}
        </div>
      )}
      {viewer &&
        createPortal(
          <Suspense fallback={null}>
            {viewer.kind === 'photos' ? (
              <ImageViewerModal images={photos.map((url) => ({ url, tag: 'other' }))} startIndex={viewer.index} onClose={close} propertyId={unit.primaryListingId} />
            ) : (
              <FloorPlanViewerModal floors={[{ url: unit.floorplan!.url, label: t('explorer.drawer.floorplan', 'Floor plan') }]} onClose={close} title={`${t('explorer.apt', 'Apt')} ${unit.unitNumber}`} />
            )}
          </Suspense>,
          document.body
        )}
    </div>
  );
};
