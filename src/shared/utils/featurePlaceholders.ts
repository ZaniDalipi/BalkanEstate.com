/**
 * Feature Placeholders Utility
 *
 * Allows dynamic values in pricing features using placeholders like {listingsLimit}
 * These get replaced with actual product values when displayed.
 *
 * Example: "{listingsLimit} listings per month" -> "250 listings per month"
 */

export interface ProductValues {
  // Listing limits
  listingsLimit?: number;

  // Promotion coupons
  promotionCoupons?: number;
  premiumCoupons?: number;
  highlightedCoupons?: number;
  featuredCoupons?: number;

  // Agency features
  agentCoupons?: number;
  teamMembersLimit?: number;

  // AI limits
  aiMessagesLimit?: number;
  aiInsightsLimit?: number;
  imageDescriptionLimit?: number;

  // Other limits
  savedSearchesLimit?: number;
  maxActiveSubscriptions?: number;

  // Pricing
  price?: number;
  durationDays?: number;
}

/**
 * Available placeholders with descriptions for admin UI
 */
export const availablePlaceholders = [
  { key: '{listingsLimit}', label: 'Listings Limit', description: 'Number of active listings allowed', example: '250' },
  { key: '{promotionCoupons}', label: 'Promo Coupons', description: 'Total monthly promotion coupons', example: '5' },
  { key: '{premiumCoupons}', label: 'Premium Coupons', description: 'Premium promotion coupons per month', example: '2' },
  { key: '{highlightedCoupons}', label: 'Highlighted Coupons', description: 'Highlighted coupons per month', example: '2' },
  { key: '{featuredCoupons}', label: 'Featured Coupons', description: 'Featured coupons per month', example: '1' },
  { key: '{agentCoupons}', label: 'Agent Coupons', description: 'Coupons for inviting agents', example: '5' },
  { key: '{teamMembersLimit}', label: 'Team Members', description: 'Maximum team members allowed', example: '10' },
  { key: '{aiMessagesLimit}', label: 'AI Messages', description: 'AI chat messages per month (-1 = unlimited)', example: '100' },
  { key: '{aiInsightsLimit}', label: 'AI Insights', description: 'AI insights per month (-1 = unlimited)', example: '50' },
  { key: '{imageDescriptionLimit}', label: 'Image Descriptions', description: 'Auto image descriptions per month', example: '20' },
  { key: '{savedSearchesLimit}', label: 'Saved Searches', description: 'Saved searches limit (-1 = unlimited)', example: '10' },
  { key: '{price}', label: 'Price', description: 'Product price', example: '29' },
  { key: '{durationDays}', label: 'Duration Days', description: 'Subscription duration in days', example: '30' },
];

/**
 * Format a value for display
 * -1 means unlimited, 0 might mean not available
 */
function formatValue(value: number | undefined, defaultValue: string = '0'): string {
  if (value === undefined) return defaultValue;
  if (value === -1) return 'Unlimited';
  return value.toString();
}

/**
 * Replace placeholders in a feature string with actual product values
 *
 * @param feature - The feature string with placeholders like "{listingsLimit} listings"
 * @param product - The product object containing the values
 * @returns The feature string with placeholders replaced
 */
export function replacePlaceholders(feature: string, product: ProductValues): string {
  let result = feature;

  // Replace each placeholder with its value
  result = result.replace(/\{listingsLimit\}/g, formatValue(product.listingsLimit));
  result = result.replace(/\{promotionCoupons\}/g, formatValue(product.promotionCoupons));
  result = result.replace(/\{premiumCoupons\}/g, formatValue(product.premiumCoupons));
  result = result.replace(/\{highlightedCoupons\}/g, formatValue(product.highlightedCoupons));
  result = result.replace(/\{featuredCoupons\}/g, formatValue(product.featuredCoupons));
  result = result.replace(/\{agentCoupons\}/g, formatValue(product.agentCoupons));
  result = result.replace(/\{teamMembersLimit\}/g, formatValue(product.teamMembersLimit));
  result = result.replace(/\{aiMessagesLimit\}/g, formatValue(product.aiMessagesLimit));
  result = result.replace(/\{aiInsightsLimit\}/g, formatValue(product.aiInsightsLimit));
  result = result.replace(/\{imageDescriptionLimit\}/g, formatValue(product.imageDescriptionLimit));
  result = result.replace(/\{savedSearchesLimit\}/g, formatValue(product.savedSearchesLimit));
  result = result.replace(/\{maxActiveSubscriptions\}/g, formatValue(product.maxActiveSubscriptions));
  result = result.replace(/\{price\}/g, formatValue(product.price));
  result = result.replace(/\{durationDays\}/g, formatValue(product.durationDays));

  return result;
}

