/**
 * Listings fetched from a user's external feed wait in a review queue until
 * the owner publishes them. These cover what the owner relies on there: a
 * draft missing essentials can't be published, an update shows what the feed
 * wants to change, and the full-size review shows (live, while editing)
 * exactly the listing that will be published.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => key.split(':').pop() ?? key,
        i18n: { language: 'en', changeLanguage: vi.fn() },
    }),
    Trans: ({ children }: { children?: React.ReactNode }) => children,
}));

// The shared listing components are covered by their own tests; stubs keep
// this suite on what the review adds — which values reach them.
vi.mock('@/src/components/property', () => ({
    PropertyGallery: () => <div data-testid="gallery" />,
    PropertyPhotos: () => <div data-testid="photos" />,
    PropertyMapLink: () => null,
    PropertyInfo: ({ property }: { property: { title?: string; city?: string; price: number } }) => (
        <div data-testid="listing">{`${property.title} | ${property.city} | ${property.price}`}</div>
    ),
}));
vi.mock('@/src/features/rental/components/RentalTermsSection', () => ({ default: () => null }));
vi.mock('@/src/features/property-details/components/ImageViewerModal', () => ({ default: () => null }));

const mockEdit = vi.fn();
vi.mock('@/src/features/listing-sources/hooks/useImportReview', () => ({
    useImportReviewActions: () => ({ edit: { mutateAsync: mockEdit, isPending: false } }),
}));

import ImportDraftCard from '@/src/features/listing-sources/components/review/ImportDraftCard';
import DraftReviewContent from '@/src/features/listing-sources/components/review/DraftReviewContent';
import { toPreviewProperty } from '@/src/features/listing-sources/utils/draftPreview';
import type { DraftFields, ImportedDraft, ImportedDraftDetail } from '@/src/features/listing-sources/api/importReviewApi';

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
    onSelect: vi.fn(), onOpen: vi.fn(), onEdit: vi.fn(), onAccept: vi.fn(), onReject: vi.fn(), onRestore: vi.fn(),
});

describe('ImportDraftCard', () => {
    it('opens the full-size review from the title', () => {
        const h = cardHandlers();
        render(<ImportDraftCard draft={draft()} selected={false} busy={false} {...h} />);
        fireEvent.click(screen.getByRole('button', { name: 'Sea view flat' }));
        expect(h.onOpen).toHaveBeenCalled();
    });

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


const detail = (overrides: Partial<ImportedDraftDetail> = {}): ImportedDraftDetail => ({
    ...draft(),
    listing: {
        title: 'Sea view flat',
        city: 'Budva',
        country: 'Montenegro',
        price: 120000,
        listingType: 'sale',
        propertyType: 'apartment',
        imageUrl: 'https://src.example/a.jpg',
        images: [{ url: 'https://src.example/a.jpg', tag: 'other' }, { url: 'https://src.example/b.jpg', tag: 'other' }],
        lat: 42.28,
        lng: 18.84,
    },
    ...overrides,
});

describe('toPreviewProperty', () => {
    it('lays unsaved edits over the stored listing', () => {
        const property = toPreviewProperty(detail(), { price: 99000, images: ['https://src.example/b.jpg'] });
        expect(property.price).toBe(99000);
        expect(property.city).toBe('Budva');
        expect(property.images.map((i) => i.url)).toEqual(['https://src.example/b.jpg']);
        expect(property.imageUrl).toBe('https://src.example/b.jpg');
    });
});

describe('DraftReviewContent', () => {
    const renderReview = (initialMode: 'preview' | 'edit' = 'preview') => {
        const onDecision = vi.fn();
        render(
            <DraftReviewContent
                draft={detail()}
                position={{ index: 2, total: 24 }}
                initialMode={initialMode}
                busy={false}
                error={null}
                onDecision={onDecision}
            />
        );
        return { onDecision };
    };

    it('shows the listing as buyers will see it, with its place in the queue', () => {
        renderReview();
        expect(screen.getByTestId('listing')).toHaveTextContent('Sea view flat | Budva | 120000');
        expect(screen.getByTestId('gallery')).toBeInTheDocument();
        expect(screen.getByText('review.position')).toBeInTheDocument();
    });

    it('updates the preview while the owner types', () => {
        renderReview('edit');
        fireEvent.change(screen.getByLabelText('review.fields.price'), { target: { value: '135000' } });
        fireEvent.change(screen.getByLabelText('review.fields.city'), { target: { value: 'Kotor' } });
        expect(screen.getByTestId('listing')).toHaveTextContent('Sea view flat | Kotor | 135000');
    });

    it('saves unsaved edits before publishing', async () => {
        mockEdit.mockResolvedValue({});
        const { onDecision } = renderReview('edit');
        fireEvent.change(screen.getByLabelText('review.fields.price'), { target: { value: '135000' } });
        fireEvent.click(screen.getByRole('button', { name: 'review.saveAndPublish' }));
        await waitFor(() => expect(onDecision).toHaveBeenCalledWith('accept'));
        expect(mockEdit).toHaveBeenCalledWith({ id: 'd1', data: { price: 135000 } });
    });

    it('will not publish once the city is cleared', () => {
        renderReview('edit');
        fireEvent.change(screen.getByLabelText('review.fields.city'), { target: { value: '' } });
        expect(screen.getByRole('button', { name: 'review.saveAndPublish' })).toBeDisabled();
    });

    it('rejects from the full view', () => {
        const { onDecision } = renderReview();
        fireEvent.click(screen.getByRole('button', { name: 'review.reject' }));
        expect(onDecision).toHaveBeenCalledWith('reject');
    });
});
