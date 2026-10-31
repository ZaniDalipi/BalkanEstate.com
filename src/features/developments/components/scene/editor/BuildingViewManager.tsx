import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, ImageUp, Plus, Settings2, Trash2 } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import type { Scene, SceneTargetType } from '../../../types';
import { ViewUploadForm } from './ViewUploadForm';
import { ViewSettingsForm } from './ViewSettingsForm';
import { useViewActions } from './useViewActions';
import { ACCEPTED_IMAGE_TYPES } from './imageFile';

interface BuildingViewManagerProps {
  developmentId: string;
  targetType: SceneTargetType;
  targetId: string;
  /** This target's views, in display order. */
  views: Scene[];
  activeId: string | null;
  /** Switch view (the parent guards unsaved edits). */
  onSelect: (sceneId: string) => void;
  dirty: boolean;
  onRegionsReset: () => void;
}

const iconBtn =
  'inline-flex h-11 min-w-[44px] items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 hover:bg-slate-50 focus-within:ring-2 focus-within:ring-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-40 sm:h-9 sm:min-w-[36px]';

/** Camera views of one target as tabs, with add / settings / reorder / replace / delete. */
export const BuildingViewManager: React.FC<BuildingViewManagerProps> = ({
  developmentId,
  targetType,
  targetId,
  views,
  activeId,
  onSelect,
  dirty,
  onRegionsReset,
}) => {
  const { t } = useTranslation('developments');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(false);
  const actions = useViewActions({ developmentId, views, dirty, onRegionsReset });
  const active = views.find((v) => v.id === activeId) ?? null;
  const index = active ? views.indexOf(active) : -1;
  const viewTitle = (v: Scene) => v.viewName || t(`editor.directions.${v.viewDirection}`, v.viewDirection || v.viewKey);

  if (views.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-slate-600">{t('editor.views.empty', 'No views yet. Upload a rendering or plan to start mapping regions.')}</p>
        <ViewUploadForm developmentId={developmentId} targetType={targetType} targetId={targetId} existing={views} onCreated={(s) => onSelect(s.id)} />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <div role="tablist" aria-label={t('editor.views.label', 'Views')} className="flex flex-wrap gap-1.5">
          {views.map((v) => (
            <button
              key={v.id}
              type="button"
              role="tab"
              aria-selected={v.id === activeId}
              onClick={() => v.id !== activeId && onSelect(v.id)}
              className={cn(
                'inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:min-h-[36px]',
                v.id === activeId ? 'border-primary bg-primary text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              )}
            >
              {viewTitle(v)}
              {v.published && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-label={t('editor.status.published', 'Published')} />}
            </button>
          ))}
        </div>
        <button type="button" className={iconBtn} onClick={() => setAdding((x) => !x)} aria-expanded={adding}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          {t('editor.views.add', 'Add view')}
        </button>

        {active && (
          <div className="ml-auto flex flex-wrap gap-1.5">
            <button type="button" className={iconBtn} disabled={index <= 0 || actions.busy} onClick={() => actions.move(active.id, -1)} aria-label={t('editor.views.moveLeft', 'Move view left')}>
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <button type="button" className={iconBtn} disabled={index >= views.length - 1 || actions.busy} onClick={() => actions.move(active.id, 1)} aria-label={t('editor.views.moveRight', 'Move view right')}>
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
            <button type="button" className={iconBtn} onClick={() => setEditing((x) => !x)} aria-expanded={editing} aria-label={t('editor.views.settings', 'View settings')}>
              <Settings2 className="h-4 w-4" aria-hidden="true" />
            </button>
            <label className={cn(iconBtn, 'cursor-pointer')}>
              <ImageUp className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">{t('scene.replace', 'Replace image')}</span>
              <span className="sr-only sm:hidden">{t('scene.replace', 'Replace image')}</span>
              <input
                type="file"
                accept={ACCEPTED_IMAGE_TYPES.join(',')}
                className="sr-only"
                disabled={actions.busy}
                onChange={(e) => {
                  actions.replaceImage(active, e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
            </label>
            <button type="button" className={cn(iconBtn, 'text-red-600')} disabled={actions.busy} onClick={() => actions.deleteView(active, () => setEditing(false))} aria-label={t('editor.views.delete', 'Delete view')}>
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      {active && (
        <p className="text-xs text-slate-500">
          {t('editor.views.imageInfo', '{{width}} × {{height}} px · key {{key}}', { width: active.imageWidth, height: active.imageHeight, key: active.viewKey })}
        </p>
      )}
      {actions.error && <p role="alert" className="text-sm text-red-600">{actions.error}</p>}
      {actions.info && <p role="status" className="text-sm text-emerald-700">{actions.info}</p>}
      {editing && active && <ViewSettingsForm key={active.id} developmentId={developmentId} scene={active} onDone={() => setEditing(false)} />}
      {adding && (
        <ViewUploadForm
          developmentId={developmentId}
          targetType={targetType}
          targetId={targetId}
          existing={views}
          onCancel={() => setAdding(false)}
          onCreated={(s) => {
            setAdding(false);
            onSelect(s.id);
          }}
        />
      )}
    </div>
  );
};
