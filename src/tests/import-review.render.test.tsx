/**
 * Listings fetched from a user's external feed wait in a review queue until
 * the owner publishes them. These cover what the owner relies on there: a
 * draft missing essentials can't be published, an update shows what the feed
 * wants to change, and the editor only sends the fields that were corrected.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => key.split(':').pop() ?? key,
        i18n: { language: 'en', changeLanguage: vi.fn() },
    }),
    Trans: ({ children }: { children?: React.ReactNode }) => children,
}));

import ImportDraftCard from '@/src/features/listing-sources/components/review/ImportDraftCard';
import ImportDraftEditor from '@/src/features/listing-sources/components/review/ImportDraftEditor';
import type { DraftFields, ImportedDraft } from '@/src/features/listing-sources/api/importReviewApi';

const fields = (overrides: Partial<DraftFields> = {}): DraftFields => ({
    title: 'Sea view flat',
    description: 'Two bedrooms',
    address: 'Obala 1',
    city: 'Budva',
    country: 'Montenegro',
    price: 120000,
    sqft: 70,
    beds: 2,
    baths: 1,
    livingRooms: null,
    parking: null,
    yearBuilt: null,
    floorNumber: null,
    totalFloors: null,
    listingType: 'sale',
    propertyType: 'apartment',
    isNegotiable: false,
    images: ['https://src.example/a.jpg', 'https://src.example/b.jpg'],
    currency: 'EUR',
    ...overrides,
});

const draft = (overrides: Partial<ImportedDraft> = {}): ImportedDraft => ({
    id: 'd1',
    sourceId: 's1',
    sourceName: 'bbm-agencija.com',
    sourceUrl: 'https://src.example/1',
    kind: 'new',
    status: 'pending',
    data: fields(),
    original: fields(),
    changedFields: [],
    issues: [],
    blockingIssues: [],
    edited: false,
    fetchedAt: '2026-09-20T10:00:00.000Z',
    ...overrides,
});

const cardHandlers = () => ({
    onSelect: vi.fn(), onEdit: vi.fn(), onAccept: vi.fn(), onReject: vi.fn(), onRestore: vi.fn(),
});

describe('ImportDraftCard', () => {
    it('publishes a complete new listing', () => {
        const h = cardHandlers();
        render(<ImportDraftCard draft={draft()} selected={false} busy={false} {...h} />);
        fireEvent.click(screen.getByRole('button', { name: 'review.publish' }));
        expect(h.onAccept).toHaveBeenCalled();
    });

    it('will not publish a listing missing its city', () => {
        const d = draft({ data: fields({ city: null }), issues: ['missingCity'], blockingIssues: ['missingCity'] });
        render(<ImportDraftCard draft={d} selected={false} busy={false} {...cardHandlers()} />);
        expect(screen.getByRole('button', { name: 'review.publish' })).toBeDisabled();
        expect(screen.getByText('review.issues.missingCity')).toBeInTheDocument();
    });

    it('shows what an update would change on the live listing', () => {
        const d = draft({
            kind: 'update',
            data: fields({ price: 99000 }),
            current: fields(),
            changedFields: ['price'],
        });
        render(<ImportDraftCard draft={d} selected={false} busy={false} {...cardHandlers()} />);
        expect(screen.getByText('review.changesTitle')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'review.applyUpdate' })).toBeEnabled();
        expect(screen.getByRole('button', { name: 'review.keepCurrent' })).toBeEnabled();
    });

    it('offers restore instead of publish for a rejected listing', () => {
        const h = cardHandlers();
        render(<ImportDraftCard draft={draft({ status: 'rejected' })} selected={false} busy={false} {...h} />);
        expect(screen.queryByRole('button', { name: 'review.publish' })).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'review.restore' }));
        expect(h.onRestore).toHaveBeenCalled();
    });
});

describe('ImportDraftEditor', () => {
    const renderEditor = () => {
        const onSave = vi.fn();
        const onCancel = vi.fn();
        render(<ImportDraftEditor draft={draft()} saving={false} error={null} onSave={onSave} onCancel={onCancel} />);
        return { onSave, onCancel };
    };

    it('sends only the corrected fields', () => {
        const { onSave } = renderEditor();
        fireEvent.change(screen.getByLabelText('review.fields.price'), { target: { value: '135000' } });
        fireEvent.change(screen.getByLabelText('review.fields.city'), { target: { value: 'Kotor' } });
        fireEvent.click(screen.getAllByRole('button', { name: 'review.removePhoto' })[1]);
        fireEvent.click(screen.getByRole('button', { name: 'review.save' }));
        expect(onSave).toHaveBeenCalledWith({
            price: 135000,
            city: 'Kotor',
            images: ['https://src.example/a.jpg'],
        });
    });

    it('closes without saving when nothing changed', () => {
        const { onSave, onCancel } = renderEditor();
        fireEvent.click(screen.getByRole('button', { name: 'review.save' }));
        expect(onSave).not.toHaveBeenCalled();
        expect(onCancel).toHaveBeenCalled();
    });
});
