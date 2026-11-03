import React, { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ImagePlus } from 'lucide-react';
import { useConfirmation } from '@/src/shared/hooks/useConfirmation';
import { useApiErrorText } from '../../../hooks/useApiErrorText';
import { useResidenceGallery } from '../../../hooks/useResidenceGallery';
import type { DevelopmentPhoto } from '../../../types';
import { movePhoto } from '../../../utils/residencePhotos';
import { GALLERY_TYPES, RESIDENCE_GALLERY_MAX, checkGalleryFiles, type GalleryFileProblem } from '../inventory/galleryFiles';
import { PhotoTile } from './PhotoTile';

interface ResidenceGallerySectionProps {
  developmentId: string;
  photos: DevelopmentPhoto[];
  /** `media.upload` */
  canEdit: boolean;
}

/**
 * The residence's photos besides the cover (up to 15): add several at once,
 * move them earlier or later, remove one. Files are checked here like the
 * server checks them; every refusal is shown above the photos (role="alert").
 */
export const ResidenceGallerySection: React.FC<ResidenceGallerySectionProps> = ({ developmentId, photos, canEdit }) => {
  const { t } = useTranslation('developments');
  const apiText = useApiErrorText();
  const inputId = useId();
  const { confirm } = useConfirmation();
  const gallery = useResidenceGallery(developmentId);
  const [error, setError] = useState<string | null>(null);
  const remaining = Math.max(0, RESIDENCE_GALLERY_MAX - photos.length);
  const urls = photos.map((p) => p.url);

  const problemText = (p: GalleryFileProblem) =>
    ({
      type: t('inventory.gallery.badType', 'Use JPG, PNG, WebP or AVIF images.'),
      size: t('inventory.gallery.tooLarge', 'Each image must be 10 MB or smaller.'),
      batch: t('inventory.gallery.tooMany', 'Add at most 10 photos at a time.'),
      full: apiText.forCode('RESIDENCE_GALLERY_FULL', { max: RESIDENCE_GALLERY_MAX, remaining }),
    })[p];

  const run = async (action: () => Promise<unknown>) => {
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(apiText.text(err));
    }
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0) return;
    const problem = checkGalleryFiles(files, photos.length, RESIDENCE_GALLERY_MAX);
    if (problem) return setError(problemText(problem));
    void run(() => gallery.add(files));
  };

  const onRemove = async (index: number) => {
    const ok = await confirm({
      title: t('inventory.gallery.removeTitle', 'Remove this photo?'),
      message: t('gallery.removeMessage', 'The photo is removed from the residence page.'),
      confirmLabel: t('inventory.gallery.removeConfirm', 'Remove photo'),
      cancelLabel: t('wizard.cancel', 'Cancel'),
      type: 'danger',
    });
    if (ok) void run(() => gallery.remove(index));
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">
        {t('gallery.hint', { max: RESIDENCE_GALLERY_MAX, defaultValue: 'Shown on the residence page after the cover. Up to {{max}} photos — JPG, PNG, WebP or AVIF, 10 MB each.' })}{' '}
        <span className="font-medium text-slate-800">{t('gallery.count', { n: photos.length, max: RESIDENCE_GALLERY_MAX, defaultValue: '{{n}} of {{max}}' })}</span>
      </p>
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {photos.map((p, i) => (
          <PhotoTile
            key={p.url}
            url={p.url}
            index={i}
            count={photos.length}
            disabled={!canEdit || gallery.isBusy}
            onMove={(to) => void run(() => gallery.reorder(movePhoto(urls, i, to)))}
            onRemove={() => void onRemove(i)}
          />
        ))}
        {canEdit && remaining > 0 && (
          <li>
            <label
              htmlFor={inputId}
              className="flex aspect-[4/3] h-full min-h-[120px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-300 text-sm font-medium text-slate-600 hover:border-primary/60 hover:text-primary focus-within:ring-2 focus-within:ring-primary"
            >
              <ImagePlus className="h-6 w-6" aria-hidden="true" />
              {gallery.isUploading ? t('gallery.uploading', 'Uploading…') : t('gallery.add', 'Add photos')}
              <input id={inputId} type="file" multiple accept={GALLERY_TYPES.join(',')} className="sr-only" disabled={gallery.isBusy} onChange={onPick} />
            </label>
          </li>
        )}
      </ul>
    </div>
  );
};
