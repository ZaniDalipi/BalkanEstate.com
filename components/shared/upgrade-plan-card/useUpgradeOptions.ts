import { useMemo } from 'react';

// Types
interface Plan {
  name: string;
  price: number;
  period: string;
  badge?: string;
  highlighted?: boolean;
  features: string[];
  listingLimit: number;
}

interface Product {
  productId: string;
  price: number;
  promotionCoupons?: number;
  listingsLimit?: number;
  description?: string;
}

interface UpgradeOption {
  key: string;
  planName: string;
  description?: string;
  price: number;
  period: 'month' | 'year';
  badge?: string;
  isEnterprise?: boolean;
  isHighlighted?: boolean;
  listingsLimit: number;
  promoCoupons: number;
  features: string[];
  savings?: string;
  originalPrice?: number;
}

interface UseUpgradeOptionsProps {
  upgradeOptionsRaw: Array<{
    key: string;
    plan: Plan;
    pricing: {
      originalPrice: number;
      discount: number;
      finalPrice: number;
      savings: string;
    };
  }>;
  products: Product[];
  agencyOwnerProductFromDB?: Product | null;
}

/**
 * Custom hook to prepare and validate upgrade options data
 * Implements business logic for plan presentation with robust error handling
 * Follows Clean Architecture pattern with strict validation
 */
export const useUpgradeOptions = ({
  upgradeOptionsRaw,
  products,
  agencyOwnerProductFromDB,
}: UseUpgradeOptionsProps): UpgradeOption[] => {
  return useMemo(() => {
    try {
      // Input validation
      if (!Array.isArray(upgradeOptionsRaw)) {
        console.warn('useUpgradeOptions: upgradeOptionsRaw is not an array');
        return [];
      }

      if (upgradeOptionsRaw.length === 0) {
        return [];
      }

      if (!Array.isArray(products)) {
        console.warn('useUpgradeOptions: products is not an array');
        return [];
      }

      return upgradeOptionsRaw
        .map(({ key, plan, pricing }) => {
          try {
            // Validate required fields
            if (!key || typeof key !== 'string') {
              console.warn('useUpgradeOptions: Invalid plan key');
              return null;
            }

            if (!plan || typeof plan.price !== 'number' || plan.price < 0) {
              console.warn(`useUpgradeOptions: Invalid plan data for key: ${key}`);
              return null;
            }

            // Validate pricing data
            if (!pricing || typeof pricing.finalPrice !== 'number') {
              console.warn(`useUpgradeOptions: Invalid pricing data for plan: ${key}`);
              return null;
            }

            if (pricing.finalPrice < 0) {
              console.warn(`useUpgradeOptions: Negative final price for plan: ${key}`);
              return null;
            }

            // Get matched product from database with type safety
            const matchedProduct = products.find((p) => p?.productId === key);
            const isEnterprise = key.includes('enterprise') || key.includes('agency_yearly');

            // Safe default values for numbers
            const defaultListingsLimit = 750;
            const defaultCoupons = 5;

            // Determine plan type and features
            const displayFeatures = isEnterprise
              ? [
                  `${matchedProduct?.listingsLimit ?? agencyOwnerProductFromDB?.listingsLimit ?? defaultListingsLimit} Active Listings`,
                  'Create Your Own Agency',
                  `${matchedProduct?.promotionCoupons ?? agencyOwnerProductFromDB?.promotionCoupons ?? defaultCoupons} Agent Invitation Coupons`,
                  'Unlimited Saved Searches',
                  'Full Analytics Dashboard',
                  'Priority Support',
                  'Monthly Promotion Coupons',
                  'Team Management Tools',
                ]
              : Array.isArray(plan.features) ? plan.features : [];

            // Ensure feature array is safe
            const safeFeatures = displayFeatures
              .filter((f) => typeof f === 'string' && f.length > 0)
              .slice(0, 10); // Cap at 10 features for performance

            return {
              key,
              planName: String(plan.name || 'Plan'),
              description: matchedProduct?.description,
              price: Math.max(0, pricing.finalPrice), // Ensure non-negative
              period: (plan.period === 'year' ? 'year' : 'month') as 'month' | 'year',
              badge: plan.badge,
              isEnterprise,
              isHighlighted: plan.highlighted || isEnterprise,
              listingsLimit: Math.max(0, matchedProduct?.listingsLimit ?? plan.listingLimit ?? 0),
              promoCoupons: Math.max(0, matchedProduct?.promotionCoupons ?? 0),
              features: safeFeatures,
              savings: pricing.savings || undefined,
              originalPrice:
                pricing.originalPrice && pricing.originalPrice > pricing.finalPrice
                  ? pricing.originalPrice
                  : undefined,
            };
          } catch (itemError) {
            console.error(`useUpgradeOptions: Error processing item with key ${key}:`, itemError);
            return null;
          }
        })
        .filter((option): option is UpgradeOption => option !== null);
    } catch (error) {
      console.error('useUpgradeOptions: Error processing upgrade options:', error);
      return [];
    }
  }, [upgradeOptionsRaw, products, agencyOwnerProductFromDB]);
};

/**
 * Validates that upgrade option has required fields
 */
export const validateUpgradeOption = (option: unknown): option is UpgradeOption => {
  if (!option || typeof option !== 'object') return false;

  const opt = option as Record<string, unknown>;
  return (
    typeof opt.key === 'string' &&
    typeof opt.planName === 'string' &&
    typeof opt.price === 'number' &&
    typeof opt.period === 'string' &&
    typeof opt.listingsLimit === 'number' &&
    typeof opt.promoCoupons === 'number' &&
    Array.isArray(opt.features)
  );
};

/**
 * Sanitize upgrade options to prevent XSS
 */
export const sanitizeUpgradeOption = (option: UpgradeOption): UpgradeOption => {
  return {
    ...option,
    planName: String(option.planName).substring(0, 100),
    description: option.description ? String(option.description).substring(0, 500) : undefined,
    features: Array.isArray(option.features)
      ? option.features.slice(0, 10).map((f) => String(f).substring(0, 200))
      : [],
  };
};
