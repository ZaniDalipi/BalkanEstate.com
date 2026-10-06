import React from 'react';
import { useTranslation } from 'react-i18next';
import type { FeedMappingConfig } from '../../types/propertyImports';
import { inputClass } from './formatters';

interface MappingEditorProps {
  value: FeedMappingConfig;
  fields: string[];
  onChange: (next: FeedMappingConfig) => void;
  /** Paths found in the feed's last file, offered as suggestions. */
  pathSuggestions?: string[];
}

type MapName = 'listingType' | 'propertyType' | 'status';
const VALUE_MAPS: MapName[] = ['listingType', 'propertyType', 'status'];
const REQUIRED = new Set(['externalId', 'title', 'price', 'city']);

/** "prodaja = sale" lines ⇄ { prodaja: 'sale' } */
const toLines = (map?: Record<string, string>) =>
  Object.entries(map ?? {}).map(([k, v]) => `${k} = ${v}`).join('\n');
const fromLines = (text: string): Record<string, string> =>
  Object.fromEntries(
    text
      .split('\n')
      .map((line) => line.split('='))
      .filter((parts) => parts.length === 2 && parts[0].trim() && parts[1].trim())
      .map(([k, v]) => [k.trim(), v.trim()])
  );

const PATHS_LIST_ID = 'feed-mapping-paths';

const MappingEditor: React.FC<MappingEditorProps> = ({ value, fields, onChange, pathSuggestions = [] }) => {
  const { t } = useTranslation(['agencyDashboard']);
  const setField = (field: string, path: string) => {
    const next = { ...value.fields };
    if (path.trim()) next[field] = path.trim();
    else delete next[field];
    onChange({ ...value, fields: next });
  };

  return (
    <fieldset className="space-y-4 rounded-xl border border-gray-200 p-4">
      <legend className="px-1 text-sm font-semibold text-gray-900">{t('agencyDashboard:imports.mapping.title', 'Field mapping')}</legend>
      <p className="text-xs text-gray-500">
        {t(
          'agencyDashboard:imports.mapping.help',
          'Paths are element names relative to one listing, separated by "/". Use @name for an attribute, e.g. price/@currency or photos/photo/@src; * for any element, e.g. desc/*; and [@lang=en] to pick one, e.g. title[@lang=en].'
        )}
      </p>
      {pathSuggestions.length > 0 && (
        <datalist id={PATHS_LIST_ID}>
          {pathSuggestions.map((p) => <option key={p} value={p} />)}
        </datalist>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block text-sm">
          <span className="font-medium text-gray-700">{t('agencyDashboard:imports.mapping.recordElement', 'Listing element')}</span>
          <input className={inputClass} value={value.recordElement} onChange={(e) => onChange({ ...value, recordElement: e.target.value.trim() })} placeholder="property" />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-gray-700">{t('agencyDashboard:imports.mapping.areaUnit', 'Area unit')}</span>
          <select className={inputClass} value={value.areaUnit ?? 'm2'} onChange={(e) => onChange({ ...value, areaUnit: e.target.value as 'm2' | 'sqft' })}>
            <option value="m2">m²</option>
            <option value="sqft">sq ft</option>
          </select>
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {fields.map((field) => (
          <label key={field} className="block text-sm">
            <span className="font-medium text-gray-700">
              {t(`agencyDashboard:imports.fields.${field}`, field)}
              {REQUIRED.has(field) && <span className="text-red-500"> *</span>}
            </span>
            <input className={inputClass} value={value.fields[field] ?? ''} onChange={(e) => setField(field, e.target.value)} spellCheck={false}
              list={pathSuggestions.length > 0 ? PATHS_LIST_ID : undefined} />
          </label>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {VALUE_MAPS.map((name) => (
          <label key={name} className="block text-sm">
            <span className="font-medium text-gray-700">{t(`agencyDashboard:imports.mapping.valueMap.${name}`, `${name} values`)}</span>
            <textarea
              className={`${inputClass} font-mono`}
              rows={4}
              defaultValue={toLines(value.valueMaps?.[name])}
              onBlur={(e) => onChange({ ...value, valueMaps: { ...(value.valueMaps ?? {}), [name]: fromLines(e.target.value) } })}
              placeholder={name === 'listingType' ? 'prodaja = sale\nnajam = rent' : 'stan = apartment'}
            />
          </label>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <label className="block text-sm">
          <span className="font-medium text-gray-700">{t('agencyDashboard:imports.mapping.defaultCountry', 'Country if not stated')}</span>
          <input className={inputClass} value={value.defaults?.country ?? ''} onChange={(e) => onChange({ ...value, defaults: { ...value.defaults, country: e.target.value || undefined } })} />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-gray-700">{t('agencyDashboard:imports.mapping.defaultCurrency', 'Currency if not stated')}</span>
          <input className={inputClass} value={value.defaults?.currency ?? ''} maxLength={3} onChange={(e) => onChange({ ...value, defaults: { ...value.defaults, currency: e.target.value.toUpperCase() || undefined } })} placeholder="EUR" />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-gray-700">{t('agencyDashboard:imports.mapping.totalCount', 'Total count path (feed root)')}</span>
          <input className={inputClass} value={value.feed?.totalCount ?? ''} onChange={(e) => onChange({ ...value, feed: { ...value.feed, totalCount: e.target.value.trim() || undefined } })} placeholder="@total" />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-gray-700">{t('agencyDashboard:imports.mapping.nextPage', 'Next page path (feed root)')}</span>
          <input className={inputClass} value={value.feed?.nextPage ?? ''} onChange={(e) => onChange({ ...value, feed: { ...value.feed, nextPage: e.target.value.trim() || undefined } })} placeholder="@next-page" />
        </label>
      </div>
    </fieldset>
  );
};

export default MappingEditor;
