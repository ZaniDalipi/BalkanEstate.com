import React from 'react';
import { useTranslation } from 'react-i18next';
import type { DraftFields } from '../../api/importReviewApi';
import { formatDraftValue } from '../../utils/draftFormat';

interface ImportDraftChangesProps {
  fields: (keyof DraftFields)[];
  current: DraftFields;
  incoming: DraftFields;
}

/** What the feed wants to change on an already-published listing. */
const ImportDraftChanges: React.FC<ImportDraftChangesProps> = ({ fields, current, incoming }) => {
  const { t } = useTranslation(['listingFeeds', 'property']);
  if (fields.length === 0) return null;

  return (
    <div className="mt-2 rounded-xl border border-blue-100 bg-blue-50/50 p-2.5">
      <p className="text-xs font-semibold text-blue-900 mb-1">{t('listingFeeds:review.changesTitle')}</p>
      <table className="w-full text-xs">
        <thead className="sr-only">
          <tr>
            <th />
            <th>{t('listingFeeds:review.currentValue')}</th>
            <th>{t('listingFeeds:review.incomingValue')}</th>
          </tr>
        </thead>
        <tbody>
          {fields.map((field) => (
            <tr key={field} className="align-top">
              <td className="pr-2 py-0.5 text-gray-500 whitespace-nowrap">{t(`listingFeeds:review.fields.${field}`)}</td>
              <td className="pr-2 py-0.5 text-gray-500 line-through break-words">{formatDraftValue(field, current, t)}</td>
              <td className="py-0.5 text-gray-900 font-medium break-words">{formatDraftValue(field, incoming, t)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ImportDraftChanges;
