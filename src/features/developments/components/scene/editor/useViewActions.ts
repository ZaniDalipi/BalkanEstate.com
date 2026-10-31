/**
 * Reorder, replace-image and delete for the views of one target.
 *
 * Replacing an image keeps the regions unless the new image's aspect ratio
 * differs (server reports `aspectChanged`); then the owner chooses between
 * keeping them (to adjust by hand) or clearing them, which re-uploads the same
 * file with `clearHotspots`.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useConfirmation } from '@/src/shared/hooks/useConfirmation';
import { useSceneMutations } from '../../../hooks/useScenes';
import type { Scene } from '../../../types';
import { checkImageFile } from './imageFile';
import { useConfirmDiscard } from './useUnsavedGuard';
import { useApiErrorText } from '../../../hooks/useApiErrorText';

interface Options {
  developmentId: string;
  views: Scene[];
  dirty: boolean;
  /** Regions were cleared/replaced server-side: the editor must reload from scratch. */
  onRegionsReset: () => void;
}

export function useViewActions({ developmentId, views, dirty, onRegionsReset }: Options) {
  const { t } = useTranslation('developments');
  const apiText = useApiErrorText();
  const { confirm } = useConfirmation();
  const confirmDiscard = useConfirmDiscard();
  const { uploadImage, updateView, remove, isUploading, isRemoving, isUpdatingView } = useSceneMutations(developmentId);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const run = async (fn: () => Promise<void>) => {
    setError(null);
    setInfo(null);
    try {
      await fn();
    } catch (err) {
      setError(apiText.text(err));
    }
  };

  /** Move a view one step left/right, renumbering sortOrder in steps of 10. */
  const move = (sceneId: string, delta: -1 | 1) =>
    run(async () => {
      const order = [...views];
      const i = order.findIndex((v) => v.id === sceneId);
      const j = i + delta;
      if (i < 0 || j < 0 || j >= order.length) return;
      [order[i], order[j]] = [order[j], order[i]];
      const changes = order
        .map((v, idx) => ({ v, sortOrder: idx * 10 }))
        .filter(({ v, sortOrder }) => v.sortOrder !== sortOrder);
      for (const { v, sortOrder } of changes) await updateView({ sceneId: v.id, patch: { sortOrder } });
    });

  const replaceImage = (scene: Scene, file: File | undefined) =>
    run(async () => {
      if (!file) return;
      const problem = checkImageFile(file);
      if (problem) {
        setError(problem === 'type' ? t('editor.image.badType', 'Use a JPG, PNG, WebP or AVIF image.') : t('editor.image.tooLarge', 'The image is larger than 10 MB.'));
        return;
      }
      const base = { targetType: scene.targetType, targetId: scene.targetId, viewKey: scene.viewKey, file };
      const res = await uploadImage(base);
      if (!res.aspectChanged || (scene.draft?.hotspots?.length ?? 0) === 0) {
        setInfo(t('editor.views.imageReplaced', 'Image replaced.'));
        return;
      }
      const clear = await confirm({
        title: t('editor.views.aspectTitle', 'The new image has a different shape'),
        message: t(
          'editor.views.aspectMessage',
          'Its aspect ratio differs from the old image, so existing regions may no longer line up. Clear all regions of this view, or keep them and adjust by hand?'
        ),
        confirmLabel: t('editor.views.clearRegions', 'Clear regions'),
        cancelLabel: t('editor.views.keepRegions', 'Keep regions'),
        type: 'warning',
      });
      if (!clear) {
        setInfo(t('editor.views.keptRegions', 'Image replaced. Check that every region still lines up.'));
        return;
      }
      if (dirty && !(await confirmDiscard())) return;
      await uploadImage({ ...base, clearHotspots: true });
      onRegionsReset();
      setInfo(t('editor.views.regionsCleared', 'Image replaced and regions cleared.'));
    });

  const deleteView = (scene: Scene, onDeleted: () => void) =>
    run(async () => {
      const ok = await confirm({
        title: t('editor.views.deleteTitle', 'Delete this view?'),
        message: t('editor.views.deleteMessage', 'The image and all its regions are removed for good. Visitors will no longer see this view.'),
        confirmLabel: t('editor.views.delete', 'Delete view'),
        cancelLabel: t('editor.unsaved.keep', 'Keep editing'),
        type: 'danger',
      });
      if (!ok) return;
      await remove(scene.id);
      onDeleted();
    });

  return { move, replaceImage, deleteView, error, info, busy: isUploading || isRemoving || isUpdatingView };
}
