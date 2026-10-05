import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFeedRun, useFeedRuns } from '../../hooks/usePropertyImports';
import { ACTIVE_RUN_STATUSES, type AgencyFeed, type FeedMeta } from '../../types/propertyImports';
import ActivationBox from './ActivationBox';
import MutationError from './MutationError';
import RunHistory from './RunHistory';
import RunReport from './RunReport';
import XmlUploadBox from './XmlUploadBox';

interface FeedPanelProps {
  agencyId: string;
  feed: AgencyFeed;
  meta: FeedMeta;
  onPreview: () => void;
  previewing: boolean;
  previewError: unknown;
  onActivate: (acceptListingLimit: boolean) => void;
  activating: boolean;
  activateError: unknown;
  onReview: (runId: string, decision: 'approve' | 'dismiss') => void;
  reviewing: boolean;
  onUpload: (file: Blob, filename: string, previewOnly: boolean) => void;
  uploading: boolean;
  uploadError: unknown;
}

const FeedPanel: React.FC<FeedPanelProps> = (props) => {
  const { agencyId, feed, meta } = props;
  const { t } = useTranslation(['agencyDashboard']);
  const { data: runs = [] } = useFeedRuns(agencyId, feed.id);
  const [pickedRunId, setPickedRunId] = useState<string | null>(null);
  const latestRunId = runs[0]?.id ?? null;
  const shownRunId = pickedRunId ?? latestRunId;
  const { data: run } = useFeedRun(agencyId, feed.id, shownRunId);
  const runActive = run ? ACTIVE_RUN_STATUSES.includes(run.status) : false;
  const isPreviewOfCurrentConfig = run?.dryRun && run.status === 'previewed' && run.id === feed.lastPreviewRunId;

  const reviewSlot = run && run.id === feed.pendingReviewRunId && (
    <div className="flex flex-wrap gap-2 pt-1">
      <button type="button" disabled={props.reviewing} onClick={() => props.onReview(run.id, 'approve')}
        className="px-3 py-1.5 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-50">
        {t('agencyDashboard:imports.review.approve', 'Deactivate {{count}} listings', { count: run.deactivation.candidates })}
      </button>
      <button type="button" disabled={props.reviewing} onClick={() => props.onReview(run.id, 'dismiss')}
        className="px-3 py-1.5 text-sm font-medium text-gray-800 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">
        {t('agencyDashboard:imports.review.dismiss', 'Keep them active')}
      </button>
    </div>
  );

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 space-y-6">
      {feed.sourceType === 'upload' && (
        <div className="space-y-2">
          <p className="text-sm text-gray-700">
            {feed.state === 'draft'
              ? t('agencyDashboard:imports.panel.uploadDraftHelp', 'Upload your XML file to check how your listings will look. Nothing is published until you activate the feed.')
              : t('agencyDashboard:imports.panel.uploadActiveHelp', 'Upload a new XML file whenever your listings change. It is imported with the same checks as a feed.')}
          </p>
          <XmlUploadBox
            activated={feed.state !== 'draft'}
            busy={props.uploading || feed.activeJob}
            error={props.uploadError}
            onUpload={(file, filename, previewOnly) => {
              setPickedRunId(null); // show the new run as soon as it appears
              props.onUpload(file, filename, previewOnly);
            }}
          />
        </div>
      )}

      {feed.state === 'draft' && feed.sourceType !== 'upload' && (
        <div className="space-y-3">
          <p className="text-sm text-gray-700">
            {t('agencyDashboard:imports.panel.draftHelp', 'Test the connection and check how your listings will look. Nothing is published until you activate the feed.')}
          </p>
          <button type="button" onClick={props.onPreview} disabled={props.previewing || feed.activeJob}
            className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
            {feed.activeJob ? t('agencyDashboard:imports.panel.previewRunning', 'Checking the feed…') : t('agencyDashboard:imports.actions.preview', 'Test connection & preview')}
          </button>
          <MutationError error={props.previewError} />
        </div>
      )}

      {run && (
        <div className="space-y-4">
          {runActive ? (
            <p className="text-sm text-blue-800">{t('agencyDashboard:imports.panel.inProgress', 'This import is still running; results appear here automatically.')}</p>
          ) : (
            <RunReport run={run} reviewSlot={reviewSlot} />
          )}
          {feed.state === 'draft' && isPreviewOfCurrentConfig && (
            <ActivationBox preview={run} statement={meta.authorizationStatement} activating={props.activating} error={props.activateError} onActivate={props.onActivate} />
          )}
        </div>
      )}

      <div>
        <h4 className="mb-2 text-sm font-semibold text-gray-900">{t('agencyDashboard:imports.history.title', 'Import history')}</h4>
        <RunHistory runs={runs} selectedRunId={shownRunId} onSelect={setPickedRunId} />
      </div>
    </section>
  );
};

export default FeedPanel;
