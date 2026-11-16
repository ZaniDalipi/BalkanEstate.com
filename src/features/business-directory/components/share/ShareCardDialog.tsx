import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import { XMarkIcon } from '@/constants';
import { useEscapeLayer } from '@/src/features/developments/components/public/explorer/useEscapeLayer';
import type { BusinessListing } from '@/src/shared/types/businessListing.types';
import { useShareCard } from '../../hooks/useShareCard';
import SocialShareRow from './SocialShareRow';

interface ShareCardDialogProps {
  listing: BusinessListing;
  onClose: () => void;
  /** Copies text and confirms it (the page's toast). */
  onCopy: (text: string, okText?: string) => void;
}

const BUTTON = 'inline-flex min-h-[48px] flex-1 items-center justify-center rounded-full px-5 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50';

/**
 * Share a listing as a card: a badge image with a QR code to its page here.
 * Phones get the share sheet with the image attached; everyone can save the
 * image, post the link to a network, or copy it.
 */
const ShareCardDialog: React.FC<ShareCardDialogProps> = ({ listing, onClose, onCopy }) => {
  const { t } = useTranslation('businessDirectory');
  const reduceMotion = useReducedMotion();
  const panel = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const { state, url, text, canShareFile, shareFile, download, retry } = useShareCard(listing, true);
  useEscapeLayer(panel, onClose);
  useEffect(() => { closeButton.current?.focus(); }, []);

  return createPortal(
    <div className="fixed inset-0 z-[5000] flex items-end justify-center bg-slate-900/30 p-0 backdrop-blur-[3px] sm:items-center sm:p-4" onClick={onClose}>
      <motion.div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-card-title"
        className="liquid-surface !bg-white/85 dialog-fit max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-[28px] p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:rounded-[28px]"
        onClick={(e) => e.stopPropagation()}
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="share-card-title" className="text-lg font-bold text-neutral-900">{t('shareCard.title', 'Share as a card')}</h2>
            <p className="text-sm text-neutral-500">{t('shareCard.subtitle', 'A card with a QR code that opens this page on BalkanEstate.')}</p>
          </div>
          <button ref={closeButton} type="button" onClick={onClose} aria-label={t('shareCard.close', 'Close')} className="liquid-control flex h-11 w-11 shrink-0 items-center justify-center rounded-full">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="liquid-control mx-auto mb-4 aspect-[4/5] w-full max-w-[280px] overflow-hidden rounded-2xl p-1.5">
          {state.status === 'ready' && <img src={state.previewUrl} alt={t('shareCard.preview', 'Share card for {{name}}', { name: listing.name })} className="h-full w-full rounded-xl object-cover" />}
          {state.status === 'making' && <div className="h-full w-full animate-pulse rounded-xl bg-white/60" role="status" aria-label={t('shareCard.making', 'Making the card…')} />}
          {state.status === 'error' && (
            <div role="alert" className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-sm text-neutral-600">
              {t('shareCard.failed', 'The card couldn’t be made. You can still share the link below.')}
              <button type="button" onClick={retry} className="liquid-control min-h-[44px] rounded-full px-4 font-semibold text-primary">{t('shareCard.retry', 'Try again')}</button>
            </div>
          )}
        </div>

        <div className="mb-5 flex gap-2">
          {canShareFile && (
            <button type="button" onClick={shareFile} className={`${BUTTON} liquid-tint`}>{t('shareCard.share', 'Share card')}</button>
          )}
          <button type="button" onClick={download} disabled={state.status !== 'ready'} className={`${BUTTON} ${canShareFile ? 'liquid-control text-neutral-800' : 'liquid-tint'}`}>
            {t('shareCard.download', 'Download image')}
          </button>
        </div>

        <SocialShareRow url={url} text={text} onCopy={() => onCopy(url, t('detail.linkCopied', 'Link copied to clipboard!'))} />
      </motion.div>
    </div>,
    document.body,
  );
};

export default ShareCardDialog;
