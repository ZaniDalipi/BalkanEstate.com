/**
 * The add-feed wizard helps an agency get a feed that imports completely:
 * a template to copy or download, what each listing needs, and — after
 * detection — which of those their feed has.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      const last = key.split(/[:.]/).pop() ?? key;
      return opts && 'fields' in opts ? `${last} ${String(opts.fields)}` : last;
    },
    i18n: { language: 'en' },
  }),
}));

const createListingSource = vi.fn();
const updateListingSource = vi.fn();
vi.mock('@/src/features/listing-sources/api/listingSourceApi', () => ({
  createMyListingSource: (...a: unknown[]) => createListingSource(...a),
  updateMyListingSource: (...a: unknown[]) => updateListingSource(...a),
}));

import FeedFormatGuide from '@/src/features/listing-sources/components/feedGuide/FeedFormatGuide';
import FeedCoverageList from '@/src/features/listing-sources/components/feedGuide/FeedCoverageList';
import ListingFeedForm from '@/src/features/listing-sources/components/ListingFeedForm';
import type { ListingSource } from '@/src/features/listing-sources/api/listingSourceApi';

describe('FeedFormatGuide', () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  beforeEach(() => {
    Object.assign(navigator, { clipboard: { writeText } });
    writeText.mockClear();
  });

  it('shows the schema.org JSON template, switches to XML, and copies a request for the developer', async () => {
    render(<FeedFormatGuide open onToggle={() => undefined} />);
    expect(screen.getByRole('tabpanel')).toHaveTextContent('"@type": ["RealEstateListing", "Apartment"]');
    expect(screen.getByText('offers.price')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'XML' }));
    expect(screen.getByRole('tab', { name: 'XML' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toHaveTextContent('<listing>');

    fireEvent.click(screen.getByRole('button', { name: 'developerCopy' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(expect.stringContaining('<listings>')));
  });

  it('is a disclosure: closed it shows only its toggle', () => {
    const onToggle = vi.fn();
    render(<FeedFormatGuide open={false} onToggle={onToggle} />);
    expect(screen.queryByRole('tabpanel')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'toggle' }));
    expect(onToggle).toHaveBeenCalled();
  });
});

describe('FeedCoverageList', () => {
  it('lists what was found and warns when a needed field is missing', () => {
    const onShowFormat = vi.fn();
    render(
      <FeedCoverageList
        onShowFormat={onShowFormat}
        coverage={[
          { field: 'title', required: true, found: true },
          { field: 'photos', required: true, found: false },
          { field: 'bedrooms', required: false, found: false },
        ]}
      />
    );
    expect(screen.getByRole('alert')).toHaveTextContent('requiredMissing photos');
    fireEvent.click(screen.getByRole('button', { name: 'seeFormat' }));
    expect(onShowFormat).toHaveBeenCalled();
  });
});

describe('ListingFeedForm', () => {
  const feed = { id: 'f1', name: 'Agency API', baseUrl: 'https://a.example', adapterType: 'customApi', enabled: true, adapterConfig: { itemsPath: '$[*]' }, fieldMap: {} } as unknown as ListingSource;

  beforeEach(() => {
    createListingSource.mockReset();
    updateListingSource.mockReset();
  });

  it("won't save an API feed without an address, and says why next to the settings", () => {
    render(<ListingFeedForm initial={feed} onCancel={() => undefined} onSaved={() => undefined} />);
    fireEvent.submit(screen.getByRole('button', { name: /save/i }).closest('form')!);
    expect(screen.getByRole('alert')).toHaveTextContent('missingEndpoint');
    expect(updateListingSource).not.toHaveBeenCalled();
  });

  it("shows the server's reasons the same way", async () => {
    updateListingSource.mockRejectedValue(Object.assign(new Error('bad'), {
      code: 'FEED_CONFIG_INVALID',
      details: { errors: [{ field: 'adapterConfig.endpoint', code: 'invalidUrl', message: 'not a web address' }] },
    }));
    const ok = { ...feed, adapterConfig: { endpoint: 'https://a.example/api' } } as unknown as ListingSource;
    render(<ListingFeedForm initial={ok} onCancel={() => undefined} onSaved={() => undefined} />);
    fireEvent.submit(screen.getByRole('button', { name: /save/i }).closest('form')!);
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('invalidUrl'));
  });
});
