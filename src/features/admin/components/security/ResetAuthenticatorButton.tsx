import React from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { useAppContext } from '@/context/AppContext';
import { resetUserAuthenticator } from '../../api/adminSecurityApi';
import { apiErrorMessage } from './codes';

interface ResetAuthenticatorButtonProps {
  userId: string;
  userRole: string;
}

/** Super admins: remove another admin's authenticator (lost phone); they set it up again. */
export const ResetAuthenticatorButton: React.FC<ResetAuthenticatorButtonProps> = ({ userId, userRole }) => {
  const { t } = useTranslation('admin');
  const { state } = useAppContext();
  const me = state.currentUser;
  const reset = useMutation({ mutationFn: () => resetUserAuthenticator(userId) });
  const isAdminTarget = userRole === 'admin' || userRole === 'super_admin';
  if (me?.role !== 'super_admin' || !isAdminTarget || (me.id ?? me._id) === userId) return null;

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => {
          if (window.confirm(t('security.resetConfirm', 'Remove this admin’s authenticator? They will set it up again before their next risky action.'))) reset.mutate();
        }}
        disabled={reset.isPending}
        className="min-h-[44px] rounded-lg border border-gray-300 bg-white px-4 text-sm"
      >
        {t('security.reset', 'Reset their authenticator (lost phone)')}
      </button>
      {reset.isSuccess && <p role="status" className="text-sm text-green-700">{t('security.resetDone', 'Done. They set it up again from Admin › Security.')}</p>}
      {reset.isError && <p role="alert" className="text-sm text-red-700">{apiErrorMessage(reset.error, t('security.resetError', 'Could not reset it.'))}</p>}
    </div>
  );
};
