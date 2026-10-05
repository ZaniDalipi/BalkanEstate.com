import React from 'react';
import { useTranslation } from 'react-i18next';
import { CloudArrowUpIcon, GlobeAltIcon } from '@/constants';
import type { FeedSourceType } from '../../types/propertyImports';

interface FeedSourcePickerProps {
  value: FeedSourceType;
  onChange: (next: FeedSourceType) => void;
}

/** Where listings come from: a URL fetched every day, or XML files uploaded by hand. */
const FeedSourcePicker: React.FC<FeedSourcePickerProps> = ({ value, onChange }) => {
  const { t } = useTranslation(['agencyDashboard']);
  const options: Array<{ id: FeedSourceType; icon: React.ReactNode; title: string; help: string }> = [
    {
      id: 'url',
      icon: <GlobeAltIcon className="w-5 h-5" />,
      title: t('agencyDashboard:imports.source.url', 'Feed URL'),
      help: t('agencyDashboard:imports.source.urlHelp', 'We fetch your website or CRM feed and sync it every 24 hours.'),
    },
    {
      id: 'upload',
      icon: <CloudArrowUpIcon className="w-5 h-5" />,
      title: t('agencyDashboard:imports.source.upload', 'Upload XML file'),
      help: t('agencyDashboard:imports.source.uploadHelp', 'Upload or paste an XML file whenever your listings change. No URL needed.'),
    },
  ];
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-gray-700">{t('agencyDashboard:imports.source.title', 'Where do your listings come from?')}</legend>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup">
        {options.map((o) => (
          <label
            key={o.id}
            className={`flex cursor-pointer gap-3 rounded-xl border p-3 transition-colors ${value === o.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:bg-gray-50'}`}
          >
            <input type="radio" name="feed-source" className="sr-only" checked={value === o.id} onChange={() => onChange(o.id)} />
            <span className={value === o.id ? 'text-indigo-600' : 'text-gray-400'}>{o.icon}</span>
            <span>
              <span className="block text-sm font-semibold text-gray-900">{o.title}</span>
              <span className="block text-xs text-gray-600">{o.help}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
};

export default FeedSourcePicker;
