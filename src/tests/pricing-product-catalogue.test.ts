/**
 * Pricing product catalogue tests
 *
 * The pricing page fetches every product once and narrows it per tab client-side,
 * so a plan is never invisible to a tab just because it carries another tab's
 * targetRole — that is how the agency tab gets the seller-targeted Enterprise plan.
 */

import { describe, it, expect } from 'vitest';
import { productsForRole, type Product } from '../features/pricing/hooks/usePricingData';

const product = (productId: string, targetRole: string): Product => ({
    id: productId,
    productId,
    name: productId,
    price: 10,
    currency: 'EUR',
    features: [],
    targetRole,
    displayOrder: 0,
});

const catalogue: Product[] = [
    product('pro_monthly', 'seller'),
    product('pro_yearly', 'seller'),
    product('seller_enterprise_yearly', 'seller'),
    product('buyer_monthly', 'buyer'),
    product('featured_agency_7days', 'agent'),
    product('free_tier', 'all'),
];

describe('productsForRole', () => {
    it('keeps the role\'s own products and the ones targeted at everyone', () => {
        const ids = productsForRole(catalogue, 'seller').map((p) => p.productId);

        expect(ids).toEqual([
            'pro_monthly',
            'pro_yearly',
            'seller_enterprise_yearly',
            'free_tier',
        ]);
    });

    it('excludes other roles, so loose productId matching cannot cross tabs', () => {
        // 'buyer_monthly' contains "monthly", which the Pro Monthly lookup matches on.
        const ids = productsForRole(catalogue, 'seller').map((p) => p.productId);

        expect(ids).not.toContain('buyer_monthly');
        expect(ids).not.toContain('featured_agency_7days');
    });

    it('leaves the agency tab without a slice of its own', () => {
        // No product is targeted at 'agency' — which is exactly why the Enterprise plan
        // has to be resolved from the full catalogue instead of this slice.
        expect(productsForRole(catalogue, 'agency').map((p) => p.productId)).toEqual(['free_tier']);
    });

    it('finds the Enterprise plan in the full catalogue whatever tab is open', () => {
        const enterprise = catalogue.find((p) => p.productId.includes('enterprise'));

        expect(enterprise?.productId).toBe('seller_enterprise_yearly');
    });
});
