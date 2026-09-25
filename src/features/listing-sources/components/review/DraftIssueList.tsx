import React from 'react';
import { useTranslation } from 'react-i18next';
import type { DraftIssue } from '../../api/importReviewApi';

interface DraftIssueListProps {
  issues: DraftIssue[];
  blocking: DraftIssue[];
}

/** What parsing missed: red blocks publishing, amber is a warning. */
const DraftIssueList: React.FC<DraftIssueListProps> = ({ issues, blocking }) => {
  const { t } = useTranslation('listingFeeds');
  if (issues.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label={t('review.blockingHint')}>
      {issues.map((issue) => (
        <li
          key={issue}
          className={`px-2 py-0.5 rounded-md text-xs border ${blocking.includes(issue) ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-800 border-amber-200'}`}
        >
          {t(`review.issues.${issue}`)}
        </li>
      ))}
    </ul>
  );
};

export default DraftIssueList;
