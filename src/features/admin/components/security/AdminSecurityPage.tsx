import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminKeys } from '@/src/shared/query/queryKeys';
import { getAuthenticatorStatus } from '../../api/adminSecurityApi';
import { AuthenticatorSetup } from './AuthenticatorSetup';

const PROTECTED: Array<[string, string]> = [
  ['deletes', 'Deleting anything: users, listings, agencies, articles, codes…'],
  ['roles', 'Giving or removing roles (making someone admin or super admin also needs an emailed code)'],
  ['settings', 'Settings: system, site, alert emails, email templates'],
  ['payments', 'Subscriptions and payments: plans, listing limits, coupons, residence passes'],
];

/** Admin › Security: my authenticator app for confirming risky actions. */
export const AdminSecurityPage: React.FC = () => {
  const { t, i18n } = useTranslation('admin');
  const qc = useQueryClient();
  const status = useQuery({ queryKey: adminKeys.authenticator(), queryFn: getAuthenticatorStatus });
  const [replacing, setReplacing] = useState(false);
  const done = () => {
    setReplacing(false);
    void qc.invalidateQueries({ queryKey: adminKeys.authenticator() });
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-4 sm:px-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">{t('security.title', 'Security')}</h1>
        <p className="text-sm text-gray-600">{t('security.subtitle', 'Risky admin actions need a fresh code from an authenticator app on your phone.')}</p>
      </header>

      <section aria-labelledby="authenticator-heading" className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
        <h2 id="authenticator-heading" className="font-semibold text-gray-900">{t('security.authenticator', 'Authenticator app')}</h2>
        {status.isLoading ? (
          <div className="h-12 animate-pulse rounded-lg bg-gray-100" aria-busy="true" />
        ) : status.isError || !status.data ? (
          <p role="alert" className="text-sm text-red-700">
            {t('security.loadError', 'Could not load your security settings.')}{' '}
            <button type="button" onClick={() => void status.refetch()} className="min-h-[44px] font-semibold underline">{t('security.retry', 'Try again')}</button>
          </p>
        ) : status.data.enabled && !replacing ? (
          <div className="space-y-2">
            <p role="status" className="text-sm text-green-700">
              {t('security.on', {
                date: status.data.enabledAt ? new Date(status.data.enabledAt).toLocaleDateString(i18n.language, { dateStyle: 'medium' }) : '—',
                defaultValue: 'On since {{date}}.',
              })}
            </p>
            <button type="button" onClick={() => setReplacing(true)} className="min-h-[44px] rounded-lg border border-gray-300 bg-white px-4 text-sm">
              {t('security.replace', 'Move to a new phone')}
            </button>
            <p className="text-xs text-gray-500">{t('security.lostPhone', 'Lost your phone? Another super admin can reset it from “Edit user”.')}</p>
          </div>
        ) : (
          <AuthenticatorSetup onDone={done} />
        )}
      </section>

      <section aria-labelledby="protected-heading" className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 id="protected-heading" className="font-semibold text-gray-900">{t('security.protectedTitle', 'What asks for a code')}</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
          {PROTECTED.map(([key, text]) => <li key={key}>{t(`security.protected.${key}`, text)}</li>)}
        </ul>
      </section>
    </div>
  );
};
