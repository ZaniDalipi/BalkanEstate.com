/**
 * An unfinished new listing is kept on the device for 3 days: leaving the
 * create-listing form and coming back restores what the seller had entered,
 * and publishing the listing clears it.
 */

import 'fake-indexeddb/auto';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { renderHook, waitFor as rtlWaitFor, act } from '@testing-library/react';

// IndexedDB round-trips can be slow when the whole suite runs in parallel
const waitFor: typeof rtlWaitFor = (cb, options) => rtlWaitFor(cb, { timeout: 10000, ...options });
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

const appState: Record<string, unknown> = {
    currentUser: { id: 'user-1', role: 'private_seller', subscription: {} },
    properties: [],
    activeView: 'create-listing',
    isPricingModalOpen: false,
    pendingProperty: null,
    isAuthenticating: false,
    isLoadingUserData: false,
};
vi.mock('@/context/AppContext', () => ({
    useAppContext: () => ({
        state: appState,
        dispatch: vi.fn(),
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

const { useListingForm } = await import('@/src/features/seller/components/useListingForm');
const storage = await import('@/src/features/seller/utils/listingDraftStorage');

const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);

const key = storage.draftKey('user-1', 'sale');

beforeEach(async () => {
    if (!URL.createObjectURL) (URL as any).createObjectURL = () => 'blob:test';
    await storage.clearListingDraft(key);
});
afterEach(() => vi.useRealTimers());

const fillForm = async () => {
    const hook = renderHook(() => useListingForm(null, null), { wrapper });
    await waitFor(() => expect(hook.result.current.restoredDraft).toBeNull());
    act(() => {
        hook.result.current.setListingData((prev: any) => ({ ...prev, title: 'Sunny flat', price: 90000 }));
        hook.result.current.setImages([{ file: new File(['x'], 'a.jpg', { type: 'image/jpeg' }), previewUrl: 'blob:old' }]);
        hook.result.current.setStep('form');
    });
    // Autosave kicks in once the form has checked for an earlier draft
    await waitFor(async () => expect((await storage.loadListingDraft(key))?.listingData.title).toBe('Sunny flat'));
    return hook;
};

describe('unfinished listing drafts', { timeout: 30000 }, () => {
    it('restores what was entered after leaving the form', async () => {
        const first = await fillForm();
        act(() => first.result.current.setListingData((prev: any) => ({ ...prev, title: 'Sunny flat, sea view' })));
        first.unmount(); // going back saves immediately, without waiting for the autosave delay
        await waitFor(async () => expect((await storage.loadListingDraft(key))?.listingData.title).toBe('Sunny flat, sea view'));

        const { result } = renderHook(() => useListingForm(null, null), { wrapper });
        await waitFor(() => expect(result.current.restoredDraft).not.toBeNull());
        expect(result.current.step).toBe('form');
        expect(result.current.listingData).toMatchObject({ title: 'Sunny flat, sea view', price: 90000 });
        expect(result.current.images).toHaveLength(1);
        expect(result.current.images[0].file?.name).toBe('a.jpg');
        expect(result.current.restoredDraft!.expiresAt - result.current.restoredDraft!.savedAt)
            .toBe(3 * 24 * 60 * 60 * 1000);
    });

    it('drops drafts older than 3 days', async () => {
        const first = await fillForm();
        first.unmount();
        await waitFor(async () => expect(await storage.loadListingDraft(key)).not.toBeNull());

        const draft = (await storage.loadListingDraft(key))!;
        await storage.saveListingDraft(key, { ...draft, savedAt: Date.now() - storage.LISTING_DRAFT_TTL_MS - 1000 });
        expect(await storage.loadListingDraft(key)).toBeNull();
        expect(await storage.listListingDrafts('user-1')).toEqual([]);
    });

    it('clears the draft once the listing is published, and on discard', async () => {
        const first = await fillForm();
        first.unmount();
        await waitFor(async () => expect(await storage.loadListingDraft(key)).not.toBeNull());

        const { result, unmount } = renderHook(() => useListingForm(null, null), { wrapper });
        await waitFor(() => expect(result.current.restoredDraft).not.toBeNull());
        act(() => result.current.setStep('success'));
        unmount();
        await waitFor(async () => expect(await storage.loadListingDraft(key)).toBeNull());

        const again = await fillForm();
        again.unmount();
        await waitFor(async () => expect(await storage.loadListingDraft(key)).not.toBeNull());
        const third = renderHook(() => useListingForm(null, null), { wrapper });
        await waitFor(() => expect(third.result.current.restoredDraft).not.toBeNull());
        act(() => third.result.current.discardDraft());
        expect(third.result.current.listingData.title).toBe('');
        await waitFor(async () => expect(await storage.loadListingDraft(key)).toBeNull());
    });

    it('does not keep drafts when editing an existing listing', async () => {
        const existing = { id: 'p1', title: 'Existing', images: [], listingType: 'sale' } as never;
        const { result, unmount } = renderHook(
            () => useListingForm(existing, null),
            { wrapper },
        );
        await waitFor(() => expect(result.current.step).toBe('form'));
        unmount();
        expect(await storage.loadListingDraft(key)).toBeNull();
    });
});
