import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import Modal from '@/src/shared/components/ui/Modal';
import type { EmailCodeSent } from '../../api/adminSecurityApi';
import { CodeField } from './CodeField';
import { apiErrorMessage, isCompleteCode } from './codes';

interface EmailCodeDialogProps {
  title: string;
  /** What the code approves, in plain words. */
  action: string;
  /** Asks the server to email a code. */
  requestCode: () => Promise<EmailCodeSent>;
  /** Runs the action with the code. The authenticator prompt follows on its own. */
  onConfirm: (confirmation: { challengeId: string; emailCode: string }) => Promise<unknown>;
  onClose: () => void;
}

/** Email a code to me, then confirm the action with it. */
export const EmailCodeDialog: React.FC<EmailCodeDialogProps> = ({ title, action, requestCode, onConfirm, onClose }) => {
  const { t } = useTranslation('admin');
  const send = useMutation({ mutationFn: () => requestCode() });
  const confirm = useMutation({ mutationFn: (v: { challengeId: string; emailCode: string }) => onConfirm(v), onSuccess: onClose });
  const [code, setCode] = useState('');
  const sent = send.data;

  return (
    <Modal isOpen onClose={onClose} title={title} size="md">
      <div className="space-y-4">
        <p className="text-sm text-gray-700">{action}</p>
        {!sent ? (
          <>
            <p className="text-sm text-gray-600">{t('emailCode.why', 'For safety we email you a one-time code to confirm this.')}</p>
            {send.isError && <p role="alert" className="text-sm text-red-700">{apiErrorMessage(send.error, t('emailCode.sendError', 'Could not send the code.'))}</p>}
            <button type="button" onClick={() => send.mutate()} disabled={send.isPending} className="min-h-[44px] rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
              {send.isPending ? t('emailCode.sending', 'Sending…') : t('emailCode.send', 'Email me a code')}
            </button>
          </>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (isCompleteCode(code)) confirm.mutate({ challengeId: sent.challengeId, emailCode: code });
            }}
          >
            <CodeField
              label={t('emailCode.label', { to: sent.sentTo, defaultValue: 'Code we emailed to {{to}}' })}
              hint={t('emailCode.hint', 'It works once and expires in 10 minutes. Your authenticator code is asked for next.')}
              value={code}
              onChange={setCode}
              autoFocus
              error={confirm.isError ? apiErrorMessage(confirm.error, t('emailCode.confirmError', 'That did not work.')) : null}
            />
            <div className="flex flex-wrap gap-2">
              <button type="submit" disabled={confirm.isPending || !isCompleteCode(code)} className="min-h-[44px] rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                {confirm.isPending ? t('emailCode.confirming', 'Confirming…') : t('emailCode.confirm', 'Confirm')}
              </button>
              <button type="button" onClick={() => { setCode(''); send.mutate(); }} disabled={send.isPending} className="min-h-[44px] rounded-lg border border-gray-300 bg-white px-4 text-sm">
                {t('emailCode.resend', 'Send a new code')}
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};
