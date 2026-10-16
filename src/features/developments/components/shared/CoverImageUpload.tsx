import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ImagePlus, Loader2 } from 'lucide-react';
import { optimizeImageUrl } from '@/config/mediaConfig';
import { cn } from '@/src/lib/utils';
import { useUploadDevelopmentCover } from '../../hooks';

interface CoverImageUploadProps {
  developmentId: string;
  coverImage?: string;
  onUploaded?: (url: string) => void;
}

const MAX_BYTES = 10 * 1024 * 1024;

/**
 * Drop-in cover-image uploader for a development. Shows the current cover (or a
 * dashed placeholder), accepts a click or drag-and-drop, validates type/size on
 * the client, and uploads through the media pipeline. The server generates the
 * responsive variants; here we just preview with `optimizeImageUrl`.
 */
export const CoverImageUpload: React.FC<CoverImageUploadProps> = ({
  developmentId,
  coverImage,
  onUploaded,
}) => {
  const { t } = useTranslation('developments');
  const { uploadCover, isUploading } = useUploadDevelopmentCover(developmentId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    if (!file.type.startsWith('image/')) {
      setError(t('cover.invalidType'));
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(t('cover.tooLarge'));
      return;
    }
    try {
      const { coverImage: url } = await uploadCover(file);
      onUploaded?.(url);
    } catch {
      setError(t('errors.generic'));
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFile(e.dataTransfer.files?.[0]);
        }}
        aria-label={t('cover.upload')}
        className={cn(
          'group relative flex h-44 w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed transition-colors sm:h-56',
          dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
          coverImage ? 'border-solid' : ''
        )}
      >
        {coverImage ? (
          <>
            <img
              src={optimizeImageUrl(coverImage, { width: 1280 })}
              alt=""
              className="h-full w-full object-cover"
            />
            <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-sm font-medium text-white opacity-0 transition group-hover:bg-black/40 group-hover:opacity-100">
              {t('cover.change')}
            </span>
          </>
        ) : (
          <span className="flex flex-col items-center gap-2 text-muted-foreground">
            <ImagePlus className="h-7 w-7" aria-hidden="true" />
            <span className="text-sm font-medium">{t('cover.upload')}</span>
            <span className="text-xs">{t('cover.hint')}</span>
          </span>
        )}

        {isUploading && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
            <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
          </span>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
};
