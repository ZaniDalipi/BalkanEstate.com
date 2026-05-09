import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { type ListingSource } from '../api/listingSourceApi';
import { useListingFeeds } from '../hooks/useListingFeeds';
import AddFeedWizard from './AddFeedWizard';
import ListingFeedForm from './ListingFeedForm';
import ListingFeedRow from './ListingFeedRow';
import ListingPreviewModal from './ListingPreviewModal';

type View = 'list' | 'add' | 'edit';

const MyListingFeeds: React.FC = () => {
  const { t } = useTranslation(['listingFeeds', 'common']);
  const [view, setView] = useState<View>('list');
  const [editing, setEditing] = useState<ListingSource | null>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);

  const {
    sources,
    loading,
    error,
    runningIds,
    previewingIds,
    deletingIds,
    togglingIds,
    clearingIds,
    lastRun,
    pendingPreview,
    confirmingPreview,
    selectedIds,
    isAllSelected,
    isSomeSelected,
    bulkDeleting,
    deleteFeed,
    previewFeed,
    confirmFeed,
    cancelPreview,
    toggleEnabled,
    clearImports,
    upsertFeed,
    toggleSelected,
    selectAll,
    clearSelection,
    bulkDeleteSelected,
    clearError,
  } = useListingFeeds();

  // Keep the master checkbox indeterminate state in sync with selection.
  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = isSomeSelected;
  }, [isSomeSelected]);

  const handleSaved = (source: ListingSource) => {
    upsertFeed(source);
    setView('list');
    setEditing(null);
  };

  const handleDelete = (id: string) => {
    if (!confirm(t('listingFeeds:confirmDelete'))) return;
    void deleteFeed(id);
  };

  const handleClearImports = (source: ListingSource) => {
    if (!confirm(t('listingFeeds:confirmClearImports', { count: source.listingsImported }))) return;
    void clearImports(source.id);
  };

  const handleBulkDelete = () => {
    if (!confirm(t('listingFeeds:confirmBulkDelete', { count: selectedIds.size }))) return;
    void bulkDeleteSelected();
  };

  if (view === 'add') {
    return <AddFeedWizard onCancel={() => setView('list')} onSaved={handleSaved} />;
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
      {/* Review modal — shown when a preview has been fetched and is awaiting user approval */}
      {pendingPreview && (
        <ListingPreviewModal
          sourceName={pendingPreview.sourceName}
          previewId={pendingPreview.previewId}
          items={pendingPreview.items}
          onConfirm={confirmFeed}
          onCancel={cancelPreview}
          isConfirming={confirmingPreview}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
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

      {/* Error banner */}
      {error && (
        <div
          role="alert"
          className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm flex items-center justify-between gap-2"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={clearError}
            aria-label={t('common:close')}
            className="text-red-400 hover:text-red-600 font-bold text-lg leading-none"
          >×</button>
        </div>
      )}

      {/* Bulk action bar */}
      {!loading && sources.length > 0 && (
        <div
          className={`mb-3 px-4 py-2.5 rounded-xl border flex items-center justify-between gap-3 flex-wrap transition-colors ${
            selectedIds.size > 0 ? 'bg-primary/5 border-primary/30' : 'bg-gray-50 border-gray-200'
          }`}
        >
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              ref={selectAllRef}
              type="checkbox"
              checked={isAllSelected}
              onChange={() => (isAllSelected ? clearSelection() : selectAll())}
              className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary/30"
              aria-label={t('listingFeeds:selectAll')}
            />
            <span className="text-sm text-gray-700">
              {selectedIds.size > 0
                ? t('listingFeeds:selectedCount', { count: selectedIds.size })
                : t('listingFeeds:selectAll')}
            </span>
          </label>

          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={clearSelection}
                disabled={bulkDeleting}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                {t('common:cancel')}
              </button>
              <button
                type="button"
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                className="px-3 py-1.5 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 flex items-center gap-1.5"
              >
                {bulkDeleting && (
                  <span className="inline-block w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                )}
                {t('listingFeeds:deleteSelected', { count: selectedIds.size })}
              </button>
            </div>
          )}
        </div>
      )}

      {/* List body */}
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
              selected={selectedIds.has(source.id)}
              isRunning={runningIds.has(source.id)}
              isPreviewing={previewingIds.has(source.id)}
              isDeleting={deletingIds.has(source.id)}
              isToggling={togglingIds.has(source.id)}
              isClearing={clearingIds.has(source.id)}
              lastRun={lastRun[source.id]}
              onSelect={() => toggleSelected(source.id)}
              onEdit={() => { setEditing(source); setView('edit'); }}
              onDelete={() => handleDelete(source.id)}
              onRun={() => previewFeed(source.id)}
              onToggleEnabled={() => void toggleEnabled(source)}
              onClearImports={() => handleClearImports(source)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default MyListingFeeds;
