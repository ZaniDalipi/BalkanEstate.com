import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { FeedIssue } from '../../types/propertyImports';

const PAGE = 15;

/** Validation errors first (records that were not imported), then warnings. */
const IssueList: React.FC<{ issues: FeedIssue[]; truncated?: boolean }> = ({ issues, truncated }) => {
  const { t } = useTranslation(['agencyDashboard']);
  const [shown, setShown] = useState(PAGE);
  if (issues.length === 0) {
    return <p className="text-sm text-green-700">{t('agencyDashboard:imports.issues.none', 'No problems found.')}</p>;
  }
  return (
    <div>
      <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
        {issues.slice(0, shown).map((issue, i) => (
          <li key={`${issue.code}-${issue.externalId ?? ''}-${i}`} className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3 px-3 py-2 text-sm">
            <span className={`shrink-0 w-fit px-2 py-0.5 rounded text-xs font-semibold ${issue.severity === 'error' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
              {issue.severity === 'error' ? t('agencyDashboard:imports.issues.error', 'Not imported') : t('agencyDashboard:imports.issues.warning', 'Warning')}
            </span>
            {issue.externalId && <span className="shrink-0 font-mono text-xs text-gray-500 pt-0.5">{issue.externalId}</span>}
            <span className="text-gray-800 break-words">{issue.message}</span>
          </li>
        ))}
      </ul>
      {(shown < issues.length || truncated) && (
        <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
          {shown < issues.length ? (
            <button type="button" onClick={() => setShown((n) => n + PAGE)} className="font-medium text-indigo-600 hover:text-indigo-800">
              {t('agencyDashboard:imports.issues.more', 'Show more ({{count}} left)', { count: issues.length - shown })}
            </button>
          ) : <span />}
          {truncated && <span>{t('agencyDashboard:imports.issues.truncated', 'Only the first 500 problems are listed.')}</span>}
        </div>
      )}
    </div>
  );
};

export default IssueList;
