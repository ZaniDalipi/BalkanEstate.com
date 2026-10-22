import React from 'react';
import { useTranslation } from 'react-i18next';
import { useUpdateDevelopment } from '../../hooks/useDevelopmentMutations';
import type { Development } from '../../types';

interface SettingsPanelProps {
  development: Development;
  canEdit: boolean;
}

/** Development-wide explorer settings. The server re-checks permissions on save. */
export const SettingsPanel: React.FC<SettingsPanelProps> = ({ development, canEdit }) => {
  const { t } = useTranslation('developments');
  const { update, isLoading } = useUpdateDevelopment(development.id);
  const enabled = development.allowUnitInquiries !== false;

  return (
    <section aria-labelledby="settings-heading" className="rounded-2xl border border-slate-200 bg-white p-4">
      <h2 id="settings-heading" className="mb-3 text-base font-semibold text-slate-900">
        {t('manage.settings.heading', 'Explorer settings')}
      </h2>
      <label className="flex min-h-[44px] cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          className="mt-1 h-5 w-5 accent-[#0252CD]"
          checked={enabled}
          disabled={!canEdit || isLoading}
          onChange={(e) => update({ allowUnitInquiries: e.target.checked })}
        />
        <span>
          <span className="block text-sm font-medium text-slate-900">
            {t('manage.settings.allowInquiries', 'Accept inquiries for units without a listing')}
          </span>
          <span className="block text-sm text-slate-600">
            {t(
              'manage.settings.allowInquiriesHint',
              'Buyers can contact you from the apartment drawer. Inquiries arrive in your inbox.'
            )}
          </span>
        </span>
      </label>
    </section>
  );
};
