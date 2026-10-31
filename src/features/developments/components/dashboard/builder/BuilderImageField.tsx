import React, { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { optimizeImageUrl } from '@/config/mediaConfig';
import { cn } from '@/src/lib/utils';
import { useApiErrorText } from '../../../hooks/useApiErrorText';
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_BYTES, checkImageFile } from '../../scene/editor/imageFile';
import type { BuilderImageKind } from '../../../hooks/useBuilderImages';

interface BuilderImageFieldProps {
  kind: BuilderImageKind;
  url?: string;
  disabled: boolean;
  onUpload: (file: File) => Promise<unknown>;
  onRemove: () => Promise<unknown>;
}

/**
 * The builder's logo (square) or banner (wide): preview, choose / replace, and
 * remove. The file is checked here (type, size) and again on the server; a
 * refusal shows under the picture.
 */
export const BuilderImageField: React.FC<BuilderImageFieldProps> = ({ kind, url, disabled, onUpload, onRemove }) => {
  const { t } = useTranslation('developments');
  const apiText = useApiErrorText();
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const label = kind === 'logo' ? t('builder.logo', 'Logo') : t('builder.banner', 'Banner');
  const hint = kind === 'logo' ? t('builder.logoHint', 'Square, at least 400 × 400 px.') : t('builder.bannerHint', 'Wide, at least 1600 × 600 px.');

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(apiText.text(err));
    } finally {
      setBusy(false);
    }
  };
  const pick = (file: File | undefined) => {
    if (!file) return;
    const problem = checkImageFile(file);
    if (problem) return setError(apiText.forCode(problem === 'type' ? 'IMAGE_TYPE' : 'LIMIT_FILE_SIZE', { maxMb: MAX_IMAGE_BYTES / 1024 / 1024 }));
    void run(() => onUpload(file));
  };

  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium text-gray-700">{label}</span>
      <div className={cn('relative flex items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50', kind === 'logo' ? 'h-28 w-28' : 'aspect-[16/6] w-full')}>
        {url ? (
          <img src={optimizeImageUrl(url, kind === 'logo' ? { width: 240, height: 240 } : { width: 960 })} alt="" className={cn('h-full w-full', kind === 'logo' ? 'object-contain p-2' : 'object-cover')} />
        ) : (
          <ImagePlus className="h-7 w-7 text-slate-400" aria-hidden="true" />
        )}
        {busy && (
          <span className="absolute inset-0 flex items-center justify-center bg-white/70" role="status" aria-label={t('builder.uploading', 'Uploading…')}>
            <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
      {!disabled && (
        <div className="mt-2 flex flex-wrap gap-2">
          <label htmlFor={id} className="inline-flex min-h-[44px] cursor-pointer items-center rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-within:ring-2 focus-within:ring-primary">
            {url ? t('builder.replace', 'Replace') : t('builder.choose', 'Choose picture')}
            <input id={id} type="file" accept={ACCEPTED_IMAGE_TYPES.join(',')} className="sr-only" disabled={busy} aria-describedby={error ? `${id}-err` : undefined} onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} />
          </label>
          {url && (
            <button type="button" disabled={busy} onClick={() => void run(onRemove)} className="inline-flex min-h-[44px] items-center gap-1 rounded-lg px-3 text-sm font-medium text-red-600 hover:bg-red-50">
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              {t('builder.remove', 'Remove')}
              <span className="sr-only">{label}</span>
            </button>
          )}
        </div>
      )}
      {error && <p id={`${id}-err`} role="alert" className="mt-1.5 text-sm text-red-600">{error}</p>}
    </div>
  );
};
