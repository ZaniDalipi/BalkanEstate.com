import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { addEmails, sameList } from './alertEmails';

interface AlertEmailsEditorProps {
  saved: string[];
  max: number;
  saving: boolean;
  saveError: string | null;
  onSave: (emails: string[]) => void;
}

/** Add and remove alert addresses, then save. Starts from the saved list. */
export const AlertEmailsEditor: React.FC<AlertEmailsEditorProps> = ({ saved, max, saving, saveError, onSave }) => {
  const { t } = useTranslation('admin');
  const [list, setList] = useState<string[]>(saved);
  const [typed, setTyped] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);

  const add = () => {
    const result = addEmails(list, typed, max);
    if (result.ok === false) {
      if (result.reason === 'empty') return;
      setFieldError(
        result.reason === 'invalid'
          ? t('adminAlerts.invalid', { list: result.invalid.join(', '), defaultValue: 'Not a valid email: {{list}}' })
          : t('adminAlerts.tooMany', { max, defaultValue: 'At most {{max}} addresses.' })
      );
      return;
    }
    setList(result.list);
    setTyped('');
    setFieldError(null);
  };

  return (
    <div className="space-y-3">
      {list.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label={t('adminAlerts.listLabel', 'Alert email addresses')}>
          {list.map((email) => (
            <li key={email} className="flex items-center gap-1 rounded-full bg-white pl-3 text-sm ring-1 ring-gray-300">
              {email}
              <button
                type="button"
                onClick={() => setList(list.filter((e) => e !== email))}
                aria-label={t('adminAlerts.remove', { email, defaultValue: 'Remove {{email}}' })}
                className="flex h-11 w-11 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-900"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="admin-alert-email" className="sr-only">{t('adminAlerts.addLabel', 'Add an email address')}</label>
        <input
          id="admin-alert-email"
          type="email"
          inputMode="email"
          value={typed}
          onChange={(e) => { setTyped(e.target.value); setFieldError(null); }}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder={t('adminAlerts.placeholder', 'name@example.com')}
          aria-invalid={!!fieldError}
          aria-describedby={fieldError ? 'admin-alert-email-error' : undefined}
          className="min-h-[44px] flex-1 rounded-lg border border-gray-300 px-3 text-sm"
        />
        <button type="button" onClick={add} className="min-h-[44px] rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium hover:bg-gray-50">
          {t('adminAlerts.add', 'Add')}
        </button>
      </div>
      {fieldError && <p id="admin-alert-email-error" role="alert" className="text-sm text-red-700">{fieldError}</p>}
      {saveError && <p role="alert" className="text-sm text-red-700">{saveError}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => onSave(list)}
          disabled={saving || sameList(list, saved)}
          className="min-h-[44px] rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? t('adminAlerts.saving', 'Saving…') : t('adminAlerts.save', 'Save addresses')}
        </button>
        <p className="text-xs text-gray-500">
          {t('adminAlerts.emptyHint', 'Leave the list empty to use the server setting, or every admin account’s email.')}
        </p>
      </div>
    </div>
  );
};
