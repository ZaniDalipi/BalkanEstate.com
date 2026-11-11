import React, { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCopyText } from '@/src/shared/hooks/useCopyText';
import { FEED_TEMPLATES, type FeedTemplateFormat } from '../../feedTemplate/feedTemplates';
import FeedFieldGroups from './FeedFieldGroups';
import FeedTemplateViewer from './FeedTemplateViewer';

interface FeedFormatGuideProps {
  open: boolean;
  onToggle: () => void;
}

const BRIEF =
  "Hi, we'd like to show our property listings on BalkanEstate. Could you publish all our current listings at a fixed web address " +
  '(for example https://our-site.com/feed.json), kept up to date when a listing changes, in the format below? Needed for each listing: ' +
  'id, title, price, city (or address) and photo links. Also helpful: bedrooms, bathrooms, area in m², latitude/longitude, property type, and sale or rent. ' +
  'The format is the standard schema.org RealEstateListing.';

/**
 * "Don't have a feed yet?" — the feed format our importer reads, as a
 * template to copy or download, what each listing needs, tips, and a ready
 * request to send the agency's web developer.
 */
const FeedFormatGuide: React.FC<FeedFormatGuideProps> = ({ open, onToggle }) => {
  const { t } = useTranslation(['listingFeeds']);
  const panelId = useId();
  const { copied, failed, copy } = useCopyText();
  const [format, setFormat] = useState<FeedTemplateFormat>('json');
  const brief = `${t('listingFeeds:guide.brief', { defaultValue: BRIEF })}\n\n${FEED_TEMPLATES[format].text}`;

  return (
    <section className="rounded-xl border border-blue-100 bg-blue-50/40">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
        className="w-full min-h-[44px] px-4 py-3 flex items-center justify-between gap-3 text-left"
      >
        <span className="text-sm font-semibold text-blue-900">
          {t('listingFeeds:guide.toggle', { defaultValue: "Don't have a feed yet? See the format we read" })}
        </span>
        <span aria-hidden="true" className={`text-blue-700 transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>
      {open && (
        <div id={panelId} className="px-4 pb-4 space-y-4">
          <p className="text-sm text-gray-700">
            {t('listingFeeds:guide.intro', {
              defaultValue: 'Publish your listings at a fixed web address as JSON or XML in this shape, and every field goes straight into your listings here.',
            })}
          </p>
          <FeedTemplateViewer format={format} onFormatChange={setFormat} />
          <FeedFieldGroups format={format} />
          <div className="rounded-lg bg-white border border-gray-200 p-3 flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm text-gray-700">
              {t('listingFeeds:guide.developerTitle', { defaultValue: 'Someone else runs your website?' })}
            </span>
            <button
              type="button"
              onClick={() => void copy('brief', brief)}
              className="min-h-[44px] px-4 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-dark"
            >
              {copied === 'brief'
                ? t('listingFeeds:guide.developerCopied', { defaultValue: 'Copied — paste it in an email' })
                : t('listingFeeds:guide.developerCopy', { defaultValue: 'Copy a request for your web developer' })}
            </button>
            {failed && (
              <p role="alert" className="w-full text-xs text-red-700">
                {t('listingFeeds:guide.copyFailed', { defaultValue: "Couldn't copy — select the text and copy it by hand." })}
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

export default FeedFormatGuide;
