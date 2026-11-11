import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/context/AppContext';
import { useSuperAdminClaim } from '../../hooks/useSuperAdminClaim';

/**
 * Shown to an admin only while the site has no super admin: one click (and a
 * confirmation) makes them the first one. After that, super admins give the
 * role to others from the user editor.
 */
export const ClaimSuperAdminCard: React.FC = () => {
  const { t } = useTranslation('admin');
  const { state } = useAppContext();
  const isAdmin = state.currentUser?.role === 'admin';
  const { status, claim } = useSuperAdminClaim(isAdmin);
  const [confirming, setConfirming] = useState(false);

  if (claim.isSuccess) {
    return (
      <p role="status" className="mx-6 mt-4 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
        {t('superAdminClaim.done', 'You are now super admin. You can make other people admin or super admin from “Edit user”.')}
      </p>
    );
  }
  if (!isAdmin || !status.data?.canClaim) return null;

  const failure = claim.error instanceof Error ? claim.error.message : null;

  return (
    <section aria-labelledby="claim-super-admin" className="mx-6 mt-4 rounded-lg border border-indigo-200 bg-indigo-50 p-4">
      <h3 id="claim-super-admin" className="font-semibold text-indigo-900">
        {t('superAdminClaim.title', 'This site has no super admin yet')}
      </h3>
      <p className="mt-1 text-sm text-indigo-800">
        {t('superAdminClaim.body', 'A super admin can make other people admin or super admin. Only one admin can claim this, and only once; after that, super admins give the role from “Edit user”.')}
      </p>
      {failure && <p role="alert" className="mt-2 text-sm text-red-700">{failure}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        {confirming ? (
          <>
            <button
              type="button"
              onClick={() => claim.mutate()}
              disabled={claim.isPending}
              className="min-h-[44px] rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {claim.isPending ? t('superAdminClaim.working', 'Working…') : t('superAdminClaim.confirm', 'Yes, make me super admin')}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={claim.isPending}
              className="min-h-[44px] rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700"
            >
              {t('superAdminClaim.cancel', 'Cancel')}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="min-h-[44px] rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            {t('superAdminClaim.claim', 'Become super admin')}
          </button>
        )}
      </div>
    </section>
  );
};
