import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { confirmAuthenticatorSetup, startAuthenticatorSetup } from '../../api/adminSecurityApi';
import { CodeField } from './CodeField';
import { QrCode } from './QrCode';
import { apiErrorCode, apiErrorMessage, isCompleteCode } from './codes';

interface AuthenticatorSetupProps {
  /** Called once the authenticator is on. */
  onDone: () => void;
}

/**
 * Turn on the authenticator app: scan the QR code (or type the key), then
 * confirm with the code we email you and the first code the app shows.
 */
export const AuthenticatorSetup: React.FC<AuthenticatorSetupProps> = ({ onDone }) => {
  const { t } = useTranslation('admin');
  const start = useMutation({ mutationFn: () => startAuthenticatorSetup() });
  const confirm = useMutation({
    mutationFn: (v: { challengeId: string; emailCode: string; appCode: string }) => confirmAuthenticatorSetup(v),
    onSuccess: onDone,
  });
  const [emailCode, setEmailCode] = useState('');
  const [appCode, setAppCode] = useState('');
  const setup = start.data;

  if (!setup) {
    return (
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => start.mutate()}
          disabled={start.isPending}
          className="min-h-[44px] rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {start.isPending ? t('security.starting', 'Starting…') : t('security.start', 'Set up authenticator app')}
        </button>
        {start.isError && <p role="alert" className="text-sm text-red-700">{apiErrorMessage(start.error, t('security.startError', 'Could not start the setup.'))}</p>}
      </div>
    );
  }

  const confirmError = confirm.isError ? apiErrorMessage(confirm.error, t('security.confirmError', 'Could not turn it on.')) : null;
  const emailWrong = apiErrorCode(confirm.error)?.startsWith('EMAIL_CODE');

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (isCompleteCode(emailCode) && isCompleteCode(appCode)) confirm.mutate({ challengeId: setup.challengeId, emailCode, appCode });
      }}
    >
      <ol className="list-decimal space-y-3 pl-5 text-sm text-gray-700">
        <li>
          {t('security.step1', 'Open Google Authenticator, Authy, 1Password or Microsoft Authenticator and scan this code.')}
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
            <QrCode value={setup.otpauthUri} label={t('security.qrLabel', 'QR code for your authenticator app')} />
            <div className="text-xs text-gray-600">
              <p>{t('security.manualKey', 'Can’t scan? Enter this key in the app:')}</p>
              <code className="mt-1 block break-all rounded bg-white px-2 py-1 font-mono text-sm text-gray-900 ring-1 ring-gray-200">{setup.secret.replace(/(.{4})/g, '$1 ').trim()}</code>
              <a href={setup.otpauthUri} className="mt-2 inline-flex min-h-[44px] items-center font-semibold text-blue-700 underline sm:hidden">
                {t('security.openInApp', 'Open in authenticator app')}
              </a>
            </div>
          </div>
        </li>
        <li>
          <CodeField
            label={t('security.emailCode', { to: setup.sentTo, defaultValue: 'Code we emailed to {{to}}' })}
            value={emailCode}
            onChange={setEmailCode}
            error={emailWrong ? confirmError : null}
          />
        </li>
        <li>
          <CodeField
            label={t('security.appCode', 'The 6-digit code the app shows now')}
            value={appCode}
            onChange={setAppCode}
            error={confirmError && !emailWrong ? confirmError : null}
          />
        </li>
      </ol>
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={confirm.isPending || !isCompleteCode(emailCode) || !isCompleteCode(appCode)}
          className="min-h-[44px] rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {confirm.isPending ? t('security.confirming', 'Checking…') : t('security.confirm', 'Turn on')}
        </button>
        <button type="button" onClick={() => start.mutate()} disabled={start.isPending} className="min-h-[44px] rounded-lg border border-gray-300 bg-white px-4 text-sm">
          {t('security.restart', 'Start over (new QR code and email)')}
        </button>
      </div>
    </form>
  );
};
