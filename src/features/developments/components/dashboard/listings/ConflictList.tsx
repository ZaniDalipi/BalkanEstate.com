import React from 'react';
import { useTranslation } from 'react-i18next';
import type { AttachmentConflict } from '../../../types';

interface ConflictListProps {
  conflicts: AttachmentConflict[] | null;
  isLoading: boolean;
  force: boolean;
  onForce: (force: boolean) => void;
}

/** Result of the attach preview: conflicts (blocking in red) and the explicit override tick. */
export const ConflictList: React.FC<ConflictListProps> = ({ conflicts, isLoading, force, onForce }) => {
  const { t } = useTranslation('developments');
  if (isLoading) return <p className="text-sm text-slate-500">{t('manage.listings.checking', 'Checking for conflicts…')}</p>;
  if (!conflicts) return null;
  if (conflicts.length === 0) {
    return <p className="text-sm text-green-700" role="status">{t('attach.noConflicts', 'No conflicts — ready to attach.')}</p>;
  }
  const blocking = conflicts.some((c) => c.blocking);
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-medium uppercase text-slate-500">{t('attach.conflictsTitle', 'Conflicts')}</p>
      <ul className="mt-1 space-y-1">
        {conflicts.map((c) => (
          <li key={c.code} className={c.blocking ? 'text-sm text-red-700' : 'text-sm text-amber-700'}>
            • {c.message}
          </li>
        ))}
      </ul>
      {!blocking && (
        <label className="mt-2 flex min-h-[44px] items-center gap-2 text-sm text-slate-800">
          <input type="checkbox" checked={force} onChange={(e) => onForce(e.target.checked)} className="h-4 w-4" />
          {t('attach.force', 'Override non-blocking conflicts')}
        </label>
      )}
    </div>
  );
};
