import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  type DetectResult,
  type ListingSource,
  type ListingSourceInput,
  detectFeed,
  createMyListingSource,
} from '../api/listingSourceApi';

interface Props {
  onCancel: () => void;
  onSaved: (source: ListingSource) => void;
}

type Step = 'url' | 'preview' | 'saving';

const ADAPTER_LABELS: Record<string, string> = {
  rss: 'RSS / Atom feed',
  jsonFeed: 'JSON feed',
  xmlFeed: 'XML feed',
  jsonLd: 'Schema.org JSON-LD',
  customApi: 'Custom API (WordPress)',
};

const SamplePreview: React.FC<{ sample?: Record<string, unknown>; fieldMap: Record<string, string> }> = ({
  sample,
  fieldMap,
}) => {
  if (!sample) return null;
  const get = (path: string): string => {
    const parts = path.split('.');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let cur: any = sample;
    for (const p of parts) {
      if (cur == null || typeof cur !== 'object') return '';
      // Handle array notation like [0]
      const idx = p.match(/\[(\d+)\]/)?.[1];
      cur = idx !== undefined ? cur[parseInt(idx, 10)] : cur[p];
    }
    return cur != null ? String(cur) : '';
  };

  const title = get(fieldMap.title ?? 'title') || get('title') || get('name');
  const price = get(fieldMap.price ?? 'price') || get('price');
  const city = get(fieldMap.city ?? 'city') || get('city');
  const image = get(fieldMap.imageUrl ?? 'image') || get('enclosure.url');

  return (
    <div className="bg-white/60 border border-white/50 rounded-2xl overflow-hidden flex gap-3 p-3">
      {image && (
        <img
          src={image}
          alt=""
          className="w-20 h-20 object-cover rounded-xl flex-shrink-0 bg-gray-100"
          onError={(e) => (e.currentTarget.style.display = 'none')}
        />
      )}
      <div className="min-w-0">
        {title && <p className="font-semibold text-gray-900 truncate">{title}</p>}
        {price && <p className="text-sm text-primary font-bold">{price}</p>}
        {city && <p className="text-xs text-gray-500">{city}</p>}
        {!title && !price && !city && (
          <p className="text-xs text-gray-400 italic">Sample item found — fields will be mapped on import</p>
        )}
      </div>
    </div>
  );
};

const AddFeedWizard: React.FC<Props> = ({ onCancel, onSaved }) => {
  const { t } = useTranslation(['listingFeeds', 'common']);

  const [step, setStep] = useState<Step>('url');
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [detecting, setDetecting] = useState(false);
  const [detected, setDetected] = useState<DetectResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDetect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setError(null);
    setDetecting(true);
    try {
      const result = await detectFeed(url.trim());
      setDetected(result);
      if (!name) setName(new URL(url.trim()).hostname.replace('www.', ''));
      setStep('preview');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDetecting(false);
    }
  };

  const handleSave = async () => {
    if (!detected) return;
    setStep('saving');
    setError(null);
    try {
      const input: ListingSourceInput = {
        name: name.trim() || new URL(url.trim()).hostname,
        baseUrl: url.trim(),
        adapterType: detected.adapterType,
        adapterConfig: detected.adapterConfig,
        fieldMap: detected.fieldMap,
        enabled: true,
      };
      const source = await createMyListingSource(input);
      onSaved(source);
    } catch (err) {
      setError((err as Error).message);
      setStep('preview');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">{t('listingFeeds:addFeed')}</h2>
        <button type="button" onClick={onCancel} className="text-sm text-gray-500 hover:text-gray-800">
          ← {t('common:back')}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">{error}</div>
      )}

      {/* Step 1 — URL entry */}
      {step === 'url' && (
        <form onSubmit={handleDetect} className="space-y-4">
          <p className="text-gray-600 text-sm">{t('listingFeeds:wizardDesc')}</p>
          <label className="block">
            <span className="text-sm font-semibold text-gray-700">{t('listingFeeds:fields.baseUrl')}</span>
            <input
              type="url"
              required
              autoFocus
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://your-agency-website.com"
              className="mt-1 w-full px-4 py-3 border border-gray-200 rounded-xl text-base focus:ring-2 focus:ring-primary/30"
            />
          </label>
          <button
            type="submit"
            disabled={detecting}
            className="w-full py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {detecting ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                {t('listingFeeds:detecting')}
              </>
            ) : t('listingFeeds:detectButton')}
          </button>
        </form>
      )}

      {/* Step 2 — Preview detected result */}
      {step === 'preview' && detected && (
        <div className="space-y-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <p className="font-semibold text-emerald-800 mb-1">✓ {ADAPTER_LABELS[detected.adapterType] ?? detected.adapterType} {t('listingFeeds:detected')}</p>
            <p className="text-sm text-emerald-700">{detected.hint}</p>
          </div>

          {detected.sample && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">{t('listingFeeds:sampleListing')}</p>
              <SamplePreview sample={detected.sample} fieldMap={detected.fieldMap} />
            </div>
          )}

          <label className="block">
            <span className="text-sm font-semibold text-gray-700">{t('listingFeeds:fields.name')}</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('listingFeeds:fields.namePlaceholder')}
              className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/30"
            />
          </label>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark"
            >
              {t('listingFeeds:saveAndEnable')}
            </button>
            <button
              type="button"
              onClick={() => setStep('url')}
              className="px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 text-sm"
            >
              {t('common:back')}
            </button>
          </div>
        </div>
      )}

      {/* Step 3 — Saving */}
      {step === 'saving' && (
        <div className="text-center py-12">
          <div className="inline-block w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
          <p className="text-gray-600">{t('common:saving')}…</p>
        </div>
      )}
    </div>
  );
};

export default AddFeedWizard;