/**
 * Check if a feature string contains any placeholders
 */
export function hasPlaceholders(feature: string): boolean {
  return /\{[a-zA-Z]+\}/.test(feature);
}

/**
 * Get all placeholders used in a feature string
 */
export function getUsedPlaceholders(feature: string): string[] {
  const matches = feature.match(/\{[a-zA-Z]+\}/g);
  return matches ? [...new Set(matches)] : [];
}

/**
 * Validate that all placeholders in a feature are valid
 */
export function validatePlaceholders(feature: string): { valid: boolean; invalid: string[] } {
  const used = getUsedPlaceholders(feature);
  const validKeys = availablePlaceholders.map(p => p.key);
  const invalid = used.filter(p => !validKeys.includes(p));
  return {
    valid: invalid.length === 0,
    invalid,
  };
}

/**
 * Process an array of features, replacing placeholders with product values
 */
export function processFeatures(features: string[], product: ProductValues): string[] {
  return features.map(feature => replacePlaceholders(feature, product));
}

/**
 * Feature translation patterns - maps English feature text patterns to translation keys
 */
const featurePatterns: Array<{ pattern: RegExp; key: string; extractValues?: (match: RegExpMatchArray) => Record<string, string> }> = [
  // Listings
  { pattern: /^(\d+|Unlimited)\s*listings?\s*per\s*year$/i, key: 'listingsPerYear', extractValues: (m) => ({ count: m[1] }) },
  { pattern: /^(\d+|Unlimited)\s*listings?\s*per\s*month$/i, key: 'listingsPerMonth', extractValues: (m) => ({ count: m[1] }) },
  { pattern: /^(\d+|Unlimited)\s*listings?\s*\(expandable\)$/i, key: 'listingsExpandable', extractValues: (m) => ({ count: m[1] }) },

  // Analytics & Dashboard
  { pattern: /^Advanced analytics dashboard$/i, key: 'advancedAnalyticsDashboard' },
  { pattern: /^Basic analytics$/i, key: 'basicAnalytics' },
  { pattern: /^Lead management system$/i, key: 'leadManagementSystem' },

  // Support
  { pattern: /^Priority customer support$/i, key: 'priorityCustomerSupport' },
  { pattern: /^Priority support$/i, key: 'priorityCustomerSupport' },
  { pattern: /^Email support$/i, key: 'emailSupport' },

  // Placement
  { pattern: /^Standard placement$/i, key: 'standardPlacement' },
  { pattern: /^Premium listing placement$/i, key: 'premiumPlacement' },
  { pattern: /^Premium placement$/i, key: 'premiumPlacement' },

  // Promo coupons - complex patterns
  {
    pattern: /^(\d+)\s*promoted?\s*coupons?\s*of\s*which\s*(\d+)\s*highlighted\s*and\s*(\d+)\s*featured\s*coupon\s*per\s*month$/i,
    key: 'promotedCouponsBasic',
    extractValues: (m) => ({ count: m[1], highlighted: m[2], featured: m[3] })
  },
  {
    pattern: /^(\d+)\s*promoted?\s*coupons?\s*of\s*which\s*(\d+)\s*premium,?\s*(\d+)\s*highlighted\s*and\s*(\d+)\s*featured\s*per\s*month$/i,
    key: 'promotedCouponsAdvanced',
    extractValues: (m) => ({ count: m[1], premium: m[2], highlighted: m[3], featured: m[4] })
  },
  { pattern: /^(\d+)\s*promo\s*coupons?\/month$/i, key: 'promoCouponsPerMonth', extractValues: (m) => ({ count: m[1] }) },

  // AI features
  { pattern: /^Unlimited AI messages? per month$/i, key: 'unlimitedAiMessages' },
  { pattern: /^(\d+)\s*AI messages? per month$/i, key: 'limitedAiMessages', extractValues: (m) => ({ count: m[1] }) },
  { pattern: /^Unlimited AI insights? per month$/i, key: 'unlimitedAiInsights' },
  { pattern: /^(\d+)\s*insights? per month$/i, key: 'limitedAiInsights', extractValues: (m) => ({ count: m[1] }) },
  { pattern: /^Unlimited AI image descriptions? per month$/i, key: 'unlimitedAiImageDescriptions' },
  { pattern: /^(\d+)\s*AI image descriptions? per month$/i, key: 'limitedAiImageDescriptions', extractValues: (m) => ({ count: m[1] }) },
  { pattern: /^Unlimited AI chat$/i, key: 'unlimitedAiChat' },
  { pattern: /^Unlimited AI & insights$/i, key: 'unlimitedAiAndInsights' },

  // Saved searches
  { pattern: /^Unlimited saved searches? per month$/i, key: 'unlimitedSavedSearches' },
  { pattern: /^Unlimited saved searches$/i, key: 'unlimitedSavedSearches' },
  { pattern: /^(\d+)\s*saved searches? per month$/i, key: 'limitedSavedSearches', extractValues: (m) => ({ count: m[1] }) },

  // Agency features
  { pattern: /^Special agency page with banner and logo$/i, key: 'specialAgencyPage' },
  { pattern: /^1 week free featuring the agency$/i, key: 'weekFreeAgencyFeaturing' },
  { pattern: /^(\d+)\s*agent coupons? when creating agency$/i, key: 'agentCoupons', extractValues: (m) => ({ count: m[1] }) },
  { pattern: /^Agency branding page$/i, key: 'agencyBrandingPage' },

  // Team members
  { pattern: /^Unlimited team members$/i, key: 'unlimitedTeamMembers' },
  { pattern: /^Up to (\d+) team members$/i, key: 'limitedTeamMembers', extractValues: (m) => ({ count: m[1] }) },

  // Other features
  { pattern: /^Dedicated account manager$/i, key: 'dedicatedAccountManager' },
  { pattern: /^API access$/i, key: 'apiAccess' },
  { pattern: /^Custom branding$/i, key: 'customBranding' },

  // Buyer Pro features
  { pattern: /^Save unlimited searches$/i, key: 'saveUnlimitedSearches' },
  { pattern: /^Early access to new listings$/i, key: 'earlyAccessNewListings' },
  { pattern: /^Advanced market insights$/i, key: 'advancedMarketInsights' },
  { pattern: /^Instant Email notification$/i, key: 'instantEmailNotification' },
  { pattern: /^(\d+)\s*AI messages$/i, key: 'aiMessages', extractValues: (m) => ({ count: m[1] }) },
  { pattern: /^(\d+)\s*Generate Insights$/i, key: 'generateInsights', extractValues: (m) => ({ count: m[1] }) },
  { pattern: /^(\d+)\s*Auto labeling images when creating new listing$/i, key: 'autoLabelingImages', extractValues: (m) => ({ count: m[1] }) },
];

