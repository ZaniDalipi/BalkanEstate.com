import React from 'react';
import { useTranslation } from 'react-i18next';
import { CircleDot, Globe2, Save, EyeOff } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { cn } from '@/src/lib/utils';
import type { Hotspot, Scene } from '../../../types';
import type { SceneSync } from './useSceneSync';
import { SyncNoticeBanner } from './SyncNoticeBanner';

interface SceneStatusBarProps {
  scene: Scene;
  sync: SceneSync;
  issueCount: number;
}

const same = (a: Hotspot[] = [], b: Hotspot[] = []) => JSON.stringify(a) === JSON.stringify(b);

/** Draft/published state, save/publish/unpublish actions and their outcome. */
export const SceneStatusBar: React.FC<SceneStatusBarProps> = ({ scene, sync, issueCount }) => {
  const { t, i18n } = useTranslation('developments');
  const published = scene.published;
  const pendingChanges = sync.dirty || !published || !same(scene.draft?.hotspots, published.hotspots);
  const publishedAt = published?.publishedAt
    ? new Date(published.publishedAt).toLocaleString(i18n.language, { dateStyle: 'medium', timeStyle: 'short' })
    : null;
  const busy = sync.isSaving || sync.isPublishing || sync.isUnpublishing;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
            published ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'
          )}
        >
          <CircleDot className="h-3.5 w-3.5" aria-hidden="true" />
          {published ? t('editor.status.published', 'Published') : t('editor.status.draft', 'Draft')}
        </span>
        {publishedAt && (
          <span className="text-xs text-slate-500">{t('editor.status.publishedAt', 'Published {{date}}', { date: publishedAt })}</span>
        )}
        {sync.dirty ? (
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
            {t('editor.status.unsaved', 'Unsaved changes')}
          </span>
        ) : (
          published &&
          pendingChanges && (
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-800">
              {t('editor.status.unpublished', 'Unpublished changes')}
            </span>
          )
        )}

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {published && (
            <Button variant="ghost" size="sm" className="min-h-[44px] sm:min-h-0" onClick={sync.unpublish} disabled={busy}>
              <EyeOff className="mr-1 h-4 w-4" aria-hidden="true" />
              {t('editor.actions.unpublish', 'Unpublish')}
            </Button>
          )}
          <Button variant="outline" size="sm" className="min-h-[44px] sm:min-h-0" onClick={sync.save} disabled={busy || !sync.dirty}>
            <Save className="mr-1 h-4 w-4" aria-hidden="true" />
            {sync.isSaving ? t('editor.actions.saving', 'Saving…') : t('scene.saveDraft', 'Save draft')}
          </Button>
          <Button
            size="sm"
            className="min-h-[44px] sm:min-h-0"
            onClick={sync.publish}
            disabled={busy || !pendingChanges}
            aria-describedby={issueCount > 0 ? 'scene-publish-blocked' : undefined}
          >
            <Globe2 className="mr-1 h-4 w-4" aria-hidden="true" />
            {sync.isPublishing ? t('editor.actions.publishing', 'Publishing…') : t('editor.actions.publish', 'Publish')}
          </Button>
        </div>
      </div>
      {issueCount > 0 && (
        <p id="scene-publish-blocked" className="text-xs text-red-700">
          {t('editor.status.issueCount', '{{count}} region(s) need attention before publishing.', { count: issueCount })}
        </p>
      )}
      <SyncNoticeBanner sync={sync} />
    </div>
  );
};
