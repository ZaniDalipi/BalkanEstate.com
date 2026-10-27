import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Share2 } from 'lucide-react';
import { API_URL } from '@/src/shared/api/config';
import { getCurrentLanguageFromUrl } from '@/src/utils/languageRouting';
import { residenceShareLinks } from '../../../utils/residenceShare';
import { ShareResidenceDialog } from './ShareResidenceDialog';

interface ShareResidenceButtonProps {
  slug: string;
  name: string;
  place: string;
}

/**
 * Share the residence: the phone's own share sheet where there is one,
 * otherwise a window with the link's preview card and the usual places.
 */
export const ShareResidenceButton: React.FC<ShareResidenceButtonProps> = ({ slug, name, place }) => {
  const { t } = useTranslation('developments');
  const [open, setOpen] = useState(false);
  const links = residenceShareLinks(window.location.origin, getCurrentLanguageFromUrl(), slug, API_URL);
  const text = place
    ? t('share.text', { name, place, defaultValue: '{{name}} – new homes in {{place}}' })
    : name;

  const share = async () => {
    const canShare = typeof navigator.share === 'function' && window.matchMedia?.('(pointer: coarse)').matches;
    if (!canShare) {
      setOpen(true);
      return;
    }
    try {
      await navigator.share({ title: name, text, url: links.pageUrl });
    } catch (err) {
      // Cancelling the sheet is not an error; anything else falls back to the window.
      if ((err as { name?: string })?.name !== 'AbortError') setOpen(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => void share()}
        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <Share2 className="h-4 w-4" aria-hidden="true" />
        {t('share.button', 'Share')}
      </button>
      {open && <ShareResidenceDialog name={name} text={text} links={links} onClose={() => setOpen(false)} />}
    </>
  );
};
