import React, { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/src/components/ui/button';
import { SCENE_VIEW_DIRECTIONS, type Scene, type SceneViewDirection } from '../../../types';
import { useSceneMutations } from '../../../hooks/useScenes';
import { fieldCls } from './ViewUploadForm';
import { useApiErrorText } from '../../../hooks/useApiErrorText';

interface ViewSettingsFormProps {
  developmentId: string;
  scene: Scene;
  onDone: () => void;
}

/** Rename a view, change its direction or its position (sortOrder). */
export const ViewSettingsForm: React.FC<ViewSettingsFormProps> = ({ developmentId, scene, onDone }) => {
  const { t } = useTranslation('developments');
  const apiText = useApiErrorText();
  const ids = useId();
  const { updateView, isUpdatingView } = useSceneMutations(developmentId);
  const [name, setName] = useState(scene.viewName ?? '');
  const [direction, setDirection] = useState<SceneViewDirection>(scene.viewDirection ?? 'custom');
  const [sortOrder, setSortOrder] = useState(scene.sortOrder ?? 0);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await updateView({ sceneId: scene.id, patch: { viewName: name.trim(), viewDirection: direction, sortOrder } });
      onDone();
    } catch (err) {
      setError(apiText.text(err));
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
      <div>
        <label htmlFor={`${ids}-n`} className="mb-1 block text-xs font-medium text-slate-600">{t('editor.views.name', 'View name')}</label>
        <input id={`${ids}-n`} value={name} maxLength={80} onChange={(e) => setName(e.target.value)} className={fieldCls} />
      </div>
      <div>
        <label htmlFor={`${ids}-d`} className="mb-1 block text-xs font-medium text-slate-600">{t('editor.views.direction', 'Direction')}</label>
        <select id={`${ids}-d`} value={direction} onChange={(e) => setDirection(e.target.value as SceneViewDirection)} className={fieldCls}>
          {SCENE_VIEW_DIRECTIONS.map((d) => (
            <option key={d} value={d}>{t(`editor.directions.${d}`, d)}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor={`${ids}-o`} className="mb-1 block text-xs font-medium text-slate-600">{t('editor.views.order', 'Order')}</label>
        <input id={`${ids}-o`} type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value) || 0)} className={`${fieldCls} sm:w-24`} />
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="ghost" size="sm" className="min-h-[44px] sm:min-h-0" onClick={onDone}>
          {t('editor.toolbar.cancel', 'Cancel')}
        </Button>
        <Button type="submit" size="sm" className="min-h-[44px] sm:min-h-0" disabled={isUpdatingView}>
          {t('editor.views.saveSettings', 'Save')}
        </Button>
      </div>
      {error && <p role="alert" className="text-sm text-red-600 sm:col-span-4">{error}</p>}
    </form>
  );
};
