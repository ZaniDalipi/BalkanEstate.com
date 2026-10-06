import React from 'react';
import { useTranslation } from 'react-i18next';
import { ExclamationTriangleIcon, InformationCircleIcon } from '@/constants';
import type { FeedRun } from '../../types/propertyImports';
import FieldCatalog from './FieldCatalog';
import ImportStatusBadge from './ImportStatusBadge';
import IssueList from './IssueList';
import RunCounts from './RunCounts';
import SampleListings from './SampleListings';
import { formatDateTime } from './formatters';

interface RunReportProps {
  run: FeedRun;
  /** Review buttons for held deactivations (managers only, latest run only). */
  reviewSlot?: React.ReactNode;
  /** Suggested mapping when the file's listings were not found. */
  detectedSlot?: React.ReactNode;
}

const Notice: React.FC<{ tone: 'warn' | 'info'; children: React.ReactNode }> = ({ tone, children }) => (
  <div className={`flex gap-2 rounded-lg px-3 py-2.5 text-sm ${tone === 'warn' ? 'bg-amber-50 text-amber-900' : 'bg-blue-50 text-blue-900'}`}>
    {tone === 'warn' ? <ExclamationTriangleIcon className="w-5 h-5 shrink-0" /> : <InformationCircleIcon className="w-5 h-5 shrink-0" />}
    <div className="space-y-1">{children}</div>
  </div>
);

const RunReport: React.FC<RunReportProps> = ({ run, reviewSlot, detectedSlot }) => {
  const { t } = useTranslation(['agencyDashboard']);
  const { counts, limit, deactivation } = run;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
        <ImportStatusBadge status={run.status} />
        <span>{formatDateTime(run.finishedAt ?? run.startedAt ?? run.createdAt)}</span>
        <span>· {t('agencyDashboard:imports.report.received', '{{count}} listings in feed', { count: counts.received })}</span>
        {run.sourceFile && <span className="break-all">· {run.sourceFile.filename}</span>}
        {run.snapshot.pages > 1 && <span>· {t('agencyDashboard:imports.report.pages', '{{count}} pages', { count: run.snapshot.pages })}</span>}
      </div>

      {run.mappingUsed && counts.received > 0 && (
        <p className="text-sm text-gray-600">
          {run.mappingUsed.source === 'profile' || run.mappingUsed.source === 'detected'
            ? t('agencyDashboard:imports.report.recognised', 'Format recognised automatically: {{format}}', { format: run.mappingUsed.label })
            : t('agencyDashboard:imports.report.readAs', 'Read as: {{format}}', {
                format: run.mappingUsed.source === 'custom' ? t('agencyDashboard:imports.report.customMapping', 'your field mapping') : run.mappingUsed.label,
              })}
        </p>
      )}

      {run.error && <Notice tone="warn"><p className="font-medium">{run.error.message}</p></Notice>}
      {detectedSlot}

      {!run.dryRun && counts.received > 0 && <RunCounts counts={counts} />}
      {run.dryRun && run.status === 'previewed' && (
        <p className="text-sm text-gray-700">
          {t('agencyDashboard:imports.report.previewSummary', '{{valid}} of {{received}} listings are valid and ready to import; {{rejected}} have problems to fix.', {
            valid: counts.valid, received: counts.received, rejected: counts.received - counts.valid,
          })}
        </p>
      )}

      {limit.checked && limit.wouldExceed && (
        <Notice tone="warn">
          <p className="font-medium">
            {t('agencyDashboard:imports.report.limitTitle', 'Your plan allows {{remaining}} more listings, but the feed has {{count}} new ones.', {
              remaining: limit.remaining ?? 0, count: limit.newListings,
            })}
          </p>
          <p>{t('agencyDashboard:imports.report.limitHelp', 'These listings are not published and nothing is charged. Upgrade the plan or wait for next month’s allowance, and they will be imported on a later sync:')}</p>
          <p className="font-mono text-xs break-words">{limit.excess.map((e) => e.externalId).join(', ')}</p>
        </Notice>
      )}

      {deactivation.held && !deactivation.resolution && (
        <Notice tone="warn">
          <p className="font-medium">{t('agencyDashboard:imports.report.heldTitle', '{{count}} imported listings are missing from the feed.', { count: deactivation.candidates })}</p>
          <p>{t('agencyDashboard:imports.report.heldHelp', 'That is more than your safeguard allows, so nothing was deactivated. If the listings really were removed, approve; if the feed was wrong, dismiss and fix it.')}</p>
          {reviewSlot}
        </Notice>
      )}
      {!run.dryRun && !deactivation.held && !deactivation.allowed && deactivation.blockedReason && run.status !== 'failed' && (
        <Notice tone="info"><p>{deactivation.blockedReason}</p></Notice>
      )}
      {run.dryRun && deactivation.allowed && deactivation.candidates > 0 && (
        <Notice tone="info">
          <p>{t('agencyDashboard:imports.report.wouldDeactivate', 'Importing now would deactivate {{count}} listings that are no longer in the feed.', { count: deactivation.candidates })}</p>
        </Notice>
      )}

      {run.samples && run.samples.length > 0 && (
        <section>
          <h4 className="mb-2 text-sm font-semibold text-gray-900">{t('agencyDashboard:imports.report.samples', 'Sample listings')}</h4>
          <SampleListings samples={run.samples} />
        </section>
      )}

      {run.fieldCatalog && run.fieldCatalog.length > 0 && (
        <FieldCatalog entries={run.fieldCatalog} mapping={run.mappingUsed?.mapping ?? run.detected?.suggestedMapping} />
      )}

      {run.issues && (
        <section>
          <h4 className="mb-2 text-sm font-semibold text-gray-900">
            {t('agencyDashboard:imports.report.issues', 'Validation results')} ({run.issueCount})
          </h4>
          <IssueList issues={run.issues} truncated={run.issuesTruncated} />
        </section>
      )}
    </div>
  );
};

export default RunReport;
