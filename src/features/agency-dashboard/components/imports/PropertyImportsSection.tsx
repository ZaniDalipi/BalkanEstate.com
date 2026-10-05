import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PlusIcon } from '@/constants';
import { useAgencyAgents } from '../../hooks';
import { useAgencyFeeds, useFeedMeta, useFeedMutations } from '../../hooks/usePropertyImports';
import FeedCard from './FeedCard';
import FeedForm from './FeedForm';
import FeedPanel from './FeedPanel';
import MutationError from './MutationError';
import SyncRulesInfo from './SyncRulesInfo';

interface PropertyImportsSectionProps {
  agencyId: string;
}

type Editing = { kind: 'none' } | { kind: 'new' } | { kind: 'edit'; feedId: string };

const PropertyImportsSection: React.FC<PropertyImportsSectionProps> = ({ agencyId }) => {
  const { t } = useTranslation(['agencyDashboard']);
  const { data: feeds = [], isLoading, error } = useAgencyFeeds(agencyId);
  const { data: meta } = useFeedMeta(agencyId);
  const { agents } = useAgencyAgents(agencyId);
  const m = useFeedMutations(agencyId);
  const [editing, setEditing] = useState<Editing>({ kind: 'none' });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = feeds.find((f) => f.id === (selectedId ?? feeds[0]?.id)) ?? null;
  const editedFeed = editing.kind === 'edit' ? feeds.find((f) => f.id === editing.feedId) ?? null : null;
  const busy = m.sync.isPending || m.pause.isPending || m.resume.isPending;

  if ((error as { statusCode?: number } | null)?.statusCode === 403) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 text-sm text-gray-700">
        {t('agencyDashboard:imports.managersOnly', 'Only the agency owner or an agency admin can manage property imports.')}
      </div>
    );
  }

  const closeForm = () => setEditing({ kind: 'none' });
  const agentOptions = agents.map((a) => ({ id: a.userId, name: a.name }));

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{t('agencyDashboard:imports.title', 'Property Imports')}</h2>
          <p className="text-sm text-gray-600">
            {t('agencyDashboard:imports.subtitle', 'Connect the XML feed from your website or CRM. Listings and photos are imported and refreshed every 24 hours.')}
          </p>
        </div>
        {editing.kind === 'none' && (
          <button type="button" onClick={() => setEditing({ kind: 'new' })}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">
            <PlusIcon className="w-4 h-4" />
            {t('agencyDashboard:imports.actions.add', 'Connect a feed')}
          </button>
        )}
      </div>

      {editing.kind !== 'none' && meta && (
        <FeedForm
          key={editing.kind === 'edit' ? editing.feedId : 'new'}
          feed={editedFeed}
          meta={meta}
          agents={agentOptions}
          saving={m.create.isPending || m.update.isPending}
          error={m.create.error ?? m.update.error ?? m.remove.error}
          onCancel={closeForm}
          onSubmit={(payload) => {
            const done = { onSuccess: (feed: { id: string }) => { setSelectedId(feed.id); closeForm(); } };
            if (editedFeed) m.update.mutate({ feedId: editedFeed.id, payload }, done);
            else m.create.mutate(payload, done);
          }}
          onDelete={editedFeed ? () => {
            if (window.confirm(t('agencyDashboard:imports.confirmDelete', 'Disconnect this feed? Imported listings stay on BalkanEstateAI but are no longer updated.'))) {
              m.remove.mutate(editedFeed.id, { onSuccess: () => { setSelectedId(null); closeForm(); } });
            }
          } : undefined}
        />
      )}

      {isLoading && <div className="h-32 bg-white rounded-xl border border-gray-200 animate-pulse" />}
      {!isLoading && feeds.length === 0 && editing.kind === 'none' && (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-600">
          {t('agencyDashboard:imports.empty', 'No feed connected yet. Connect your website or CRM feed to import your listings automatically.')}
        </div>
      )}

      <MutationError error={m.sync.error ?? m.pause.error ?? m.resume.error ?? m.review.error} />

      <div className="space-y-3">
        {feeds.map((feed) => (
          <FeedCard
            key={feed.id}
            feed={feed}
            selected={selected?.id === feed.id}
            busy={busy}
            onSelect={() => setSelectedId(feed.id)}
            onEdit={() => setEditing({ kind: 'edit', feedId: feed.id })}
            onSyncNow={() => m.sync.mutate(feed.id)}
            onTogglePause={() => (feed.state === 'active' ? m.pause.mutate(feed.id) : m.resume.mutate(feed.id))}
          />
        ))}
      </div>

      {selected && meta && (
        <FeedPanel
          key={selected.id}
          agencyId={agencyId}
          feed={selected}
          meta={meta}
          onPreview={() => m.preview.mutate(selected.id)}
          previewing={m.preview.isPending}
          previewError={m.preview.error}
          onActivate={(acceptListingLimit) => m.activate.mutate({ feedId: selected.id, acceptListingLimit })}
          activating={m.activate.isPending}
          activateError={m.activate.error}
          onReview={(runId, decision) => m.review.mutate({ feedId: selected.id, runId, decision })}
          reviewing={m.review.isPending}
        />
      )}

      {meta && <SyncRulesInfo meta={meta} />}
    </div>
  );
};

export default PropertyImportsSection;
