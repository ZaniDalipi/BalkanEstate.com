import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ClockIcon } from '@/constants';
import type { SocialPostStatus } from '../api/adminApi';
import { useSocialShareQueue } from '../hooks/useSocialShareQueue';
import SocialPostCard from './SocialPostCard';
import SocialSetupNotice from './SocialSetupNotice';

const TABS: { id: SocialPostStatus; labelKey: string; fallback: string }[] = [
  { id: 'pending', labelKey: 'admin:socialShare.pending', fallback: 'To review' },
  { id: 'approved', labelKey: 'admin:socialShare.approved', fallback: 'Approved' },
  { id: 'rejected', labelKey: 'admin:socialShare.rejected', fallback: 'Skipped' },
];

const errorText = (err: unknown): string | null =>
  err ? (err as { message?: string }).message || String(err) : null;

/**
 * Admin queue of new listings to share on social media. Every post waits here
 * for approval; approving publishes to the connected Facebook Page/Instagram,
 * and the group share is a copy-and-paste the admin does by hand.
 */
const SocialShareQueue: React.FC = () => {
  const { t } = useTranslation(['admin']);
  const [tab, setTab] = useState<SocialPostStatus>('pending');
  const [propertyId, setPropertyId] = useState('');
  const { config, posts, approve, reject, restore, queue, groupShared } = useSocialShareQueue(tab);

  const busyId =
    (approve.isPending && approve.variables?.id) ||
    (reject.isPending && reject.variables) ||
    (restore.isPending && restore.variables) ||
    (groupShared.isPending && groupShared.variables?.id) ||
    null;
  const actionError = errorText(approve.error || reject.error || restore.error || groupShared.error || queue.error);

  const addListing = (e: React.FormEvent) => {
    e.preventDefault();
    const id = propertyId.trim().split(/[?#]/)[0].replace(/\/+$/, '').split('/').pop() || '';
    if (id) queue.mutate(id, { onSuccess: () => { setPropertyId(''); setTab('pending'); } });
  };

  const list = posts.data?.posts ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-gray-900">{t('admin:socialShare.title', 'Social Sharing')}</h2>
        <p className="text-sm text-gray-500">
          {t('admin:socialShare.subtitle', 'New listings wait here for your approval before anything is posted.')}
        </p>
      </div>

      {config.data && <SocialSetupNotice config={config.data} />}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {TABS.map((tb) => (
            <button key={tb.id} onClick={() => setTab(tb.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                tab === tb.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {t(tb.labelKey, tb.fallback)}
              {tab === tb.id && (posts.data?.total ?? 0) > 0 && <span className="ml-1.5 opacity-70">{posts.data?.total}</span>}
            </button>
          ))}
        </div>
        <form onSubmit={addListing} className="flex gap-2">
          <input value={propertyId} onChange={(e) => setPropertyId(e.target.value)}
            placeholder={t('admin:socialShare.addPlaceholder', 'Listing ID or link')}
            aria-label={t('admin:socialShare.addPlaceholder', 'Listing ID or link')}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg w-56" />
          <button type="submit" disabled={queue.isPending || !propertyId.trim()}
            className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-gray-800 text-white disabled:opacity-50">
            {t('admin:socialShare.addToQueue', 'Add to queue')}
          </button>
        </form>
      </div>

      {actionError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{actionError}</div>
      )}

      {posts.isLoading || !config.data ? (
        <div className="py-12 text-center text-gray-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
        </div>
      ) : posts.isError ? (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {t('admin:socialShare.loadError', 'Could not load the share queue.')}
        </div>
      ) : list.length === 0 ? (
        <div className="py-12 text-center text-gray-400 flex flex-col items-center gap-2">
          <ClockIcon className="w-10 h-10 opacity-40" />
          <p>{t('admin:socialShare.empty', 'Nothing here right now.')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((post) => (
            <SocialPostCard key={`${post._id}-${post.status}`} post={post} config={config.data!} busy={busyId === post._id}
              onApprove={(caption, channels) => approve.mutate({ id: post._id, caption, channels })}
              onReject={() => reject.mutate(post._id)}
              onRestore={() => restore.mutate(post._id)}
              onGroupShared={(shared) => groupShared.mutate({ id: post._id, shared })} />
          ))}
        </div>
      )}
    </div>
  );
};

export default SocialShareQueue;
