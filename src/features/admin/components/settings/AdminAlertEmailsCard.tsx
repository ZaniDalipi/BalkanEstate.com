import React from 'react';
import { useTranslation } from 'react-i18next';
import type { AlertRecipientSource } from '../../api/adminAlertSettingsApi';
import { useAdminAlertSettings } from '../../hooks/useAdminAlertSettings';
import { AlertEmailsEditor } from './AlertEmailsEditor';

const SOURCE_LABEL: Record<AlertRecipientSource, string> = {
  panel: 'from the list below',
  env: 'from the server setting (ADMIN_NOTIFICATION_EMAILS)',
  admins: 'every admin account, because no list is set',
  none: 'nobody: add an address below',
};

const errorText = (err: unknown): string | null => (err instanceof Error && err.message ? err.message : null);

/**
 * Admin › Settings › Notifications: who gets the admin alert emails (new
 * users, new listings, admin role changes). Super admins edit the list;
 * any admin can see it and send a test email.
 */
export const AdminAlertEmailsCard: React.FC = () => {
  const { t } = useTranslation('admin');
  const { settings, save, test } = useAdminAlertSettings();
  const data = settings.data;

  return (
    <section aria-labelledby="admin-alert-emails" className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div>
        <h3 id="admin-alert-emails" className="font-medium text-gray-900">{t('adminAlerts.title', 'Admin alert emails')}</h3>
        <p className="text-sm text-gray-500">
          {t('adminAlerts.subtitle', 'Who gets an email for new users, new listings and admin role changes. Admins also see them in the notification bell.')}
        </p>
      </div>

      {settings.isLoading ? (
        <div className="h-16 animate-pulse rounded-lg bg-gray-200" aria-busy="true" />
      ) : settings.isError || !data ? (
        <p role="alert" className="text-sm text-red-700">
          {t('adminAlerts.loadError', 'Could not load the alert settings.')}{' '}
          <button type="button" onClick={() => void settings.refetch()} className="min-h-[44px] font-semibold underline">
            {t('adminAlerts.retry', 'Try again')}
          </button>
        </p>
      ) : (
        <>
          {data.disabled && (
            <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
              {t('adminAlerts.disabled', 'Admin alerts are turned off on the server (ADMIN_NOTIFICATIONS=off). Nothing is sent until that is removed.')}
            </p>
          )}
          <p className="text-sm text-gray-700">
            {data.recipients.length > 0
              ? t('adminAlerts.sendingTo', { list: data.recipients.join(', '), defaultValue: 'Sending to: {{list}}' })
              : t('adminAlerts.sendingToNobody', 'Not sending any emails yet.')}{' '}
            <span className="text-gray-500">({t(`adminAlerts.source.${data.source}`, SOURCE_LABEL[data.source])})</span>
          </p>

          {data.canEdit ? (
            <AlertEmailsEditor
              key={data.emails.join(',')}
              saved={data.emails}
              max={data.maxEmails}
              saving={save.isPending}
              saveError={save.isError ? errorText(save.error) ?? t('adminAlerts.saveError', 'Could not save the addresses.') : null}
              onSave={(emails) => save.mutate(emails)}
            />
          ) : (
            <p className="text-sm text-gray-500">{t('adminAlerts.superAdminOnly', 'Only a super admin can change who gets these emails.')}</p>
          )}

          <div className="flex flex-wrap items-center gap-3 border-t border-gray-200 pt-3">
            <button
              type="button"
              onClick={() => test.mutate()}
              disabled={test.isPending || data.recipients.length === 0}
              className="min-h-[44px] rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
            >
              {test.isPending ? t('adminAlerts.testing', 'Sending…') : t('adminAlerts.test', 'Send test email')}
            </button>
            {test.isSuccess && (
              <p role="status" className="text-sm text-green-700">
                {t('adminAlerts.testSent', { list: test.data.sent.join(', '), defaultValue: 'Test email sent to {{list}}. Check the inbox (and spam).' })}
                {test.data.failed.length > 0 &&
                  ` ${t('adminAlerts.testFailed', { list: test.data.failed.join(', '), defaultValue: 'Could not send to {{list}}.' })}`}
              </p>
            )}
            {test.isError && <p role="alert" className="text-sm text-red-700">{errorText(test.error)}</p>}
          </div>
        </>
      )}
    </section>
  );
};
