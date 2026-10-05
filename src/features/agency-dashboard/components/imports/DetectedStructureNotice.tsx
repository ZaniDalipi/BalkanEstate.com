import React from 'react';
import { useTranslation } from 'react-i18next';
import { LightBulbIcon } from '@/constants';
import type { DetectedStructure, FeedMappingConfig } from '../../types/propertyImports';

interface DetectedStructureNoticeProps {
  detected: DetectedStructure;
  applying: boolean;
  onApply: (mapping: FeedMappingConfig) => void;
  onReview: (mapping: FeedMappingConfig) => void;
}

const KEY_FIELDS = ['externalId', 'title', 'price', 'city', 'listingType', 'propertyType', 'area', 'images'];

/** "Your file uses <property>": the detected layout and a mapping to import it. */
const DetectedStructureNotice: React.FC<DetectedStructureNoticeProps> = ({ detected, applying, onApply, onReview }) => {
  const { t } = useTranslation(['agencyDashboard']);
  const { fields } = detected.suggestedMapping;
  const missing = KEY_FIELDS.filter((f) => !fields[f]);

  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 space-y-3 text-sm">
      <div className="flex gap-2">
        <LightBulbIcon className="w-5 h-5 shrink-0 text-indigo-600" />
        <p className="text-gray-900">
          <span className="font-semibold">
            {t('agencyDashboard:imports.detect.title', 'Your file uses a different layout.')}
          </span>{' '}
          {t('agencyDashboard:imports.detect.found', 'Each property is a <{{element}}> element ({{count}} found in the first part of the file). We matched these fields:', {
            element: detected.recordElement,
            count: detected.sampleCount,
          })}
        </p>
      </div>
      <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1">
        {Object.entries(fields).map(([field, path]) => (
          <div key={field} className="flex gap-2 min-w-0">
            <dt className="text-gray-600 shrink-0">{t(`agencyDashboard:imports.fields.${field}`, field)}</dt>
            <dd className="font-mono text-xs text-gray-900 truncate pt-0.5">{path}</dd>
          </div>
        ))}
      </dl>
      {missing.length > 0 && (
        <p className="text-amber-800">
          {t('agencyDashboard:imports.detect.missing', 'Not found automatically — set these in the mapping:')}{' '}
          {missing.map((f) => t(`agencyDashboard:imports.fields.${f}`, f)).join(', ')}
        </p>
      )}
      <div className="flex flex-col sm:flex-row gap-2">
        <button type="button" disabled={applying} onClick={() => onApply(detected.suggestedMapping)}
          className="px-4 py-2 font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
          {t('agencyDashboard:imports.detect.apply', 'Use this mapping and preview again')}
        </button>
        <button type="button" onClick={() => onReview(detected.suggestedMapping)}
          className="px-4 py-2 font-medium text-gray-800 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
          {t('agencyDashboard:imports.detect.review', 'Review mapping first')}
        </button>
      </div>
    </div>
  );
};

export default DetectedStructureNotice;
