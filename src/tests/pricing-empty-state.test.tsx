/**
 * Pricing page empty-state tests
 *
 * `products` is fetched per active tab (role=seller|buyer|listing|agency), but only
 * the seller and buyer tabs render from it. The listing and agency tabs are driven by
 * promotion plans, so an empty `products` list there says nothing about whether the
 * tab has anything to show — and the "No pricing plans" notice must stay hidden.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const hookState = {
    activeTab: 'agency' as 'seller' | 'buyer' | 'listing' | 'agency',
    products: [] as unknown[],
};

vi.mock('../features/pricing/components/usePricingPage', () => ({
    formatLimit: (v?: number) => (v === -1 ? 'Unlimited' : String(v ?? 0)),
    buildLocalizedPath: (p: string) => p,
    usePricingPage: () => ({
        t: (key: string, defaultValue?: string | Record<string, unknown>) =>
            typeof defaultValue === 'string' ? defaultValue : key,
        state: { isAuthenticated: false, currentUser: null },
        dispatch: vi.fn(),
        activeTab: hookState.activeTab,
        setActiveTab: vi.fn(),
        showPaymentWindow: false,
        setShowPaymentWindow: vi.fn(),
        selectedPlan: null,
        setSelectedPlan: vi.fn(),
        showContactOptions: false,
        setShowContactOptions: vi.fn(),
        selectedPromoTier: null,
        setSelectedPromoTier: vi.fn(),
        selectedListing: null,
        setSelectedListing: vi.fn(),
        selectedDuration: 30,
        setSelectedDuration: vi.fn(),
        selectedAgencyDuration: 28,
        setSelectedAgencyDuration: vi.fn(),
        loading: false,
        error: null,
        userListings: [],
        loadingListings: false,
        isRefetching: false,
        salesEmail: 'sales@example.com',
        salesPhone: '+000',
        products: hookState.products,
        enterpriseProduct: undefined,
        proYearlyProduct: undefined,
        proMonthlyProduct: undefined,
        buyerProduct: undefined,
        agencyFeaturePlans: [],
        specialOffers: [],
        loadingPlans: false,
        getPromotionPrice: () => 0,
        getAgencyPrice: () => 0,
        getUserRole: () => 'seller',
        handleBack: vi.fn(),
        handleLegalNavigation: vi.fn(),
        handlePlanSelection: vi.fn(),
        handlePaymentSuccess: vi.fn(),
        handlePaymentError: vi.fn(),
        handlePromoteListing: vi.fn(),
        handleSelectListingForPromotion: vi.fn(),
        handlePurchasePromotion: vi.fn(),
        handleAgencyFeature: vi.fn(),
        isActivePlan: () => false,
        isPlanDisabled: () => false,
        selectedOfferId: null,
        setSelectedOfferId: vi.fn(),
        handleSelectOffer: vi.fn(),
        handlePurchaseSpecialOffer: vi.fn(),
    }),
}));

vi.mock('@/components/shared/Footer', () => ({ default: () => null }));
vi.mock('@/components/shared/PaymentWindow', () => ({ default: () => null }));

import PricingPage from '../features/pricing/components/PricingPage';

const NO_PLANS = 'No pricing plans available at the moment.';

describe('PricingPage — "no plans" notice', () => {
    beforeEach(() => {
        hookState.products = [];
    });

    it('stays hidden on the agency tab, which renders promotion plans rather than products', () => {
        hookState.activeTab = 'agency';
        render(<PricingPage />);

        expect(screen.queryByText(NO_PLANS)).not.toBeInTheDocument();
    });

    it('stays hidden on the listing tab for the same reason', () => {
        hookState.activeTab = 'listing';
        render(<PricingPage />);

        expect(screen.queryByText(NO_PLANS)).not.toBeInTheDocument();
    });

    it('still shows on the seller tab when there are genuinely no products', () => {
        hookState.activeTab = 'seller';
        render(<PricingPage />);

        expect(screen.getByText(NO_PLANS)).toBeInTheDocument();
    });

    it('still shows on the buyer tab when there are genuinely no products', () => {
        hookState.activeTab = 'buyer';
        render(<PricingPage />);

        expect(screen.getByText(NO_PLANS)).toBeInTheDocument();
    });
});
