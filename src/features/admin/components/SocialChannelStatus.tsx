import React from 'react';
import { useTranslation } from 'react-i18next';
import type { SocialChannel, SocialChannelResult } from '../api/adminApi';

interface SocialChannelStatusProps {
  channel: SocialChannel;
  result: SocialChannelResult;
}

const LABELS: Record<SocialChannel, string> = { facebookPage: 'Facebook Page', instagram: 'Instagram' };

/** One channel's outcome on an approved post: a link when live, the Graph API error when not. */
export const SocialChannelStatus: React.FC<SocialChannelStatusProps> = ({ channel, result }) => {
  const { t } = useTranslation(['admin']);
  if (result.state === 'not_sent') return null;

  if (result.state === 'posted') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-xs font-semibold">
        ✓ {LABELS[channel]}
        {result.postUrl && (
          <a href={result.postUrl} target="_blank" rel="noopener noreferrer" className="underline">
            {t('admin:socialShare.view', 'View')}
          </a>
        )}
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-700 text-xs font-semibold max-w-full"
      title={result.error}
    >
      ✕ {LABELS[channel]}
      <span className="font-normal truncate">{result.error}</span>
    </span>
  );
};

export const CHANNEL_LABELS = LABELS;
