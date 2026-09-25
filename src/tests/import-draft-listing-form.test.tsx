/**
 * An imported draft is edited in the real create-listing form: the form opens
 * prefilled with the feed's values and behaves as a new listing, and once
 * created the listing is linked back to its draft so the feed's next sync
 * recognises it instead of queueing it again.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
    initReactI18next: { type: '3rdParty', init: () => {} },
}));
vi.mock('@/services/geminiService', () => ({
    generateDescriptionFromImages: vi.fn(),
    calculatePropertyDistances: vi.fn(),
}));
vi.mock('browser-image-compression', () => ({ default: vi.fn() }));
vi.mock('@/services/apiService', () => ({}));

const mockDispatch = vi.fn();
const appState: Record<string, unknown> = {
    currentUser: null,
    properties: [],
    activeView: 'create-listing',
    isPricingModalOpen: false,
    pendingProperty: null,
    isAuthenticating: false,
    isLoadingUserData: false,
    importDraftToPublish: null,
};
vi.mock('@/context/AppContext', () => ({
    useAppContext: () => ({
        state: appState,
        dispatch: mockDispatch,
        updateUser: vi.fn(),
        createListing: vi.fn(),
        updateListing: vi.fn(),
    }),
}));
vi.mock('@/context/AlertContext', () => ({
    useAlert: () => ({
        showError: vi.fn(), showWarning: vi.fn(), showSuccess: vi.fn(), showInfo: vi.fn(), closeAlert: vi.fn(),
    }),
}));

const mockLink = vi.fn();
vi.mock('@/src/features/listing-sources/api/importReviewApi', () => ({
    linkImportDraft: (...args: unknown[]) => mockLink(...args),
    getImportDraft: vi.fn(),
}));

const { useListingForm } = await import('@/src/features/seller/components/useListingForm');
const { useImportDraftPrefill } = await import('@/src/features/listing-sources/hooks/useDraftListingForm');

const draftProperty = {
    id: 'draft-1',
    title: 'Luksuzan stan s privatnim vrtom',
    listingType: 'sale',
    propertyType: 'apartment',
    price: 420000,
    sqft: 130,
    beds: 3,
    baths: 2,
    address: 'Diklovac',
    city: 'Zadar',
    country: 'Croatia',
    description: 'Na jednoj od najtraženijih lokacija u Zadru',
    images: [{ url: 'https://src.example/a.jpg', tag: 'other' }, { url: 'https://src.example/b.jpg', tag: 'other' }],
    lat: 44.1,
    lng: 15.2,
} as never;

const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);

beforeEach(() => {
    vi.clearAllMocks();
    appState.importDraftToPublish = null;
});

describe('the create-listing form with an imported draft', () => {
    it('opens on the form, prefilled with the draft, as a new listing', async () => {
        const prefill = { property: draftProperty, onCreated: vi.fn() };
        const { result } = renderHook(() => useListingForm(null, prefill), { wrapper });

        await waitFor(() => expect(result.current.step).toBe('form'));
        expect(result.current.listingData).toMatchObject({
            title: 'Luksuzan stan s privatnim vrtom',
            price: 420000,
            sq_meters: 130,
            bedrooms: 3,
            streetAddress: 'Diklovac',
            lat: 44.1,
        });
        expect(result.current.selectedCity).toBe('Zadar');
        expect(result.current.images.map((i: { previewUrl: string }) => i.previewUrl)).toEqual([
            'https://src.example/a.jpg',
            'https://src.example/b.jpg',
        ]);
    });
});

describe('useImportDraftPrefill', () => {
    it('is empty when no draft is being published', () => {
        const { result } = renderHook(() => useImportDraftPrefill(), { wrapper });
        expect(result.current).toBeNull();
    });

    it('links the created listing to its draft and returns to Imported Drafts', async () => {
        appState.importDraftToPublish = { draftId: 'draft-1', property: draftProperty };
        mockLink.mockResolvedValue({ propertyId: 'p1' });
        const { result } = renderHook(() => useImportDraftPrefill(), { wrapper });

        await result.current!.onCreated({ id: 'p1' } as never);
        expect(mockLink).toHaveBeenCalledWith('draft-1', 'p1');
        expect(mockDispatch).toHaveBeenCalledWith({ type: 'SET_ACCOUNT_TAB', payload: 'importReview' });
    });
});
