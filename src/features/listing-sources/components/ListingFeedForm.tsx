import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  type ListingAdapterType,
  type ListingSource,
  type ListingSourceInput,
  createMyListingSource,
  updateMyListingSource,
} from '../api/listingSourceApi';

interface Props {
  initial?: ListingSource;
  onCancel: () => void;
  onSaved: (source: ListingSource) => void;
}

const ADAPTER_OPTIONS: { value: ListingAdapterType; labelKey: string; descKey: string }[] = [
  { value: 'rss', labelKey: 'listingFeeds:adapter.rss', descKey: 'listingFeeds:adapter.rssDesc' },
  { value: 'jsonFeed', labelKey: 'listingFeeds:adapter.jsonFeed', descKey: 'listingFeeds:adapter.jsonFeedDesc' },
  { value: 'xmlFeed', labelKey: 'listingFeeds:adapter.xmlFeed', descKey: 'listingFeeds:adapter.xmlFeedDesc' },
  { value: 'jsonLd', labelKey: 'listingFeeds:adapter.jsonLd', descKey: 'listingFeeds:adapter.jsonLdDesc' },
  { value: 'customApi', labelKey: 'listingFeeds:adapter.customApi', descKey: 'listingFeeds:adapter.customApiDesc' },
];

const tryParseJson = (input: string, fieldName: string, fallback: Record<string, unknown> = {}): Record<string, unknown> => {
  if (!input.trim()) return fallback;
  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch {
    throw new Error(`${fieldName}: invalid JSON — check for missing commas, quotes, or brackets`);
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(`${fieldName}: must be a JSON object { … }`);
  }
  return parsed as Record<string, unknown>;
};

const ListingFeedForm: React.FC<Props> = ({ initial, onCancel, onSaved }) => {
  const { t } = useTranslation(['listingFeeds', 'common']);
  const [name, setName] = useState(initial?.name ?? '');
  const [baseUrl, setBaseUrl] = useState(initial?.baseUrl ?? '');
  const [adapterType, setAdapterType] = useState<ListingAdapterType>(
    (initial?.adapterType as ListingAdapterType | undefined) ?? 'rss'
  );
  const [enabled, setEnabled] = useState(initial?.enabled ?? true);
  const [adapterConfigText, setAdapterConfigText] = useState(
    initial ? JSON.stringify(initial.adapterConfig ?? {}, null, 2) : '{\n  "feedUrls": []\n}'
  );
  const [fieldMapText, setFieldMapText] = useState(
    initial
      ? JSON.stringify(initial.fieldMap ?? {}, null, 2)
      : '{\n  "title": "title",\n  "description": "description",\n  "imageUrl": "image"\n}'
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const adapterDesc = useMemo(
    () => ADAPTER_OPTIONS.find((o) => o.value === adapterType)?.descKey ?? '',
    [adapterType]
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const adapterConfig = tryParseJson(adapterConfigText, 'Adapter config');
      const fieldMapParsed = tryParseJson(fieldMapText, 'Field map');
      const fieldMap: Record<string, string> = {};
      for (const [k, v] of Object.entries(fieldMapParsed)) {
        if (typeof v === 'string') fieldMap[k] = v;
      }

      const input: ListingSourceInput = {
        name: name.trim(),
        baseUrl: baseUrl.trim(),
        adapterType,
        enabled,
        adapterConfig,
        fieldMap,
      };
      const saved = initial
        ? await updateMyListingSource(initial.id, input)
        : await createMyListingSource(input);
      onSaved(saved);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">
          {initial ? t('listingFeeds:editFeed') : t('listingFeeds:newFeed')}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          ← {t('common:back')}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">
          {error}
        </div>
      )}

      <label className="block">
        <span className="text-sm font-semibold text-gray-700">{t('listingFeeds:fields.name')}</span>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('listingFeeds:fields.namePlaceholder')}
          className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/30"
        />
      </label>

      <label className="block">
        <span className="text-sm font-semibold text-gray-700">{t('listingFeeds:fields.baseUrl')}</span>
        <input
          type="url"
          required
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder="https://your-website.com"
          className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/30"
        />
      </label>

      <label className="block">
        <span className="text-sm font-semibold text-gray-700">{t('listingFeeds:fields.adapterType')}</span>
        <select
          value={adapterType}
          onChange={(e) => setAdapterType(e.target.value as ListingAdapterType)}
          className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/30"
        >
          {ADAPTER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {t(o.labelKey)}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-500">{t(adapterDesc)}</p>
      </label>

      <label className="block">
        <span className="text-sm font-semibold text-gray-700">
          {t('listingFeeds:fields.adapterConfig')}
        </span>
        <textarea
          rows={6}
          value={adapterConfigText}
          onChange={(e) => setAdapterConfigText(e.target.value)}
          spellCheck={false}
          className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg font-mono text-xs focus:ring-2 focus:ring-primary/30"
        />
        <p className="mt-1 text-xs text-gray-500">{t('listingFeeds:fields.adapterConfigHint')}</p>
      </label>

      <label className="block">
        <span className="text-sm font-semibold text-gray-700">{t('listingFeeds:fields.fieldMap')}</span>
        <textarea
          rows={6}
          value={fieldMapText}
          onChange={(e) => setFieldMapText(e.target.value)}
          spellCheck={false}
          className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg font-mono text-xs focus:ring-2 focus:ring-primary/30"
        />
        <p className="mt-1 text-xs text-gray-500">{t('listingFeeds:fields.fieldMapHint')}</p>
      </label>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="rounded"
        />
        <span className="text-sm text-gray-700">{t('listingFeeds:fields.enableNow')}</span>
      </label>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark disabled:opacity-50"
        >
          {submitting ? t('common:saving') : t('common:save')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50"
        >
          {t('common:cancel')}
        </button>
      </div>
    </form>
  );
};

export default ListingFeedForm;
