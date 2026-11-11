import React from 'react';
import { useTranslation } from 'react-i18next';
import { useCopyText } from '@/src/shared/hooks/useCopyText';
import { FEED_TEMPLATES, type FeedTemplateFormat } from '../../feedTemplate/feedTemplates';
import { downloadTextFile } from '../../utils/downloadTextFile';

const FORMATS = Object.keys(FEED_TEMPLATES) as FeedTemplateFormat[];
const btn = 'min-h-[44px] px-3 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50';

interface FeedTemplateViewerProps {
  format: FeedTemplateFormat;
  onFormatChange: (format: FeedTemplateFormat) => void;
}

/** The feed template in JSON or XML, ready to copy or download. */
const FeedTemplateViewer: React.FC<FeedTemplateViewerProps> = ({ format, onFormatChange }) => {
  const { t } = useTranslation(['listingFeeds']);
  const { copied, failed, copy } = useCopyText();
  const template = FEED_TEMPLATES[format];

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 bg-gray-50 px-3 py-2 border-b border-gray-200">
        <div role="tablist" aria-label={t('listingFeeds:guide.formatLabel', { defaultValue: 'Feed format' })} className="flex gap-1">
          {FORMATS.map((f) => (
            <button
              key={f}
              type="button"
              role="tab"
              id={`feed-template-tab-${f}`}
              aria-selected={format === f}
              aria-controls="feed-template-panel"
              onClick={() => onFormatChange(f)}
              className={`min-h-[44px] px-4 rounded-lg text-sm font-semibold ${format === f ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-800'}`}
            >
              {FEED_TEMPLATES[f].label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button type="button" className={btn} onClick={() => void copy(format, template.text)}>
            {copied === format
              ? t('listingFeeds:guide.copied', { defaultValue: 'Copied' })
              : t('listingFeeds:guide.copy', { defaultValue: 'Copy' })}
          </button>
          <button
            type="button"
            className={btn}
            onClick={() => downloadTextFile(template.fileName, template.text, template.mimeType)}
          >
            {t('listingFeeds:guide.download', { defaultValue: 'Download' })}
          </button>
        </div>
      </div>
      {failed && (
        <p role="alert" className="px-3 py-2 text-xs text-red-700 bg-red-50">
          {t('listingFeeds:guide.copyFailed', { defaultValue: "Couldn't copy — select the text and copy it by hand." })}
        </p>
      )}
      <pre
        id="feed-template-panel"
        role="tabpanel"
        aria-labelledby={`feed-template-tab-${format}`}
        tabIndex={0}
        className="max-h-72 overflow-auto p-3 text-xs leading-relaxed font-mono text-gray-800 bg-white"
      >
        <code>{template.text}</code>
      </pre>
    </div>
  );
};

export default FeedTemplateViewer;