/**
 * Translate a feature string to the current language
 * @param feature - The English feature string
 * @param t - The i18next translation function
 * @returns Translated feature string, or original if no translation found
 */
export function translateFeature(feature: string, t: (key: string, ...args: any[]) => string): string {
  // Try to match against known patterns
  for (const { pattern, key, extractValues } of featurePatterns) {
    const match = feature.match(pattern);
    if (match) {
      const values = extractValues ? extractValues(match) : {};
      const translatedKey = `pricing:featureTranslations.${key}`;
      const translated = t(translatedKey, values);
      // If translation returns the key itself, it means no translation exists
      if (translated !== translatedKey) {
        return translated;
      }
    }
  }
  // Return original if no pattern matched
  return feature;
}

/**
 * Translate and replace placeholders in a feature string
 * @param feature - The feature string with placeholders
 * @param product - The product values for placeholder replacement
 * @param t - The i18next translation function
 * @returns The fully processed feature string
 */
export function translateAndReplacePlaceholders(
  feature: string,
  product: ProductValues,
  t: (key: string, ...args: any[]) => string
): string {
  // First replace placeholders with actual values
  const withValues = replacePlaceholders(feature, product);
  // Then translate the result
  return translateFeature(withValues, t);
}

export default {
  replacePlaceholders,
  processFeatures,
  hasPlaceholders,
  getUsedPlaceholders,
  validatePlaceholders,
  availablePlaceholders,
  translateFeature,
  translateAndReplacePlaceholders,
};
