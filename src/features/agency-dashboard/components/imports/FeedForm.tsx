import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { FeedPayload } from '../../api/propertyImportsApi';
import type { AgencyFeed, FeedFormValues, FeedMeta } from '../../types/propertyImports';
import FeedAccessFields from './FeedAccessFields';
import MappingEditor from './MappingEditor';
import MutationError from './MutationError';
import SafeguardFields from './SafeguardFields';
import { inputClass } from './formatters';

interface FeedFormProps {
  feed: AgencyFeed | null;
  meta: FeedMeta;
  agents: Array<{ id: string; name: string }>;
  saving: boolean;
  error: unknown;
  onSubmit: (payload: FeedPayload) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

const initialValues = (feed: AgencyFeed | null): FeedFormValues => ({
  name: feed?.name ?? '',
  url: feed?.url ?? '',
  format: feed?.format ?? 'canonical',
  mode: feed?.mode ?? 'snapshot',
  assignedAgentId: feed?.assignedAgentId ?? '',
  credentials: { type: feed?.credentials.type ?? 'none', username: feed?.credentials.username, headerName: feed?.credentials.headerName },
  mapping: feed?.mapping ?? null,
  safeguards: feed?.safeguards ?? { maxRemovalRatio: 0.3, minRemovalsForReview: 5 },
});

/** Only what changed is sent, so a redacted URL or an empty secret box never overwrites stored values. */
const buildPayload = (values: FeedFormValues, initial: FeedFormValues, isNew: boolean): FeedPayload => {
  const payload: FeedPayload = {};
  (['name', 'url', 'format', 'mode', 'assignedAgentId'] as const).forEach((key) => {
    // An empty agent means "the agency owner", which the server applies by default.
    if (values[key] !== '' && (isNew || values[key] !== initial[key])) (payload as Record<string, unknown>)[key] = values[key];
  });
  const c = values.credentials;
  if (isNew || c.secret || c.type !== initial.credentials.type || c.username !== initial.credentials.username || c.headerName !== initial.credentials.headerName) {
    payload.credentials = { type: c.type, username: c.username, headerName: c.headerName, ...(c.secret ? { secret: c.secret } : {}) };
  }
  if (values.format === 'custom' && (isNew || JSON.stringify(values.mapping) !== JSON.stringify(initial.mapping))) payload.mapping = values.mapping;
  if (JSON.stringify(values.safeguards) !== JSON.stringify(initial.safeguards)) payload.safeguards = values.safeguards;
  return payload;
};

const FeedForm: React.FC<FeedFormProps> = ({ feed, meta, agents, saving, error, onSubmit, onCancel, onDelete }) => {
  const { t } = useTranslation(['agencyDashboard', 'common']);
  const [initial] = useState(() => initialValues(feed));
  const [values, setValues] = useState<FeedFormValues>(initial);
  const set = <K extends keyof FeedFormValues>(key: K, value: FeedFormValues[K]) => setValues((v) => ({ ...v, [key]: value }));
  const setCred = (patch: Partial<FeedFormValues['credentials']>) => set('credentials', { ...values.credentials, ...patch });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(buildPayload(values, initial, !feed));
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 space-y-5">
      <h3 className="text-lg font-semibold text-gray-900">
        {feed ? t('agencyDashboard:imports.form.editTitle', 'Edit feed') : t('agencyDashboard:imports.form.newTitle', 'Connect a property feed')}
      </h3>
      {feed && feed.state !== 'draft' && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {t('agencyDashboard:imports.form.reactivateNote', 'Changing the URL, format, mapping, feed type or credentials stops daily sync until you preview and activate the feed again.')}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block text-sm">
          <span className="font-medium text-gray-700">{t('agencyDashboard:imports.form.name', 'Name')}</span>
          <input className={inputClass} value={values.name} maxLength={80} required onChange={(e) => set('name', e.target.value)} placeholder={t('agencyDashboard:imports.form.namePlaceholder', 'Website feed')} />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-gray-700">{t('agencyDashboard:imports.form.url', 'Feed URL')}</span>
          <input className={inputClass} type="url" value={values.url} required onChange={(e) => set('url', e.target.value)} placeholder="https://www.your-agency.com/feed.xml" spellCheck={false} />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-gray-700">{t('agencyDashboard:imports.form.format', 'Format')}</span>
          <select className={inputClass} value={values.format} onChange={(e) => {
            const format = e.target.value as FeedFormValues['format'];
            setValues((v) => ({ ...v, format, mapping: format === 'custom' ? v.mapping ?? { ...meta.canonical.mapping } : v.mapping }));
          }}>
            <option value="canonical">{t('agencyDashboard:imports.form.formatCanonical', 'BalkanEstateAI XML (no mapping needed)')}</option>
            <option value="custom">{t('agencyDashboard:imports.form.formatCustom', 'Other XML format (map fields)')}</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-medium text-gray-700">{t('agencyDashboard:imports.form.mode', 'Feed contents')}</span>
          <select className={inputClass} value={values.mode} onChange={(e) => set('mode', e.target.value as FeedFormValues['mode'])}>
            <option value="snapshot">{t('agencyDashboard:imports.mode.snapshot', 'Complete listing (snapshot)')}</option>
            <option value="delta">{t('agencyDashboard:imports.mode.delta', 'Changes only (delta)')}</option>
          </select>
          <span className="mt-1 block text-xs text-gray-500">
            {values.mode === 'snapshot'
              ? t('agencyDashboard:imports.form.snapshotHelp', 'Listings missing from a complete, valid feed are deactivated (never deleted).')
              : t('agencyDashboard:imports.form.deltaHelp', 'Only listings marked "removed" are deactivated; missing listings are left alone.')}
          </span>
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="font-medium text-gray-700">{t('agencyDashboard:imports.form.agent', 'Publish listings as')}</span>
          <select className={inputClass} value={values.assignedAgentId} onChange={(e) => set('assignedAgentId', e.target.value)}>
            {!feed && <option value="">{t('agencyDashboard:imports.form.ownerDefault', 'Agency owner (default)')}</option>}
            {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <span className="mt-1 block text-xs text-gray-500">{t('agencyDashboard:imports.form.agentHelp', "New listings count towards this agent's plan allowance.")}</span>
        </label>
      </div>

      <FeedAccessFields value={values.credentials} hasSavedSecret={Boolean(feed?.credentials.hasSecret)} onChange={setCred} />

      {values.format === 'custom' && values.mapping && (
        <MappingEditor value={values.mapping} fields={meta.fields} onChange={(mapping) => set('mapping', mapping)} />
      )}

      <SafeguardFields value={values.safeguards} onChange={(safeguards) => set('safeguards', safeguards)} />

      <MutationError error={error} />

      <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3">
        {onDelete ? (
          <button type="button" onClick={onDelete} className="px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 rounded-lg">
            {t('agencyDashboard:imports.actions.delete', 'Disconnect feed')}
          </button>
        ) : <span />}
        <div className="flex gap-3">
          <button type="button" onClick={onCancel} className="flex-1 sm:flex-none px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
            {t('common:cancel', 'Cancel')}
          </button>
          <button type="submit" disabled={saving} className="flex-1 sm:flex-none px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
            {saving ? t('agencyDashboard:imports.form.saving', 'Saving…') : t('agencyDashboard:imports.form.save', 'Save')}
          </button>
        </div>
      </div>
    </form>
  );
};

export default FeedForm;
