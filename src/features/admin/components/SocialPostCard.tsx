import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { optimizeCloudinaryUrl } from '@/config/cloudinaryConfig';
import type { SocialChannel, SocialConfig, SocialPost } from '../api/adminApi';
import { SocialChannelStatus, CHANNEL_LABELS } from './SocialChannelStatus';

interface SocialPostCardProps {
  post: SocialPost;
  config: SocialConfig;
  busy: boolean;
  onApprove: (caption: string, channels: SocialChannel[]) => void;
  onReject: () => void;
  onRestore: () => void;
  onGroupShared: (shared: boolean) => void;
}

const CHANNELS: SocialChannel[] = ['facebookPage', 'instagram'];
const btn = 'inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50';

const SocialPostCard: React.FC<SocialPostCardProps> = ({
  post, config, busy, onApprove, onReject, onRestore, onGroupShared,
}) => {
  const { t } = useTranslation(['admin']);
  const configured = CHANNELS.filter((ch) => config[ch]);
  const [caption, setCaption] = useState(post.caption);
  const [channels, setChannels] = useState<SocialChannel[]>(configured);
  const failed = CHANNELS.filter((ch) => post.channels[ch]?.state === 'failed' && config[ch]);
  const image = post.imageUrls[0];

  const toggle = (ch: SocialChannel) =>
    setChannels((prev) => (prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]));

  // Copy first, then open the group in the same click so the popup isn't blocked.
  const shareToGroup = () => {
    navigator.clipboard?.writeText(post.caption).catch(() => undefined);
    if (config.facebookGroupUrl) window.open(config.facebookGroupUrl, '_blank', 'noopener,noreferrer');
    onGroupShared(true);
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3 p-3 bg-white border border-gray-200 rounded-xl">
      <a href={post.listingUrl} target="_blank" rel="noopener noreferrer"
        className="w-full sm:w-32 h-32 rounded-lg bg-neutral-100 flex-shrink-0 overflow-hidden">
        {image && (
          <img src={optimizeCloudinaryUrl(image, { width: 256, quality: 'auto', crop: 'fill' })}
            alt={post.title || 'Listing'} loading="lazy" className="w-full h-full object-cover" />
        )}
      </a>

      <div className="flex-1 min-w-0 space-y-2">
        <div>
          <a href={post.listingUrl} target="_blank" rel="noopener noreferrer"
            className="font-semibold text-gray-900 hover:underline block truncate">
            {post.title || t('admin:socialShare.untitled', 'Untitled listing')}
          </a>
          <p className="text-xs text-gray-500">
            {post.city}{post.price ? ` · €${post.price.toLocaleString()}` : ''} · {new Date(post.createdAt).toLocaleDateString()}
          </p>
        </div>

        {post.status === 'pending' ? (
          <textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={8} maxLength={2200}
            aria-label={t('admin:socialShare.caption', 'Caption')}
            className="w-full text-sm border border-gray-300 rounded-lg p-2 font-sans focus:ring-2 focus:ring-blue-500 focus:outline-none" />
        ) : (
          <p className="text-sm text-gray-700 whitespace-pre-line line-clamp-4">{post.caption}</p>
        )}

        {post.status === 'pending' && configured.length > 0 && (
          <div className="flex flex-wrap gap-3 text-sm">
            {configured.map((ch) => (
              <label key={ch} className="inline-flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={channels.includes(ch)} onChange={() => toggle(ch)} />
                {CHANNEL_LABELS[ch]}
              </label>
            ))}
          </div>
        )}

        {post.status === 'approved' && (
          <div className="flex flex-wrap gap-1.5">
            {CHANNELS.map((ch) => <SocialChannelStatus key={ch} channel={ch} result={post.channels[ch]} />)}
            {post.groupSharedAt && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
                ✓ {t('admin:socialShare.sharedToGroup', 'Shared to group')} {new Date(post.groupSharedAt).toLocaleDateString()}
                <button onClick={() => onGroupShared(false)} className="underline font-normal" disabled={busy}>
                  {t('admin:socialShare.undo', 'Undo')}
                </button>
              </span>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {post.status === 'pending' && (
            <>
              <button onClick={() => onApprove(caption, channels)} disabled={busy || !caption.trim()}
                className={`${btn} bg-green-600 text-white hover:bg-green-700`}>
                {channels.length > 0
                  ? t('admin:socialShare.approveAndPost', 'Approve & post')
                  : t('admin:socialShare.approve', 'Approve')}
              </button>
              <button onClick={onReject} disabled={busy} className={`${btn} bg-red-100 text-red-700 hover:bg-red-200`}>
                {t('admin:socialShare.skip', 'Skip')}
              </button>
            </>
          )}
          {post.status === 'approved' && (
            <>
              <button onClick={shareToGroup} disabled={busy} className={`${btn} bg-blue-600 text-white hover:bg-blue-700`}>
                {config.facebookGroupUrl
                  ? t('admin:socialShare.copyAndOpenGroup', 'Copy text & open group')
                  : t('admin:socialShare.copyForGroup', 'Copy text for group')}
              </button>
              {failed.length > 0 && (
                <button onClick={() => onApprove(post.caption, failed)} disabled={busy}
                  className={`${btn} bg-amber-100 text-amber-800 hover:bg-amber-200`}>
                  {t('admin:socialShare.retryFailed', 'Retry failed')}
                </button>
              )}
            </>
          )}
          {post.status === 'rejected' && (
            <button onClick={onRestore} disabled={busy} className={`${btn} bg-gray-100 text-gray-700 hover:bg-gray-200`}>
              {t('admin:socialShare.restore', 'Move back to pending')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SocialPostCard;
