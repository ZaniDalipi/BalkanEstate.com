import React, { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ImagePlus, X } from 'lucide-react';
import { optimizeImageUrl } from '@/config/mediaConfig';
import { useConfirmation } from '@/src/shared/hooks/useConfirmation';
import { useNotification } from '@/src/shared/hooks/useNotification';
import { cn } from '@/src/lib/utils';
import { useUnitAdmin } from '../../../hooks/useUnitAdmin';
import type { DashboardUnit, UnitImage } from '../../../types';
import { GALLERY_MAX_TOTAL, GALLERY_TYPES, checkGalleryFiles, type GalleryFileProblem } from './galleryFiles';

interface UnitGallerySectionProps {
  developmentId: string;
  unitId: string;
  gallery: UnitImage[];
  /** `media.upload` */
  canUpload: boolean;
  /** `unit.manage` */
  canRemove: boolean;
  /** The unit as the server returned it after a change. */
  onUnit: (unit: DashboardUnit) => void;
}

/**
 * A unit's photo gallery: thumbnails with a remove button each, and a
 * multi-file "Add photos" picker. Both act immediately (separate from Save).
 */
export const UnitGallerySection: React.FC<UnitGallerySectionProps> = ({ developmentId, unitId, gallery, canUpload, canRemove, onUnit }) => {
  const { t } = useTranslation('developments');
  const inputId = useId();
  const { confirm } = useConfirmation();
  const notify = useNotification();
  const { addGalleryImages, isUploadingGallery, removeGalleryImage, isRemovingGalleryImage } = useUnitAdmin(developmentId);
  const [error, setError] = useState<string | null>(null);
  const remaining = Math.max(0, GALLERY_MAX_TOTAL - gallery.length);
  const busy = isUploadingGallery || isRemovingGalleryImage;

  const problemText = (p: GalleryFileProblem) =>
    ({
      type: t('inventory.gallery.badType', 'Use JPG, PNG, WebP or AVIF images.'),
      size: t('inventory.gallery.tooLarge', 'Each image must be 10 MB or smaller.'),
      batch: t('inventory.gallery.tooMany', 'Add at most 10 photos at a time.'),
      full: t('inventory.gallery.full', 'A unit can have at most {{max}} photos. {{remaining}} more can be added.', { max: GALLERY_MAX_TOTAL, remaining }),
    })[p];

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0) return;
    const problem = checkGalleryFiles(files, gallery.length);
    if (problem) return setError(problemText(problem));
    setError(null);
    try {
      const { unit } = await addGalleryImages({ unitId, files });
      onUnit(unit);
      void notify.success(t('inventory.gallery.addedTitle', 'Photos added'), t('inventory.gallery.added', 'Photos added to the gallery: {{n}}.', { n: files.length }));
    } catch (err) {
      setError((err as { message?: string })?.message || t('errors.generic', 'Something went wrong.'));
    }
  };

  const onRemove = async (index: number) => {
    const ok = await confirm({
      title: t('inventory.gallery.removeTitle', 'Remove this photo?'),
      message: t('inventory.gallery.removeMessage', 'The photo is removed from the unit gallery and the explorer.'),
      confirmLabel: t('inventory.gallery.removeConfirm', 'Remove photo'),
      cancelLabel: t('wizard.cancel', 'Cancel'),
      type: 'danger',
    });
    if (!ok) return;
    setError(null);
    try {
      const { unit } = await removeGalleryImage({ unitId, index });
      onUnit(unit);
    } catch (err) {
      setError((err as { message?: string })?.message || t('errors.generic', 'Something went wrong.'));
    }
  };

  return (
    <section aria-labelledby={`${inputId}-heading`} className="rounded-xl border border-slate-200 p-3">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h3 id={`${inputId}-heading`} className="text-sm font-semibold text-slate-900">{t('inventory.gallery.title', 'Photos')}</h3>
        <p className="text-xs text-slate-500">
          {t('inventory.gallery.remaining', '{{used}} of {{max}} · {{remaining}} remaining', { used: gallery.length, max: GALLERY_MAX_TOTAL, remaining })}
        </p>
      </div>
      {gallery.length === 0 ? (
        <p className="mb-2 text-sm text-slate-500">{t('inventory.gallery.none', 'No photos yet.')}</p>
      ) : (
        <ul className="mb-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {gallery.map((img, i) => (
            <li key={`${img.url}-${i}`} className="relative overflow-hidden rounded-lg border border-slate-100 bg-slate-50">
              <img
                src={optimizeImageUrl(img.url, { width: 240, height: 180, crop: 'fill' })}
                alt={t('inventory.gallery.alt', 'Unit photo {{n}}', { n: i + 1 })}
                loading="lazy"
                className="aspect-[4/3] w-full object-cover"
              />
              {canRemove && (
                <button
                  type="button"
                  onClick={() => onRemove(i)}
                  disabled={busy}
                  aria-label={t('inventory.gallery.remove', 'Remove photo {{n}}', { n: i + 1 })}
                  className="absolute right-1 top-1 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow hover:bg-white hover:text-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 sm:h-9 sm:w-9"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {canUpload && (
        <div className="flex flex-wrap items-center gap-2">
          <label
            htmlFor={inputId}
            className={cn(
              'inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:min-h-[40px]',
              (busy || remaining === 0) && 'pointer-events-none opacity-50'
            )}
          >
            <ImagePlus className="h-4 w-4" aria-hidden="true" />
            {isUploadingGallery ? t('inventory.gallery.uploading', 'Uploading…') : t('inventory.gallery.add', 'Add photos')}
          </label>
          <input id={inputId} type="file" multiple accept={GALLERY_TYPES.join(',')} onChange={onPick} disabled={busy || remaining === 0} className="sr-only" />
          {isUploadingGallery && <span role="status" className="text-sm text-slate-600">{t('inventory.gallery.uploadingStatus', 'Uploading photos…')}</span>}
        </div>
      )}
      {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
    </section>
  );
};
