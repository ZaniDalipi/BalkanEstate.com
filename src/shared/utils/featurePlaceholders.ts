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

export default {
  replacePlaceholders,
  processFeatures,
  hasPlaceholders,
  getUsedPlaceholders,
  validatePlaceholders,
  availablePlaceholders,
};
