import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '@/src/shared/components/ui/Modal';
import { SocialShare } from '@/src/components/marketing/SocialShare';
import type { ResidenceShareLinks } from '../../../utils/residenceShare';

interface ShareResidenceDialogProps {
  name: string;
  text: string;
  links: ResidenceShareLinks;
  onClose: () => void;
}

/**
 * "Share this residence": the card the link shows in feeds (the residence
 * with its buildings marked), then the places to post it and copy-link.
 */
export const ShareResidenceDialog: React.FC<ShareResidenceDialogProps> = ({ name, text, links, onClose }) => {
  const { t } = useTranslation('developments');
  const [cardFailed, setCardFailed] = useState(false);
  return (
    <Modal isOpen onClose={onClose} title={t('share.title', 'Share this residence')} size="lg">
      <div className="space-y-4">
        {!cardFailed && (
          <figure className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
            <img
              src={links.cardUrl}
              alt={t('share.previewAlt', { name, defaultValue: '{{name}} with its buildings marked, as it shows when shared' })}
              width={1200}
              height={630}
              loading="lazy"
              onError={() => setCardFailed(true)}
              className="aspect-[1200/630] w-full object-cover"
            />
            <figcaption className="px-3 py-2 text-xs text-slate-600">
              {t('share.hint', 'Posted on social media, the link shows this picture.')}
            </figcaption>
          </figure>
        )}
        <SocialShare
          url={links.pageUrl}
          title={text}
          variant="buttons"
          platforms={['whatsapp', 'facebook', 'linkedin', 'twitter', 'telegram', 'email', 'copy']}
        />
      </div>
    </Modal>
  );
};
