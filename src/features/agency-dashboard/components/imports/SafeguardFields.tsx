import React from 'react';
import { useTranslation } from 'react-i18next';
import type { FeedSafeguards } from '../../types/propertyImports';
import { inputClass } from './formatters';

interface SafeguardFieldsProps {
  value: FeedSafeguards;
  onChange: (next: FeedSafeguards) => void;
}

/** Thresholds above which removals from a snapshot wait for a manager's review. */
const SafeguardFields: React.FC<SafeguardFieldsProps> = ({ value, onChange }) => {
  const { t } = useTranslation(['agencyDashboard']);
  return (
    <fieldset className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border border-gray-200 p-4">
      <legend className="px-1 text-sm font-semibold text-gray-900">{t('agencyDashboard:imports.form.safeguards', 'Removal safeguard')}</legend>
      <label className="block text-sm">
        <span className="font-medium text-gray-700">{t('agencyDashboard:imports.form.maxRemoval', 'Ask me first if more than this share disappears (%)')}</span>
        <input className={inputClass} type="number" min={5} max={100} value={Math.round(value.maxRemovalRatio * 100)}
          onChange={(e) => onChange({ ...value, maxRemovalRatio: Number(e.target.value) / 100 })} />
      </label>
      <label className="block text-sm">
        <span className="font-medium text-gray-700">{t('agencyDashboard:imports.form.minRemovals', '…and more than this many listings')}</span>
        <input className={inputClass} type="number" min={0} max={1000} value={value.minRemovalsForReview}
          onChange={(e) => onChange({ ...value, minRemovalsForReview: Number(e.target.value) })} />
      </label>
    </fieldset>
  );
};

export default SafeguardFields;
