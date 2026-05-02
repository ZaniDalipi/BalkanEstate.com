import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  type ListingSource,
  type IngestStats,
  listMyListingSources,
  deleteMyListingSource,
  runMyListingSource,
  updateMyListingSource,
} from '../api/listingSourceApi';
import AddFeedWizard from './AddFeedWizard';
import ListingFeedForm from './ListingFeedForm';
import ListingFeedRow from './ListingFeedRow';

type View = 'list' | 'add' | 'edit';

const MyListingFeeds: React.FC = () => {
  const { t } = useTranslation(['listingFeeds', 'common']);
  const [sources, setSources] = useState<ListingSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>('list');
  const [editing, setEditing] = useState<ListingSource | null>(null);
  const [runningIds, setRunningIds] = useState<Set<string>>(new Set());
  const [lastRun, setLastRun] = useState<Record<string, IngestStats>>({});

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSources(await listMyListingSources());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const handleSaved = (source: ListingSource) => {
    setView('list');
    setEditing(null);
    setSources((prev) => {
      const idx = prev.findIndex((s) => s._id === source._id);
      if (idx === -1) return [source, ...prev];
      const next = [...prev];
      next[idx] = source;
      return next;
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('listingFeeds:confirmDelete'))) return;
    await deleteMyListingSource(id);
    setSources((prev) => prev.filter((s) => s._id !== id));
  };

  const handleRun = async (id: string) => {
    setRunningIds((prev) => new Set(prev).add(id));
    try {
      const stats = await runMyListingSource(id);
      setLastRun((prev) => ({ ...prev, [id]: stats }));
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRunningIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
    }
  };

  const handleToggleEnabled = async (source: ListingSource) => {
    const updated = await updateMyListingSource(source._id, { enabled: !source.enabled });
    setSources((prev) => prev.map((s) => (s._id === source._id ? updated : s)));
  };

  // Add new feed — use the auto-detect wizard
  if (view === 'add') {
    return (
      <AddFeedWizard
        onCancel={() => setView('list')}
        onSaved={handleSaved}
      />
    );
  }

  // Edit existing feed — keep the JSON form (user already knows what they set up)
  if (view === 'edit' && editing) {
    return (
      <ListingFeedForm
        initial={editing}
        onCancel={() => { setView('list'); setEditing(null); }}
        onSaved={handleSaved}
      />
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{t('listingFeeds:title')}</h2>
          <p className="text-sm text-gray-600 mt-1">{t('listingFeeds:description')}</p>
        </div>
        <button
          type="button"
          onClick={() => setView('add')}
          className="px-4 py-2 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-colors"
        >
          {t('listingFeeds:addFeed')}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">{t('common:loading')}</div>
      ) : sources.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-gray-300 rounded-2xl">
          <p className="text-gray-600 mb-4">{t('listingFeeds:empty')}</p>
          <button
            type="button"
            onClick={() => setView('add')}
            className="px-4 py-2 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-colors"
          >
            {t('listingFeeds:addFirstFeed')}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {sources.map((source) => (
            <ListingFeedRow
              key={source._id}
              source={source}
              isRunning={runningIds.has(source._id)}
              lastRun={lastRun[source._id]}
              onEdit={() => { setEditing(source); setView('edit'); }}
              onDelete={() => handleDelete(source._id)}
              onRun={() => handleRun(source._id)}
              onToggleEnabled={() => handleToggleEnabled(source)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default MyListingFeeds;
