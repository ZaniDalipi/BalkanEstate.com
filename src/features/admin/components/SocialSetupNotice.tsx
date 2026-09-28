import React from 'react';
import { useTranslation } from 'react-i18next';
import type { SocialConfig } from '../api/adminApi';

interface SocialSetupNoticeProps {
  config: SocialConfig;
}

/** Which accounts are connected, and what's still missing, so approving never silently posts nowhere. */
const SocialSetupNotice: React.FC<SocialSetupNoticeProps> = ({ config }) => {
  const { t } = useTranslation(['admin']);
  const rows = [
    { label: 'Facebook Page', ok: config.facebookPage },
    { label: 'Instagram', ok: config.instagram },
    { label: t('admin:socialShare.facebookGroup', 'Facebook group link'), ok: Boolean(config.facebookGroupUrl) },
  ];
  const allSet = rows.every((r) => r.ok);

  return (
    <div className={`p-3 rounded-lg text-sm border ${allSet ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {rows.map((r) => (
          <span key={r.label} className={r.ok ? 'text-green-700' : 'text-amber-800'}>
            {r.ok ? '✓' : '○'} {r.label}{' '}
            <span className="opacity-70">
              {r.ok ? t('admin:socialShare.connected', 'connected') : t('admin:socialShare.notConnected', 'not set up')}
            </span>
          </span>
        ))}
      </div>
      {!allSet && (
        <p className="text-amber-800 mt-1.5">
          {t(
            'admin:socialShare.setupHint',
            'Missing accounts are set up on the server (see docs/SOCIAL_SHARING.md). Until then, approve posts and share them to the group by hand.'
          )}
        </p>
      )}
      <p className="text-gray-600 mt-1.5">
        {t(
          'admin:socialShare.groupHint',
          'Facebook does not allow apps to post in groups. "Copy text & open group" copies the post so you can paste it in.'
        )}
      </p>
    </div>
  );
};

export default SocialSetupNotice;
