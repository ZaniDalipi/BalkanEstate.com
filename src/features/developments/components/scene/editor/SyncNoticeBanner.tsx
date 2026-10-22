import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, CheckCircle2, RefreshCw, X } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import type { SceneSync } from './useSceneSync';
import { issueText } from './issueText';

interface SyncNoticeBannerProps {
  sync: SceneSync;
}

/** Outcome of the last save/publish, the version-conflict prompt, and server-wide issues. */
export const SyncNoticeBanner: React.FC<SyncNoticeBannerProps> = ({ sync }) => {
  const { t } = useTranslation('developments');
  const { notice, conflict, generalIssues } = sync;

  if (conflict) {
    return (
      <div role="alert" className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
        <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          {t('editor.conflict.message', 'Someone else saved this view while you were editing. Your changes were not saved.')}
        </span>
        <Button size="sm" variant="outline" className="min-h-[44px] bg-white sm:min-h-0" onClick={sync.reloadLatest}>
          <RefreshCw className="mr-1 h-4 w-4" aria-hidden="true" />
          {t('editor.conflict.reload', 'Reload latest (discard my changes)')}
        </Button>
      </div>
    );
  }

  const positive = notice?.kind === 'saved' || notice?.kind === 'published' || notice?.kind === 'unpublished';
  const text = !notice
    ? null
    : notice.kind === 'saved'
      ? t('scene.saved', 'Draft saved.')
      : notice.kind === 'published'
        ? t('editor.notice.published', 'View published. Visitors now see these regions.')
        : notice.kind === 'unpublished'
          ? t('editor.notice.unpublished', 'View unpublished. Visitors no longer see it.')
          : notice.kind === 'blocked'
            ? t('editor.notice.blocked', 'Fix the highlighted regions before publishing.')
            : notice.kind === 'blockedSave'
              ? t('editor.notice.blockedSave', 'Every region needs a valid shape and a link before the draft can be saved.')
            : notice.kind === 'invalid'
              ? t('editor.notice.invalid', 'The server rejected some regions. They are highlighted in the list.')
              : notice.kind === 'error'
                ? notice.message
                : null;

  return (
    <>
      {text && (
        <div
          role={positive ? 'status' : 'alert'}
          className={
            positive
              ? 'flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800'
              : 'flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800'
          }
        >
          {positive ? <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" /> : <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />}
          <span className="min-w-0 flex-1">{text}</span>
          <button
            type="button"
            onClick={sync.dismissNotice}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label={t('editor.notice.dismiss', 'Dismiss')}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}
      {generalIssues.length > 0 && (
        <ul className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {generalIssues.map((i, idx) => (
            <li key={idx}>{issueText(t, i.code)}</li>
          ))}
        </ul>
      )}
    </>
  );
};
