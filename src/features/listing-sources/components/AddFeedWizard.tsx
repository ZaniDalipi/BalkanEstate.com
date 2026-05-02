import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  type DetectMethod,
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

type Step = 'input' | 'preview' | 'saving';

const ADAPTER_LABELS: Record<string, string> = {
  rss: 'RSS / Atom feed',
  jsonFeed: 'JSON feed',
  xmlFeed: 'XML feed',
  jsonLd: 'Schema.org JSON-LD',
  customApi: 'Custom API',
};

// ── Sample preview card ──────────────────────────────────────────────────────

const SamplePreview: React.FC<{ sample?: Record<string, unknown>; fieldMap: Record<string, string> }> = ({
  sample,
  fieldMap,
}) => {
  if (!sample) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const get = (path: string): string => {
    const parts = path.split('.');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let cur: any = sample;
    for (const p of parts) {
      if (cur == null || typeof cur !== 'object') return '';
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

// ── Auth header rows component ───────────────────────────────────────────────

interface HeaderRow { key: string; value: string }

const AuthHeadersEditor: React.FC<{
  rows: HeaderRow[];
  onChange: (rows: HeaderRow[]) => void;
  addLabel: string;
}> = ({ rows, onChange, addLabel }) => {
  const set = (idx: number, field: 'key' | 'value', val: string) => {
    const next = rows.map((r, i) => (i === idx ? { ...r, [field]: val } : r));
    onChange(next);
  };
  const remove = (idx: number) => onChange(rows.filter((_, i) => i !== idx));
  const add = () => onChange([...rows, { key: '', value: '' }]);

  return (
    <div className="space-y-2">
      {rows.map((row, idx) => (
        <div key={idx} className="flex gap-2 items-center">
          <input
            type="text"
            value={row.key}
            onChange={(e) => set(idx, 'key', e.target.value)}
            placeholder="Header name"
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/30"
          />
          <input
            type="text"
            value={row.value}
            onChange={(e) => set(idx, 'value', e.target.value)}
            placeholder="Value"
            className="flex-[2] px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/30"
          />
          <button
            type="button"
            onClick={() => remove(idx)}
            className="text-gray-400 hover:text-red-500 text-lg leading-none px-1"
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="text-sm text-primary hover:text-primary-dark font-medium"
      >
        + {addLabel}
      </button>
    </div>
  );
};

// ── Main wizard ──────────────────────────────────────────────────────────────

const AddFeedWizard: React.FC<Props> = ({ onCancel, onSaved }) => {
  const { t } = useTranslation(['listingFeeds', 'common']);

  const [step, setStep] = useState<Step>('input');
  const [method, setMethod] = useState<DetectMethod>('url');

  // Shared
  const [name, setName] = useState('');
  const [detecting, setDetecting] = useState(false);
  const [detected, setDetected] = useState<DetectResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingFieldMap, setEditingFieldMap] = useState<Record<string, string> | null>(null);
  const [showFieldMapEditor, setShowFieldMapEditor] = useState(false);

  // URL / RSS method
  const [url, setUrl] = useState('');

  // JSON sample method
  const [sampleJson, setSampleJson] = useState('');

  // Custom API method
  const [apiUrl, setApiUrl] = useState('');
  const [authType, setAuthType] = useState<'none' | 'bearer' | 'apiKey' | 'basic'>('none');
  const [bearerToken, setBearerToken] = useState('');
  const [apiKeyHeader, setApiKeyHeader] = useState('X-API-Key');
  const [apiKeyValue, setApiKeyValue] = useState('');
  const [basicUser, setBasicUser] = useState('');
  const [basicPass, setBasicPass] = useState('');
  const [extraHeaders, setExtraHeaders] = useState<HeaderRow[]>([]);

  const buildAuthHeaders = (): Record<string, string> => {
    const h: Record<string, string> = {};
    if (authType === 'bearer' && bearerToken.trim()) h['Authorization'] = `Bearer ${bearerToken.trim()}`;
    if (authType === 'apiKey' && apiKeyHeader.trim() && apiKeyValue.trim()) h[apiKeyHeader.trim()] = apiKeyValue.trim();
    if (authType === 'basic' && basicUser.trim()) {
      h['Authorization'] = `Basic ${btoa(`${basicUser.trim()}:${basicPass.trim()}`)}`;
    }
    for (const row of extraHeaders) {
      if (row.key.trim() && row.value.trim()) h[row.key.trim()] = row.value.trim();
    }
    return h;
  };

  const inferName = (rawUrl: string) => {
    if (name) return;
    try { setName(new URL(rawUrl).hostname.replace('www.', '')); } catch { /* ignore */ }
  };

  const handleDetect = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setDetecting(true);
    try {
      let result: DetectResult;
      if (method === 'sampleJson') {
        result = await detectFeed('sampleJson', { sampleJson: sampleJson.trim() });
      } else if (method === 'customApi') {
        inferName(apiUrl);
        result = await detectFeed('customApi', {
          url: apiUrl.trim(),
          authHeaders: buildAuthHeaders(),
        });
      } else {
        // 'url' or 'rss'
        inferName(url);
        result = await detectFeed(method, { url: url.trim() });
      }
      setDetected(result);
      setEditingFieldMap(result.fieldMap);
      setStep('preview');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDetecting(false);
    }
  };

  const handleSave = async () => {
    if (!detected || !editingFieldMap) return;
    setStep('saving');
    setError(null);
    try {
      const baseUrl =
        method === 'customApi' ? apiUrl.trim() :
        method === 'sampleJson' ? (apiUrl.trim() || detected.adapterConfig.url as string || 'manual://imported') :
        url.trim();
      const input: ListingSourceInput = {
        name: name.trim() || (baseUrl ? new URL(baseUrl).hostname : 'My feed'),
        baseUrl,
        adapterType: detected.adapterType,
        adapterConfig: detected.adapterConfig,
        fieldMap: editingFieldMap,
        enabled: true,
      };
      const source = await createMyListingSource(input);
      onSaved(source);
    } catch (err) {
      setError((err as Error).message);
      setStep('preview');
    }
  };

  const methodOptions: { id: DetectMethod; labelKey: string; descKey: string; icon: string }[] = [
    { id: 'url',       labelKey: 'method.url',       descKey: 'method.urlDesc',       icon: '🔗' },
    { id: 'rss',       labelKey: 'method.rss',       descKey: 'method.rssDesc',       icon: '📡' },
    { id: 'sampleJson', labelKey: 'method.sampleJson', descKey: 'method.sampleJsonDesc', icon: '{ }' },
    { id: 'customApi', labelKey: 'method.customApi', descKey: 'method.customApiDesc', icon: '🔑' },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">{t('listingFeeds:addFeed')}</h2>
        <button type="button" onClick={onCancel} className="text-sm text-gray-500 hover:text-gray-800">
          ← {t('common:back')}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">{error}</div>
      )}

      {/* ── Step 1: Input ─────────────────────────────────────────────────── */}
      {step === 'input' && (
        <form onSubmit={handleDetect} className="space-y-5">
          {/* Method picker */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {methodOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setMethod(opt.id)}
                className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors ${
                  method === opt.id
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <span className="text-lg">{opt.icon}</span>
                <span className="text-sm font-semibold text-gray-800 leading-tight">
                  {t(`listingFeeds:${opt.labelKey}`)}
                </span>
                <span className="text-xs text-gray-500 leading-snug">
                  {t(`listingFeeds:${opt.descKey}`)}
                </span>
              </button>
            ))}
          </div>

          <div className="border-t border-gray-100 pt-4 space-y-4">
            {/* URL auto-detect */}
            {method === 'url' && (
              <>
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
              </>
            )}

            {/* RSS/Atom direct URL */}
            {method === 'rss' && (
              <>
                <p className="text-gray-600 text-sm">{t('listingFeeds:method.rssHint')}</p>
                <label className="block">
                  <span className="text-sm font-semibold text-gray-700">{t('listingFeeds:fields.feedUrl')}</span>
                  <input
                    type="url"
                    required
                    autoFocus
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://your-site.com/feed/listings.xml"
                    className="mt-1 w-full px-4 py-3 border border-gray-200 rounded-xl text-base focus:ring-2 focus:ring-primary/30"
                  />
                </label>
              </>
            )}

            {/* Paste JSON sample */}
            {method === 'sampleJson' && (
              <>
                <p className="text-gray-600 text-sm">{t('listingFeeds:method.sampleJsonHint')}</p>
                <label className="block">
                  <span className="text-sm font-semibold text-gray-700">{t('listingFeeds:method.pasteJson')}</span>
                  <textarea
                    required
                    autoFocus
                    value={sampleJson}
                    onChange={(e) => setSampleJson(e.target.value)}
                    rows={8}
                    placeholder={'[\n  { "title": "Modern apartment", "price": 95000, "city": "Zagreb" }\n]'}
                    className="mt-1 w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-primary/30 resize-y"
                    spellCheck={false}
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-gray-700">
                    {t('listingFeeds:fields.apiUrl')} <span className="text-gray-400 font-normal">({t('common:optional')} — {t('listingFeeds:method.apiUrlHint')})</span>
                  </span>
                  <input
                    type="url"
                    value={apiUrl}
                    onChange={(e) => setApiUrl(e.target.value)}
                    placeholder="https://api.your-site.com/listings"
                    className="mt-1 w-full px-4 py-3 border border-gray-200 rounded-xl text-base focus:ring-2 focus:ring-primary/30"
                  />
                </label>
              </>
            )}

            {/* Custom API with auth */}
            {method === 'customApi' && (
              <>
                <p className="text-gray-600 text-sm">{t('listingFeeds:method.customApiHint')}</p>
                <label className="block">
                  <span className="text-sm font-semibold text-gray-700">{t('listingFeeds:fields.apiUrl')}</span>
                  <input
                    type="url"
                    required
                    autoFocus
                    value={apiUrl}
                    onChange={(e) => setApiUrl(e.target.value)}
                    placeholder="https://api.your-site.com/listings"
                    className="mt-1 w-full px-4 py-3 border border-gray-200 rounded-xl text-base focus:ring-2 focus:ring-primary/30"
                  />
                </label>

                <div>
                  <span className="text-sm font-semibold text-gray-700 block mb-2">{t('listingFeeds:fields.authType')}</span>
                  <div className="flex gap-2 flex-wrap">
                    {(['none', 'bearer', 'apiKey', 'basic'] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setAuthType(type)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                          authType === type
                            ? 'bg-primary text-white border-primary'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        {t(`listingFeeds:auth.${type}`)}
                      </button>
                    ))}
                  </div>
                </div>

                {authType === 'bearer' && (
                  <label className="block">
                    <span className="text-sm font-semibold text-gray-700">{t('listingFeeds:auth.bearerToken')}</span>
                    <input
                      type="password"
                      value={bearerToken}
                      onChange={(e) => setBearerToken(e.target.value)}
                      placeholder="eyJhbGci..."
                      className="mt-1 w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/30"
                    />
                  </label>
                )}

                {authType === 'apiKey' && (
                  <div className="flex gap-3">
                    <label className="flex-1 block">
                      <span className="text-sm font-semibold text-gray-700">{t('listingFeeds:auth.headerName')}</span>
                      <input
                        type="text"
                        value={apiKeyHeader}
                        onChange={(e) => setApiKeyHeader(e.target.value)}
                        placeholder="X-API-Key"
                        className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/30"
                      />
                    </label>
                    <label className="flex-[2] block">
                      <span className="text-sm font-semibold text-gray-700">{t('listingFeeds:auth.apiKeyValue')}</span>
                      <input
                        type="password"
                        value={apiKeyValue}
                        onChange={(e) => setApiKeyValue(e.target.value)}
                        placeholder="your-api-key"
                        className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/30"
                      />
                    </label>
                  </div>
                )}

                {authType === 'basic' && (
                  <div className="flex gap-3">
                    <label className="flex-1 block">
                      <span className="text-sm font-semibold text-gray-700">{t('listingFeeds:auth.username')}</span>
                      <input
                        type="text"
                        value={basicUser}
                        onChange={(e) => setBasicUser(e.target.value)}
                        placeholder="username"
                        className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/30"
                      />
                    </label>
                    <label className="flex-1 block">
                      <span className="text-sm font-semibold text-gray-700">{t('listingFeeds:auth.password')}</span>
                      <input
                        type="password"
                        value={basicPass}
                        onChange={(e) => setBasicPass(e.target.value)}
                        placeholder="••••••••"
                        className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/30"
                      />
                    </label>
                  </div>
                )}

                <div>
                  <span className="text-sm font-semibold text-gray-700 block mb-2">{t('listingFeeds:auth.extraHeaders')}</span>
                  <AuthHeadersEditor
                    rows={extraHeaders}
                    onChange={setExtraHeaders}
                    addLabel={t('listingFeeds:auth.addHeader')}
                  />
                </div>
              </>
            )}
          </div>

          <button
            type="submit"
            disabled={detecting}
            className="w-full py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {detecting ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                {method === 'sampleJson' ? t('listingFeeds:analyzing') : t('listingFeeds:detecting')}
              </>
            ) : method === 'sampleJson' ? t('listingFeeds:analyzeButton') : t('listingFeeds:detectButton')}
          </button>
        </form>
      )}

      {/* ── Step 2: Preview ───────────────────────────────────────────────── */}
      {step === 'preview' && detected && (
        <div className="space-y-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <p className="font-semibold text-emerald-800 mb-1">
              ✓ {ADAPTER_LABELS[detected.adapterType] ?? detected.adapterType} {t('listingFeeds:detected')}
            </p>
            <p className="text-sm text-emerald-700">{detected.hint}</p>
          </div>

          {detected.sample && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">{t('listingFeeds:sampleListing')}</p>
              <SamplePreview sample={detected.sample} fieldMap={editingFieldMap || detected.fieldMap} />
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

          {/* Field Mapping Editor */}
          {editingFieldMap && (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowFieldMapEditor(!showFieldMapEditor)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <span className="text-sm font-semibold text-gray-700">
                  🔧 Field mapping ({Object.keys(editingFieldMap).length} fields)
                </span>
                <span className="text-lg text-gray-400 leading-none">{showFieldMapEditor ? '▼' : '▶'}</span>
              </button>

              {showFieldMapEditor && (
                <div className="border-t border-gray-200 px-4 py-3 space-y-2.5 bg-gray-50 max-h-72 overflow-y-auto">
                  {Object.entries(editingFieldMap).map(([prop, sourcePath]) => (
                    <div key={prop} className="flex gap-2 items-end">
                      <label className="flex-1">
                        <span className="text-xs font-mono font-medium text-gray-600 block mb-1">{prop}</span>
                        <input
                          type="text"
                          value={sourcePath}
                          onChange={(e) => setEditingFieldMap({ ...editingFieldMap, [prop]: e.target.value })}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm font-mono focus:ring-1 focus:ring-primary/50"
                          placeholder="e.g., title, images[0], $.item.name"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const next = { ...editingFieldMap };
                          delete next[prop];
                          setEditingFieldMap(next);
                        }}
                        className="px-2 py-1.5 text-red-600 hover:bg-red-50 rounded text-lg leading-none font-semibold"
                        title="Remove this field"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <p className="text-xs text-gray-500 mt-3 pt-2 border-t border-gray-300">
                    💡 Use JSONPath notation for nested data: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">$.images[0].url</code> or bare keys for top-level:  <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">image_url</code>
                  </p>
                </div>
              )}
            </div>
          )}

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
              onClick={() => setStep('input')}
              className="px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 text-sm"
            >
              {t('common:back')}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Saving ────────────────────────────────────────────────── */}
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
