import React from 'react';
import { useTranslation } from 'react-i18next';
import { socialShareLinks } from '../../utils/shareCard/socialShareLinks';

interface SocialShareRowProps {
  url: string;
  text: string;
  onCopy: () => void;
}

const PILL = 'liquid-control inline-flex min-h-[44px] items-center justify-center rounded-full px-4 text-sm font-semibold text-neutral-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary';

/** One tap to each network's share composer with the listing's link, plus Copy link. */
const SocialShareRow: React.FC<SocialShareRowProps> = ({ url, text, onCopy }) => {
  const { t } = useTranslation('businessDirectory');
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
        {t('shareCard.shareLink', 'Share the link')}
      </p>
      <ul className="flex flex-wrap gap-2">
        {socialShareLinks(url, text).map((link) => (
          <li key={link.id}>
            <a href={link.href} target="_blank" rel="noopener noreferrer" className={PILL}>{link.label}</a>
          </li>
        ))}
        <li>
          <button type="button" onClick={onCopy} className={PILL}>{t('shareCard.copyLink', 'Copy link')}</button>
        </li>
      </ul>
    </div>
  );
};

export default SocialShareRow;
