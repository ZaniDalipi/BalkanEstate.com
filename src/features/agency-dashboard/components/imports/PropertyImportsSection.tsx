import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PlusIcon } from '@/constants';
import type { FeedMappingConfig } from '../../types/propertyImports';
import { useAgencyAgents } from '../../hooks';
import { useAgencyFeeds, useFeedMeta, useFeedMutations } from '../../hooks/usePropertyImports';
import FeedCard from './FeedCard';
import FeedForm from './FeedForm';
import FeedPanel from './FeedPanel';
import MutationError from './MutationError';
import QuickUploadButton from './QuickUploadButton';
import SyncRulesInfo from './SyncRulesInfo';

interface PropertyImportsSectionProps {
  agencyId: string;
}

type Editing = { kind: 'none' } | { kind: 'new' } | { kind: 'edit'; feedId: string; suggestedMapping?: FeedMappingConfig };

const PropertyImportsSection: React.FC<PropertyImportsSectionProps> = ({ agencyId }) => {
  const { t } = useTranslation(['agencyDashboard']);
  const { data, isLoading, error } = useAgencyFeeds(agencyId);
  const feeds = data?.feeds ?? [];
  const workerOffline = data?.workerOnline === false && feeds.some((f) => f.activeJob);
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

  // One step: reuse the agency's upload feed, or create one, then send the file.
  // A new or not-yet-activated feed previews it; an activated one imports it.
  const quickUpload = async (file: File) => {
    try {
      const target =
        feeds.find((f) => f.sourceType === 'upload') ??
        (await m.create.mutateAsync({ name: t('agencyDashboard:imports.quickUpload.feedName', 'XML upload'), sourceType: 'upload' }));
      setSelectedId(target.id);
      await m.upload.mutateAsync({ feedId: target.id, file, filename: file.name, previewOnly: false });
    } catch {
      // Shown by MutationError below.
    }
  };
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
          <div className="flex flex-col sm:flex-row gap-2">
            <QuickUploadButton busy={m.create.isPending || m.upload.isPending} onFile={quickUpload} />
            <button type="button" onClick={() => setEditing({ kind: 'new' })}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">
              <PlusIcon className="w-4 h-4" />
              {t('agencyDashboard:imports.actions.add', 'Connect a feed')}
            </button>
          </div>
        )}
      </div>

      {editing.kind !== 'none' && meta && (
        <FeedForm
          key={editing.kind === 'edit' ? editing.feedId : 'new'}
          feed={editedFeed}
          suggestedMapping={editing.kind === 'edit' ? editing.suggestedMapping : undefined}
          meta={meta}
          agents={agentOptions}
          saving={m.create.isPending || m.update.isPending}
          error={m.create.error ?? m.update.error ?? m.remove.error}
          onCancel={closeForm}
          onSubmit={(payload) => {
            // A changed draft is previewed again straight away (an upload feed re-reads its last file).
            const done = {
              onSuccess: (feed: { id: string; state: string }) => {
                setSelectedId(feed.id);
                closeForm();
                if (feed.state === 'draft') m.preview.mutate(feed.id);
              },
            };
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

      {workerOffline && (
        <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {t('agencyDashboard:imports.workerOffline', 'Your import is queued, but the import service is not running, so it has not started. It will start automatically once the service is back — contact support if this lasts more than a few minutes.')}
        </div>
      )}

      <MutationError error={m.sync.error ?? m.pause.error ?? m.resume.error ?? m.review.error ?? (editing.kind === 'none' ? m.create.error ?? m.upload.error : null)} />

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
          onUpload={(file, filename, previewOnly) => m.upload.mutate({ feedId: selected.id, file, filename, previewOnly })}
          onApplyMapping={(mapping) =>
            m.update.mutate(
              { feedId: selected.id, payload: { format: 'custom', mapping } },
              { onSuccess: () => m.preview.mutate(selected.id) }
            )
          }
          onReviewMapping={(mapping) => setEditing({ kind: 'edit', feedId: selected.id, suggestedMapping: mapping })}
          applyingMapping={m.update.isPending || m.preview.isPending}
          uploading={m.upload.isPending}
          uploadError={m.upload.error}
        />
      )}

      {meta && <SyncRulesInfo meta={meta} />}
    </div>
  );
};

export default PropertyImportsSection;
