import React from 'react';
import { useTranslation } from 'react-i18next';
import type { CredentialType, FeedFormValues } from '../../types/propertyImports';
import { inputClass } from './formatters';

interface FeedAccessFieldsProps {
  value: FeedFormValues['credentials'];
  hasSavedSecret: boolean;
  onChange: (patch: Partial<FeedFormValues['credentials']>) => void;
}

/** How BalkanEstateAI authenticates to the feed. The saved secret is never shown, only whether one exists. */
const FeedAccessFields: React.FC<FeedAccessFieldsProps> = ({ value, hasSavedSecret, onChange }) => {
  const { t } = useTranslation(['agencyDashboard']);
  return (
    <fieldset className="grid grid-cols-1 sm:grid-cols-3 gap-4 rounded-xl border border-gray-200 p-4">
      <legend className="px-1 text-sm font-semibold text-gray-900">{t('agencyDashboard:imports.form.auth', 'Feed access')}</legend>
      <label className="block text-sm">
        <span className="font-medium text-gray-700">{t('agencyDashboard:imports.form.authType', 'Authentication')}</span>
        <select className={inputClass} value={value.type} onChange={(e) => onChange({ type: e.target.value as CredentialType })}>
          <option value="none">{t('agencyDashboard:imports.form.authNone', 'None (public URL)')}</option>
          <option value="basic">{t('agencyDashboard:imports.form.authBasic', 'Username and password')}</option>
          <option value="header">{t('agencyDashboard:imports.form.authHeader', 'API key header')}</option>
        </select>
      </label>
      {value.type === 'basic' && (
        <label className="block text-sm">
          <span className="font-medium text-gray-700">{t('agencyDashboard:imports.form.username', 'Username')}</span>
          <input className={inputClass} value={value.username ?? ''} onChange={(e) => onChange({ username: e.target.value })} autoComplete="off" />
        </label>
      )}
      {value.type === 'header' && (
        <label className="block text-sm">
          <span className="font-medium text-gray-700">{t('agencyDashboard:imports.form.headerName', 'Header name')}</span>
          <input className={inputClass} value={value.headerName ?? ''} onChange={(e) => onChange({ headerName: e.target.value })} placeholder="X-Api-Key" />
        </label>
      )}
      {value.type !== 'none' && (
        <label className="block text-sm">
          <span className="font-medium text-gray-700">{t('agencyDashboard:imports.form.secret', 'Password / key')}</span>
          <input className={inputClass} type="password" value={value.secret ?? ''} onChange={(e) => onChange({ secret: e.target.value })} autoComplete="new-password"
            placeholder={hasSavedSecret ? t('agencyDashboard:imports.form.secretKept', 'Saved — leave blank to keep') : ''} />
        </label>
      )}
    </fieldset>
  );
};

export default FeedAccessFields;
