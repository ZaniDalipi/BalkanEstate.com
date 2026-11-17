import React, { forwardRef, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { ImagePlus } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { GALLERY_TYPES } from './galleryFiles';

interface GalleryAddButtonProps {
  /** Uploading or removing: no new picks. */
  busy: boolean;
  /** The gallery is full. */
  full: boolean;
  uploading: boolean;
  onPick: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** The buyer opened the picker themselves. */
  onOpen?: () => void;
}

/** "Add photos": a multi-file picker. The ref is its file input, so another control can open it. */
export const GalleryAddButton = forwardRef<HTMLInputElement, GalleryAddButtonProps>(({ busy, full, uploading, onPick, onOpen }, ref) => {
  const { t } = useTranslation('developments');
  const inputId = useId();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label
        htmlFor={inputId}
        onClick={onOpen}
        className={cn(
          'inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:min-h-[40px]',
          (busy || full) && 'pointer-events-none opacity-50'
        )}
      >
        <ImagePlus className="h-4 w-4" aria-hidden="true" />
        {uploading ? t('inventory.gallery.uploading', 'Uploading…') : t('inventory.gallery.add', 'Add photos')}
      </label>
      <input ref={ref} id={inputId} type="file" multiple accept={GALLERY_TYPES.join(',')} onChange={onPick} disabled={busy || full} className="sr-only" />
      {uploading && <span role="status" className="text-sm text-slate-600">{t('inventory.gallery.uploadingStatus', 'Uploading photos…')}</span>}
    </div>
  );
});
GalleryAddButton.displayName = 'GalleryAddButton';
