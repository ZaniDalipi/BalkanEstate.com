/**
 * highlightingUtils.ts - Single Source of Truth for Property Highlighting Logic
 *
 * This utility provides the core logic for property highlighting that is shared
 * across the entire application (backend sorting, frontend display, etc.)
 *
 * Features:
 * - Priority-based tier scoring
 * - Hourly rotation within same tier
 * - Fair distribution of visibility
 *
 * @module highlightingUtils
 */

// Promotion tier priority scores (higher = more priority)
export const PROMOTION_TIER_SCORES = {
  premium: 100,
  highlight: 70,
  featured: 40,
  standard: 10,
} as const;

export type PromotionTierType = keyof typeof PROMOTION_TIER_SCORES;

// Urgent badge bonus score
export const URGENT_BONUS = 5;

// Tier rotation intervals (in hours)
// Standard tier doesn't rotate (uses default of 1 hour)
export const TIER_ROTATION_INTERVALS: Record<string, number> = {
  premium: 2,    // Premium rotates every 2 hours
  highlight: 1,  // Highlight rotates every hour
  featured: 0.5, // Featured rotates every 30 minutes
  standard: 1,   // Standard rotates hourly (default)
};

/**
 * Get a deterministic rotation slot based on property ID and time
 * This ensures fair rotation of properties within the same tier
 *
 * @param propertyId - The property's unique identifier
 * @param currentHour - Current hour (0-23)
 * @param tier - The property's promotion tier
 * @returns A rotation slot number for sorting
 */
export const getRotationSlot = (
  propertyId: string,
  currentHour: number,
  tier: PromotionTierType
): number => {
  // Create a hash from property ID for consistent ordering
  let hash = 0;
  for (let i = 0; i < propertyId.length; i++) {
    const char = propertyId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  // Calculate rotation factor based on tier
  // Different tiers rotate at different rates
  const rotationInterval = TIER_ROTATION_INTERVALS[tier] || 1;
  const rotationFactor = Math.floor(currentHour / rotationInterval);

  // Combine hash with rotation factor for slot assignment
  return (Math.abs(hash) + rotationFactor) % 10000;
};

/**
 * Check if a property's promotion is currently active
 *
 * @param property - Property object with promotion fields
 * @returns True if the promotion is currently active
 */
export const isPromotionActive = (property: {
  isPromoted?: boolean;
  promotionEndDate?: Date | number | null;
}): boolean => {
  if (!property.isPromoted) return false;
  if (!property.promotionEndDate) return false;

  const endDate = property.promotionEndDate instanceof Date
    ? property.promotionEndDate.getTime()
    : property.promotionEndDate;

  return endDate > Date.now();
};

/**
 * Calculate the priority score for a property
 *
 * @param property - Property object with promotion fields
 * @returns The calculated priority score
 */
export const getPriorityScore = (property: {
  isPromoted?: boolean;
  promotionEndDate?: Date | number | null;
  promotionTier?: string;
  hasUrgentBadge?: boolean;
}): number => {
  if (!isPromotionActive(property)) {
    return PROMOTION_TIER_SCORES.standard;
  }

  const tier = (property.promotionTier || 'standard') as PromotionTierType;
  const tierScore = PROMOTION_TIER_SCORES[tier] || PROMOTION_TIER_SCORES.standard;
  const urgentBonus = property.hasUrgentBadge ? URGENT_BONUS : 0;

  return tierScore + urgentBonus;
};

/**
 * Sort properties with promotion priority and hourly rotation
 *
 * @param properties - Array of properties to sort
 * @param currentHour - Current hour (0-23), defaults to system time
 * @returns Sorted array of properties
 */
export const sortPropertiesWithHighlighting = <T extends {
  _id?: any;
  id?: string;
  isPromoted?: boolean;
  promotionEndDate?: Date | number | null;
  promotionTier?: string;
  hasUrgentBadge?: boolean;
  lastRenewed?: Date | number;
  createdAt?: Date | number;
}>(
  properties: T[],
  currentHour: number = new Date().getHours()
): T[] => {
  return [...properties].sort((a, b) => {
    const aScore = getPriorityScore(a);
    const bScore = getPriorityScore(b);

    // First, compare priority scores
    if (aScore !== bScore) {
      return bScore - aScore;
    }

    // Same tier - use rotation slot for fair distribution
    if (aScore > PROMOTION_TIER_SCORES.standard) {
      const aId = String(a._id || a.id || '');
      const bId = String(b._id || b.id || '');
      const aTier = (a.promotionTier || 'standard') as PromotionTierType;
      const bTier = (b.promotionTier || 'standard') as PromotionTierType;

      const aSlot = getRotationSlot(aId, currentHour, aTier);
      const bSlot = getRotationSlot(bId, currentHour, bTier);

      return aSlot - bSlot;
    }

    // For standard properties, maintain lastRenewed/createdAt order
    const aTime = a.lastRenewed || a.createdAt;
    const bTime = b.lastRenewed || b.createdAt;

    const aTimestamp = aTime instanceof Date ? aTime.getTime() : (aTime || 0);
    const bTimestamp = bTime instanceof Date ? bTime.getTime() : (bTime || 0);

    return bTimestamp - aTimestamp;
  });
};

/**
 * Get properties filtered by specific tier
 *
 * @param properties - Array of properties
 * @param tier - The tier to filter by
 * @returns Array of properties with the specified tier
 */
export const getPropertiesByTier = <T extends {
  isPromoted?: boolean;
  promotionEndDate?: Date | number | null;
  promotionTier?: string;
}>(
  properties: T[],
  tier: PromotionTierType
): T[] => {
  return properties.filter(p =>
    isPromotionActive(p) && p.promotionTier === tier
  );
};

/**
 * Get the current rotation period identifier
 * Useful for cache invalidation or tracking rotation changes
 *
 * @returns A string identifier for the current rotation period
 */
export const getCurrentRotationPeriod = (): string => {
  const now = new Date();
  const hour = now.getHours();
  const date = now.toISOString().split('T')[0];

  // Include 30-minute slot for featured tier rotation
  const halfHour = now.getMinutes() >= 30 ? 1 : 0;

  return `${date}-${hour}-${halfHour}`;
};

/**
 * Get statistics about highlighted properties
 *
 * @param properties - Array of properties
 * @returns Object with counts for each tier
 */
export const getHighlightingStats = (properties: Array<{
  isPromoted?: boolean;
  promotionEndDate?: Date | number | null;
  promotionTier?: string;
}>): {
  total: number;
  premium: number;
  highlight: number;
  featured: number;
  standard: number;
  activePromotions: number;
} => {
  const stats = {
    total: properties.length,
    premium: 0,
    highlight: 0,
    featured: 0,
    standard: 0,
    activePromotions: 0,
  };

  for (const property of properties) {
    if (isPromotionActive(property)) {
      stats.activePromotions++;
      const tier = property.promotionTier as PromotionTierType;
      if (tier && stats[tier] !== undefined) {
        stats[tier]++;
      }
    } else {
      stats.standard++;
    }
  }

  return stats;
};

export default {
  PROMOTION_TIER_SCORES,
  URGENT_BONUS,
  TIER_ROTATION_INTERVALS,
  getRotationSlot,
  isPromotionActive,
  getPriorityScore,
  sortPropertiesWithHighlighting,
  getPropertiesByTier,
  getCurrentRotationPeriod,
  getHighlightingStats,
};
