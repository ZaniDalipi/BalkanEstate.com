import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { type ListingSource } from '../api/listingSourceApi';
import { useListingFeeds } from '../hooks/useListingFeeds';
import AddFeedWizard from './AddFeedWizard';
import ListingFeedForm from './ListingFeedForm';
import ListingFeedRow from './ListingFeedRow';

type View = 'list' | 'add' | 'edit';

const MyListingFeeds: React.FC = () => {
  const { t } = useTranslation(['listingFeeds', 'common']);
  const [view, setView] = useState<View>('list');
  const [editing, setEditing] = useState<ListingSource | null>(null);

  const {
    sources,
    loading,
    error,
    runningIds,
    deletingIds,
    togglingIds,
    lastRun,
    deleteFeed,
    runFeed,
    toggleEnabled,
    upsertFeed,
    clearError,
  } = useListingFeeds();

  const handleSaved = (source: ListingSource) => {
    upsertFeed(source);
    setView('list');
    setEditing(null);
  };

  const handleDelete = (id: string) => {
    if (!confirm(t('listingFeeds:confirmDelete'))) return;
    void deleteFeed(id);
  };

  if (view === 'add') {
    return (
      <AddFeedWizard
        onCancel={() => setView('list')}
        onSaved={handleSaved}
      />
    );
  }

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
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm flex items-center justify-between gap-2">
          <span>{error}</span>
          <button type="button" onClick={clearError} className="text-red-400 hover:text-red-600 font-bold text-lg leading-none">×</button>
        </div>
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
              key={source.id}
              source={source}
              isRunning={runningIds.has(source.id)}
              isDeleting={deletingIds.has(source.id)}
              isToggling={togglingIds.has(source.id)}
              lastRun={lastRun[source.id]}
              onEdit={() => { setEditing(source); setView('edit'); }}
              onDelete={() => handleDelete(source.id)}
              onRun={() => void runFeed(source.id)}
              onToggleEnabled={() => void toggleEnabled(source)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default MyListingFeeds;
