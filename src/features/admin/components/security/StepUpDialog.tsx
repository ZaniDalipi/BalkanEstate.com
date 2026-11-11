import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '@/src/shared/components/ui/Modal';
import type { StepUpRequest } from '@/src/shared/api/adminStepUp';
import { AuthenticatorSetup } from './AuthenticatorSetup';
import { CodeField } from './CodeField';
import { isCompleteCode } from './codes';

interface StepUpDialogProps {
  request: StepUpRequest;
  onSubmit: (code: string) => void;
  onCancel: () => void;
}

/**
 * Asks for the authenticator code before a risky admin action goes through.
 * With no authenticator yet, it walks through setting one up first.
 */
export const StepUpDialog: React.FC<StepUpDialogProps> = ({ request, onSubmit, onCancel }) => {
  const { t } = useTranslation('admin');
  const [code, setCode] = useState('');
  const [justSetUp, setJustSetUp] = useState(false);
  const needsSetup = request.reason === 'STEP_UP_SETUP_REQUIRED' && !justSetUp;

  return (
    <Modal isOpen onClose={onCancel} title={t('stepUp.title', 'Confirm with your authenticator')} size="md">
      {needsSetup ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            {t('stepUp.setupFirst', 'Deleting, changing roles, settings, subscriptions and payments need a code from an authenticator app. Set it up once, then confirm this action.')}
          </p>
          <AuthenticatorSetup onDone={() => setJustSetUp(true)} />
        </div>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (isCompleteCode(code)) onSubmit(code);
          }}
        >
          <p className="text-sm text-gray-700">
            {justSetUp
              ? t('stepUp.afterSetup', 'Your authenticator is on. Wait for the app to show the next code, then enter it to finish this action.')
              : t('stepUp.body', 'This action needs the 6-digit code from your authenticator app.')}
          </p>
          <CodeField
            label={t('stepUp.codeLabel', 'Authenticator code')}
            value={code}
            onChange={setCode}
            autoFocus
            error={request.reason === 'STEP_UP_INVALID' ? request.message || t('stepUp.invalid', 'That code is not right or was already used. Try the next one.') : null}
          />
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={!isCompleteCode(code)} className="min-h-[44px] rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
              {t('stepUp.confirm', 'Confirm')}
            </button>
            <button type="button" onClick={onCancel} className="min-h-[44px] rounded-lg border border-gray-300 bg-white px-4 text-sm">
              {t('stepUp.cancel', 'Cancel')}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};
