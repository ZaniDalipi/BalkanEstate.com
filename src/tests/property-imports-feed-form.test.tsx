/**
 * Property Imports — feed form.
 *
 * The API returns the feed URL with token-like query values redacted and
 * never returns the stored secret. The form must therefore send only what the
 * manager actually changed; echoing the redacted URL or an empty secret back
 * would overwrite the real ones.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FeedForm from '../features/agency-dashboard/components/imports/FeedForm';
import type { AgencyFeed, FeedMeta } from '../features/agency-dashboard/types/propertyImports';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string | Record<string, unknown>) => (typeof fallback === 'string' ? fallback : key),
  }),
}));

const meta: FeedMeta = {
  canonical: { version: '1.0', mapping: { recordElement: 'listing', fields: { externalId: 'id', title: 'title', price: 'price', city: 'location/city' } } },
  fields: ['externalId', 'title', 'price', 'city'],
  propertyTypes: ['apartment'],
  sourceManagedFields: ['title'],
  lockableFields: ['title'],
  localOnly: [],
  authorizationStatement: 'I confirm.',
  supportedCurrencies: ['EUR'],
};

const feed: AgencyFeed = {
  id: 'f1', name: 'Website', sourceType: 'url', url: 'https://crm.example/export.xml?token=***', format: 'canonical', mapping: null, mode: 'snapshot',
  state: 'active', assignedAgentId: 'a1', credentials: { type: 'basic', username: 'feed', hasSecret: true },
  safeguards: { maxRemovalRatio: 0.3, minRemovalsForReview: 5 }, authorization: null, configVersion: 1, lastPreviewRunId: null,
  lastRunId: null, lastRunAt: null, lastSuccessfulSyncAt: null, nextSyncAt: null, consecutiveFailures: 0, lastError: null,
  activatedAt: null, activeJob: false, pendingReviewRunId: null, createdAt: '', updatedAt: '',
};

const renderForm = (props: Partial<React.ComponentProps<typeof FeedForm>> = {}) => {
  const onSubmit = vi.fn();
  render(
    <FeedForm feed={feed} meta={meta} agents={[{ id: 'a1', name: 'Ana' }]} saving={false} error={null} onSubmit={onSubmit} onCancel={() => undefined} {...props} />
  );
  return onSubmit;
};

describe('FeedForm', () => {
  it('sends only the changed name — never the redacted URL or a blank secret', () => {
    const onSubmit = renderForm();
    fireEvent.change(screen.getByDisplayValue('Website'), { target: { value: 'Main website' } });
    fireEvent.click(screen.getByText('Save'));
    expect(onSubmit).toHaveBeenCalledWith({ name: 'Main website' });
  });

  it('sends a new secret only when one is typed', () => {
    const onSubmit = renderForm();
    fireEvent.change(screen.getByPlaceholderText('Saved — leave blank to keep'), { target: { value: 'n3w-secret' } });
    fireEvent.click(screen.getByText('Save'));
    expect(onSubmit).toHaveBeenCalledWith({ credentials: { type: 'basic', username: 'feed', headerName: undefined, secret: 'n3w-secret' } });
  });

  it('starts a custom mapping from the canonical one and warns that edits need re-activation', () => {
    const onSubmit = renderForm();
    expect(screen.getByText(/stops daily sync until you preview and activate/)).toBeTruthy();
    fireEvent.change(screen.getByDisplayValue('BalkanEstateAI XML (no mapping needed)'), { target: { value: 'custom' } });
    expect(screen.getByDisplayValue('listing')).toBeTruthy();
    fireEvent.click(screen.getByText('Save'));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ format: 'custom', mapping: { recordElement: 'listing' } });
  });
});
