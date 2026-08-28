/**
 * Agency tab Enterprise plan tests
 *
 * The Enterprise plan is seeded with targetRole 'seller', but the Agency tab
 * fetches products with role=agency — so the plan has to be sourced from the
 * seller product list for the card to appear there at all.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AgencyFeatureSection from '../features/pricing/components/AgencyFeatureSection';
import type { Product } from '../features/pricing/hooks/usePricingData';

// Translation stub mirroring i18next: a string second argument is the default,
// an options object is not — in that case the key comes back untranslated.
const t = (key: string, defaultValue?: string | Record<string, unknown>) =>
    typeof defaultValue === 'string' ? defaultValue : key;

const enterpriseProduct: Product = {
    id: '1',
    productId: 'seller_enterprise_yearly',
    name: 'Enterprise',
    description: 'Complete solution for real estate agencies',
    price: 499,
    currency: 'EUR',
    billingPeriod: 'yearly',
    features: ['Unlimited team members', 'Agency branding page'],
    targetRole: 'seller',
    displayOrder: 3,
    listingsLimit: 750,
    promotionCoupons: 5,
};

const renderSection = (props: Partial<React.ComponentProps<typeof AgencyFeatureSection>> = {}) =>
    render(
        <AgencyFeatureSection
            t={t}
            currentUserAgencyId={undefined}
            agencyFeaturePlans={[]}
            loadingPlans={false}
            getAgencyPrice={() => 24.99}
            selectedAgencyDuration={28}
            setSelectedAgencyDuration={() => {}}
            onAgencyFeature={() => {}}
            enterpriseProduct={enterpriseProduct}
            onPlanSelection={() => {}}
            isActivePlan={() => false}
            isPlanDisabled={() => false}
            {...props}
        />
    );

describe('AgencyFeatureSection — Enterprise plan', () => {
    it('shows the Enterprise card on the agency tab', () => {
        renderSection();

        expect(screen.getByText('Agency Enterprise Plan')).toBeInTheDocument();
        expect(screen.getByText('Enterprise')).toBeInTheDocument();
        expect(screen.getByText('BEST FOR TEAMS')).toBeInTheDocument();
        expect(screen.getByText('Unlimited team members')).toBeInTheDocument();
    });

    it('starts checkout with the Enterprise product when the CTA is clicked', () => {
        const onPlanSelection = vi.fn();
        renderSection({ onPlanSelection });

        fireEvent.click(screen.getByRole('button', { name: /Get Started/i }));

        expect(onPlanSelection).toHaveBeenCalledWith(enterpriseProduct);
    });

    it('marks the card as the current plan when the user is subscribed', () => {
        renderSection({ isActivePlan: () => true });

        expect(screen.getByText('Current Plan')).toBeInTheDocument();
    });

    it('renders nothing for Enterprise when the product is unavailable', () => {
        renderSection({ enterpriseProduct: undefined });

        expect(screen.queryByText('Agency Enterprise Plan')).not.toBeInTheDocument();
    });
});
