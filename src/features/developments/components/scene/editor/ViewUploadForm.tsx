import React, { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ImagePlus, Upload } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { SCENE_VIEW_DIRECTIONS, type Scene, type SceneTargetType, type SceneViewDirection } from '../../../types';
import { useSceneMutations } from '../../../hooks/useScenes';
import { ACCEPTED_IMAGE_TYPES, uniqueViewKey } from './imageFile';
import { useImagePick } from './useImagePick';

interface ViewUploadFormProps {
  developmentId: string;
  targetType: SceneTargetType;
  targetId: string;
  existing: Scene[];
  onCreated: (scene: Scene) => void;
  onCancel?: () => void;
}

export const fieldCls =
  'min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:min-h-[36px]';

/** Add a camera view: image + name (→ view key) + direction + order. */
export const ViewUploadForm: React.FC<ViewUploadFormProps> = ({ developmentId, targetType, targetId, existing, onCreated, onCancel }) => {
  const { t } = useTranslation('developments');
  const ids = useId();
  const { uploadImage, isUploading } = useSceneMutations(developmentId);
  const image = useImagePick();
  const [name, setName] = useState('');
  const [direction, setDirection] = useState<SceneViewDirection>(existing.length === 0 ? 'front' : 'custom');
  const [sortOrder, setSortOrder] = useState(() => (existing.length ? Math.max(...existing.map((s) => s.sortOrder ?? 0)) + 10 : 0));
  const viewKey = uniqueViewKey(name, existing.map((s) => s.viewKey));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!image.picked) {
      image.setError(t('editor.image.required', 'Choose an image first.'));
      return;
    }
    try {
      const res = await uploadImage({
        targetType,
        targetId,
        file: image.picked.file,
        viewKey,
        viewName: name.trim() || undefined,
        viewDirection: direction,
        sortOrder,
      });
      onCreated(res.scene);
    } catch (err) {
      image.setError((err as Error).message || t('editor.image.uploadFailed', 'Upload failed.'));
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
      <label className="flex min-h-[96px] cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white p-3 text-center text-sm text-slate-600 focus-within:ring-2 focus-within:ring-primary hover:border-primary/50">
        <ImagePlus className="h-6 w-6 text-slate-400" aria-hidden="true" />
        <span className="font-medium text-slate-800">
          {image.picked ? image.picked.file.name : t('scene.uploadImage', 'Upload a map image')}
        </span>
        <span className="text-xs">{image.describe(image.picked) ?? t('editor.image.hint', 'JPG, PNG, WebP or AVIF · up to 10 MB')}</span>
        <input
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(',')}
          className="sr-only"
          onChange={(e) => image.pick(e.target.files?.[0])}
        />
      </label>
      {image.error && <p role="alert" className="text-sm text-red-600">{image.error}</p>}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-1">
          <label htmlFor={`${ids}-name`} className="mb-1 block text-xs font-medium text-slate-600">{t('editor.views.name', 'View name')}</label>
          <input id={`${ids}-name`} value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder={t('editor.views.namePlaceholder', 'e.g. Street side')} className={fieldCls} />
          <p className="mt-1 truncate text-[11px] text-slate-500">{t('editor.views.key', 'Key: {{key}}', { key: viewKey })}</p>
        </div>
        <div>
          <label htmlFor={`${ids}-dir`} className="mb-1 block text-xs font-medium text-slate-600">{t('editor.views.direction', 'Direction')}</label>
          <select id={`${ids}-dir`} value={direction} onChange={(e) => setDirection(e.target.value as SceneViewDirection)} className={fieldCls}>
            {SCENE_VIEW_DIRECTIONS.map((d) => (
              <option key={d} value={d}>{t(`editor.directions.${d}`, d)}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${ids}-order`} className="mb-1 block text-xs font-medium text-slate-600">{t('editor.views.order', 'Order')}</label>
          <input id={`${ids}-order`} type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value) || 0)} className={fieldCls} />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="ghost" size="sm" className="min-h-[44px] sm:min-h-0" onClick={onCancel}>
            {t('editor.toolbar.cancel', 'Cancel')}
          </Button>
        )}
        <Button type="submit" size="sm" className="min-h-[44px] sm:min-h-0" disabled={isUploading || !image.picked}>
          <Upload className="mr-1 h-4 w-4" aria-hidden="true" />
          {isUploading ? t('editor.views.uploading', 'Uploading…') : t('editor.views.add', 'Add view')}
        </Button>
      </div>
    </form>
  );
};
