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
 * Implements business logic for plan presentation
 * Follows Clean Architecture pattern
 */
export const useUpgradeOptions = ({
  upgradeOptionsRaw,
  products,
  agencyOwnerProductFromDB,
}: UseUpgradeOptionsProps): UpgradeOption[] => {
  return useMemo(() => {
    try {
      if (!Array.isArray(upgradeOptionsRaw) || upgradeOptionsRaw.length === 0) {
        return [];
      }

      return upgradeOptionsRaw.map(({ key, plan, pricing }) => {
        // Validation
        if (!plan || typeof plan.price !== 'number') {
          console.warn(`Invalid plan data for key: ${key}`);
          return null;
        }

        // Get matched product from database
        const matchedProduct = products.find((p) => p.productId === key);
        const isEnterprise = key.includes('enterprise') || key.includes('agency_yearly');

        // Validate pricing data
        if (pricing.finalPrice < 0) {
          console.warn(`Invalid final price for plan: ${key}`);
          return null;
        }

        // Determine plan type and features
        const displayFeatures = isEnterprise
          ? [
              `${matchedProduct?.listingsLimit ?? agencyOwnerProductFromDB?.listingsLimit ?? 750} Active Listings`,
              'Create Your Own Agency',
              `${matchedProduct?.promotionCoupons ?? agencyOwnerProductFromDB?.promotionCoupons ?? 5} Agent Invitation Coupons`,
              'Unlimited Saved Searches',
              'Full Analytics Dashboard',
              'Priority Support',
              'Monthly Promotion Coupons',
              'Team Management Tools',
            ]
          : plan.features || [];

        return {
          key,
          planName: plan.name,
          description: matchedProduct?.description,
          price: pricing.finalPrice,
          period: (plan.period === 'year' ? 'year' : 'month') as 'month' | 'year',
          badge: plan.badge,
          isEnterprise,
          isHighlighted: plan.highlighted || isEnterprise,
          listingsLimit: matchedProduct?.listingsLimit ?? plan.listingLimit ?? 0,
          promoCoupons: matchedProduct?.promotionCoupons ?? 0,
          features: displayFeatures,
          savings: pricing.savings || undefined,
          originalPrice: pricing.originalPrice !== pricing.finalPrice ? pricing.originalPrice : undefined,
        };
      }).filter((option): option is UpgradeOption => option !== null);
    } catch (error) {
      console.error('Error processing upgrade options:', error);
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
