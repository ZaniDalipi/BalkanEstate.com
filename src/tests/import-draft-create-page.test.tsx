/**
 * Opening an imported draft with "Edit" lands on the real create-listing page
 * with the draft's values already in the form, ready to correct and publish.
 */
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string, fallback?: unknown) => (typeof fallback === 'string' ? fallback : key), i18n: { language: 'en', changeLanguage: vi.fn() } }),
    initReactI18next: { type: '3rdParty', init: () => {} },
    Trans: ({ children }: { children?: React.ReactNode }) => children,
}));
vi.mock('@/services/geminiService', () => ({ generateDescriptionFromImages: vi.fn(), calculatePropertyDistances: vi.fn() }));
vi.mock('browser-image-compression', () => ({ default: vi.fn() }));
vi.mock('@/services/apiService', () => ({}));
vi.mock('@/src/features/seller/components/MapLocationPicker', () => ({ default: () => <div data-testid="map" /> }));
vi.mock('@/components/shared/Footer', () => ({ default: () => null }));
vi.mock('@sentry/react', () => {
    const passthrough = ({ children }: { children?: React.ReactNode }) => children;
    return {
        ErrorBoundary: passthrough,
        withProfiler: <T,>(c: T) => c,
        withErrorBoundary: <T,>(c: T) => c,
        captureException: vi.fn(), captureMessage: vi.fn(), init: vi.fn(), setUser: vi.fn(),
        withScope: vi.fn(), addBreadcrumb: vi.fn(),
        browserTracingIntegration: vi.fn(), replayIntegration: vi.fn(),
    };
});

// Built the way the app builds it: the draft's stored listing through toPreviewProperty.
const { toPreviewProperty } = await import('@/src/features/listing-sources/utils/draftPreview');
const draftProperty = toPreviewProperty({
    id: 'draft-1',
    fetchedAt: '2026-09-25T10:00:00.000Z',
    listing: {
        title: 'Luksuzan stan s privatnim vrtom', listingType: 'sale', propertyType: 'apartment',
        price: 420000, sqft: 130, beds: 3, baths: 2, address: 'Diklovac', city: 'Zadar', country: 'Croatia',
        description: 'Na jednoj od najtraženijih lokacija u Zadru',
        imageUrl: 'https://src.example/a.jpg', images: [{ url: 'https://src.example/a.jpg', tag: 'other' }],
        lat: 44.1, lng: 15.2,
    },
} as never);
const appState = {
    currentUser: { id: 'u1', name: 'Agent', role: 'agent', phone: '+385' }, properties: [], activeView: 'create-listing',
    isPricingModalOpen: false, pendingProperty: null, isAuthenticating: false, isLoadingUserData: false,
    propertyToEdit: null, importDraftToPublish: { draftId: 'draft-1', property: draftProperty },
};
vi.mock('@/context/AppContext', () => ({
    useAppContext: () => ({ state: appState, dispatch: vi.fn(), updateUser: vi.fn(), createListing: vi.fn(), updateListing: vi.fn() }),
}));
vi.mock('@/context/AlertContext', () => ({
    useAlert: () => ({ showError: vi.fn(), showWarning: vi.fn(), showSuccess: vi.fn(), showInfo: vi.fn(), closeAlert: vi.fn() }),
}));

const { default: CreateListingPage } = await import('@/src/features/seller/components/SellerDashboard');

describe('editing an imported draft', () => {
    it('opens the create-listing form filled with the draft', async () => {
        render(<QueryClientProvider client={new QueryClient()}><CreateListingPage /></QueryClientProvider>);
        expect(await screen.findByDisplayValue('Luksuzan stan s privatnim vrtom')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Diklovac')).toBeInTheDocument();
        expect(screen.getByText('listingFeeds:review.formTitle')).toBeInTheDocument();
    });
});
