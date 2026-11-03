import React from 'react';
import { useTranslation } from 'react-i18next';

interface DraftRestoredNoticeProps {
  /** When the draft was saved; nothing renders while null */
  savedAt: number | null;
  /** Throw the draft away and start the form empty */
  onDiscard: () => void;
  className?: string;
}

/** Tells the person their unsent form was brought back, with a way to start over. */
const DraftRestoredNotice: React.FC<DraftRestoredNoticeProps> = ({ savedAt, onDiscard, className = '' }) => {
  const { t } = useTranslation('common');
  if (savedAt === null) return null;

  const date = new Date(savedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <div
      role="status"
      className={`flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50 text-sm ${className}`}
    >
      <p className="flex-1 text-amber-900">
        <span className="font-semibold">{t('formDraft.restoredTitle', { defaultValue: 'We restored what you entered last time.' })}</span>{' '}
        {t('formDraft.restoredMessage', { defaultValue: 'Saved on this device on {{date}}.', date })}
      </p>
      <button
        type="button"
        onClick={onDiscard}
        className="self-start sm:self-auto min-h-[44px] px-4 py-2 border border-amber-300 text-amber-900 font-semibold rounded-lg hover:bg-amber-100"
      >
        {t('formDraft.startOver', { defaultValue: 'Discard and start over' })}
      </button>
    </div>
  );
};

export default DraftRestoredNotice;
