/**
 * HighlightedPropertiesContext - Single Source of Truth for Property Highlighting
 *
 * This context manages all highlighted/promoted property logic including:
 * - Priority-based sorting (Premium > Highlight > Featured > Standard)
 * - Hourly rotation within same tier (to give fair exposure)
 * - Agent recommendations for highlighted properties
 * - Map agent avatar targeting
 *
 * @module HighlightedPropertiesContext
 */

import React, { createContext, useContext, useMemo, useState, useCallback, useEffect } from 'react';
import { Property } from '../../types';

// Promotion tier priority scores (higher = more priority)
export const PROMOTION_TIER_SCORES = {
  premium: 100,
  highlight: 70,
  featured: 40,
  standard: 10,
} as const;

// Urgent badge bonus score
export const URGENT_BONUS = 5;

// Colors for each tier - Premium = Gold (1st), Highlight = Light Blue (2nd), Featured = Dark Purple (3rd)
export const PROMOTION_TIER_COLORS = {
  premium: '#FFB800',   // Rich Gold for Premium Premiere (TOP tier)
  highlight: '#0EA5E9', // Light Blue/Sky for Highlight (2nd tier)
  featured: '#7C3AED',  // Dark Purple/Violet for Featured (3rd tier)
  standard: '#6B7280',  // Gray for Standard
} as const;

// Agent recommendation messages by tier
export const AGENT_RECOMMENDATIONS = {
  premium: [
    "This premium property is our top pick for you!",
    "Exclusive listing! Don't miss this premium opportunity.",
    "Our most recommended property in this area.",
    "Premium choice with exceptional value!",
  ],
  highlight: [
    "Highlighted for quick sale - worth a look!",
    "Popular choice! This property is getting lots of attention.",
    "Seller motivated - highlighted for visibility!",
    "Great opportunity - check this highlighted listing!",
  ],
  featured: [
    "Featured listing with special amenities.",
    "This property stands out in the neighborhood.",
    "Worth considering - featured by the owner.",
    "Take a closer look at this featured home!",
  ],
} as const;

export interface HighlightedProperty extends Property {
  priorityScore: number;
  rotationSlot: number;
  isCurrentlyFeatured: boolean;
  agentRecommendation?: string;
}

interface HighlightedPropertiesContextType {
  // Sorted properties with highlighting applied
  sortedProperties: HighlightedProperty[];

  // Currently featured property for map agent
  currentMapFeatured: HighlightedProperty | null;

  // Get all highlighted properties (excluding standard)
  highlightedProperties: HighlightedProperty[];

  // Get properties by tier
  getPropertiesByTier: (tier: 'premium' | 'highlight' | 'featured') => HighlightedProperty[];

  // Current rotation hour (0-23)
  currentRotationHour: number;

  // Force refresh rotation
  refreshRotation: () => void;

  // Get recommendation for a property
  getRecommendation: (propertyId: string) => string | null;

  // Check if property is actively promoted
  isPropertyPromoted: (property: Property) => boolean;

  // Get priority score for property
  getPriorityScore: (property: Property) => number;

  // Navigate to next/prev featured property on map
  navigateToNextFeatured: () => void;
  navigateToPrevFeatured: () => void;
  currentFeaturedIndex: number;
}

const HighlightedPropertiesContext = createContext<HighlightedPropertiesContextType | null>(null);

/**
 * Get a deterministic rotation slot based on property ID and hour
 * This ensures fair rotation of properties within the same tier
 */
const getRotationSlot = (propertyId: string | undefined, hour: number, tier: string): number => {
  if (!propertyId) return 0;
  // Create a hash from property ID for consistent ordering
  let hash = 0;
  for (let i = 0; i < propertyId.length; i++) {
    const char = propertyId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  // Combine with hour to create rotation
  // Different tiers rotate at different rates:
  // - Premium: rotates every 2 hours
  // - Highlight: rotates every hour
  // - Featured: rotates every 30 minutes (using half-hour slots)
  const rotationFactor = tier === 'premium' ? Math.floor(hour / 2) :
                         tier === 'highlight' ? hour :
                         hour * 2;

  return (Math.abs(hash) + rotationFactor) % 1000;
};

/**
 * Check if a property promotion is currently active
 */
const isPromotionActive = (property: Property): boolean => {
  if (!property.isPromoted) return false;
  if (!property.promotionEndDate) return false;
  return property.promotionEndDate > Date.now();
};

/**
 * Get random recommendation for a tier
 */
const getRandomRecommendation = (tier: 'premium' | 'highlight' | 'featured', seed: string | undefined): string | undefined => {
  const messages = AGENT_RECOMMENDATIONS[tier];
  if (!messages || !seed) return undefined;
  // Use property ID as seed for consistent recommendations
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash = hash & hash;
  }
  return messages[Math.abs(hash) % messages.length];
};

export const HighlightedPropertiesProvider: React.FC<{
  children: React.ReactNode;
  properties: Property[];
}> = ({ children, properties }) => {
  const [currentRotationHour, setCurrentRotationHour] = useState(() => new Date().getHours());
  const [currentFeaturedIndex, setCurrentFeaturedIndex] = useState(0);

  // Update rotation hour every minute (check for hour change)
  useEffect(() => {
    const interval = setInterval(() => {
      const newHour = new Date().getHours();
      if (newHour !== currentRotationHour) {
        setCurrentRotationHour(newHour);
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [currentRotationHour]);

  // Check if property is actively promoted
  const isPropertyPromoted = useCallback((property: Property): boolean => {
    return isPromotionActive(property);
  }, []);

  // Get priority score for a property
  const getPriorityScore = useCallback((property: Property): number => {
    if (!isPromotionActive(property)) {
      return PROMOTION_TIER_SCORES.standard;
    }

    const tierScore = PROMOTION_TIER_SCORES[property.promotionTier || 'standard'] || PROMOTION_TIER_SCORES.standard;
    const urgentBonus = property.hasUrgentBadge ? URGENT_BONUS : 0;

    return tierScore + urgentBonus;
  }, []);

  // Process and sort properties with highlighting logic
  const sortedProperties = useMemo((): HighlightedProperty[] => {
    const processed = properties.map((property): HighlightedProperty => {
      const isPromoted = isPromotionActive(property);
      const priorityScore = getPriorityScore(property);
      const tier = isPromoted ? (property.promotionTier || 'standard') : 'standard';
      const rotationSlot = getRotationSlot(property.id, currentRotationHour, tier);

      // Generate recommendation for promoted properties
      let agentRecommendation: string | undefined;
      if (isPromoted && tier !== 'standard') {
        agentRecommendation = getRandomRecommendation(tier as 'premium' | 'highlight' | 'featured', property.id);
      }

      return {
        ...property,
        priorityScore,
        rotationSlot,
        isCurrentlyFeatured: isPromoted && tier !== 'standard',
        agentRecommendation,
      };
    });

    // Sort by:
    // 1. Priority score (higher first)
    // 2. Within same priority, sort by rotation slot (for hourly rotation)
    // 3. For non-promoted, maintain original order (by lastRenewed)
    return processed.sort((a, b) => {
      // First, compare priority scores
      if (a.priorityScore !== b.priorityScore) {
        return b.priorityScore - a.priorityScore;
      }

      // Same tier - use rotation slot for fair distribution
      if (a.priorityScore > PROMOTION_TIER_SCORES.standard) {
        return a.rotationSlot - b.rotationSlot;
      }

      // For standard properties, maintain lastRenewed order
      const aRenewed = a.lastRenewed || a.createdAt || 0;
      const bRenewed = b.lastRenewed || b.createdAt || 0;
      return bRenewed - aRenewed;
    });
  }, [properties, currentRotationHour, getPriorityScore]);

  // Get highlighted properties (non-standard)
  const highlightedProperties = useMemo(() => {
    return sortedProperties.filter(p => p.isCurrentlyFeatured);
  }, [sortedProperties]);

  // Current map featured property (cycles through highlighted)
  const currentMapFeatured = useMemo(() => {
    if (highlightedProperties.length === 0) return null;
    const safeIndex = currentFeaturedIndex % highlightedProperties.length;
    return highlightedProperties[safeIndex];
  }, [highlightedProperties, currentFeaturedIndex]);

  // Get properties by tier
  const getPropertiesByTier = useCallback((tier: 'premium' | 'highlight' | 'featured') => {
    return sortedProperties.filter(p =>
      isPromotionActive(p) && p.promotionTier === tier
    );
  }, [sortedProperties]);

  // Get recommendation for a property
  const getRecommendation = useCallback((propertyId: string): string | null => {
    const property = sortedProperties.find(p => p.id === propertyId);
    return property?.agentRecommendation || null;
  }, [sortedProperties]);

  // Refresh rotation manually
  const refreshRotation = useCallback(() => {
    setCurrentRotationHour(new Date().getHours());
  }, []);

  // Navigate to next featured property
  const navigateToNextFeatured = useCallback(() => {
    if (highlightedProperties.length === 0) return;
    setCurrentFeaturedIndex(prev => (prev + 1) % highlightedProperties.length);
  }, [highlightedProperties.length]);

  // Navigate to previous featured property
  const navigateToPrevFeatured = useCallback(() => {
    if (highlightedProperties.length === 0) return;
    setCurrentFeaturedIndex(prev =>
      prev === 0 ? highlightedProperties.length - 1 : prev - 1
    );
  }, [highlightedProperties.length]);

  const value = useMemo(() => ({
    sortedProperties,
    currentMapFeatured,
    highlightedProperties,
    getPropertiesByTier,
    currentRotationHour,
    refreshRotation,
    getRecommendation,
    isPropertyPromoted,
    getPriorityScore,
    navigateToNextFeatured,
    navigateToPrevFeatured,
    currentFeaturedIndex,
  }), [
    sortedProperties,
    currentMapFeatured,
    highlightedProperties,
    getPropertiesByTier,
    currentRotationHour,
    refreshRotation,
    getRecommendation,
    isPropertyPromoted,
    getPriorityScore,
    navigateToNextFeatured,
    navigateToPrevFeatured,
    currentFeaturedIndex,
  ]);

  return (
    <HighlightedPropertiesContext.Provider value={value}>
      {children}
    </HighlightedPropertiesContext.Provider>
  );
};

export const useHighlightedProperties = (): HighlightedPropertiesContextType => {
  const context = useContext(HighlightedPropertiesContext);
  if (!context) {
    throw new Error('useHighlightedProperties must be used within a HighlightedPropertiesProvider');
  }
  return context;
};

export default HighlightedPropertiesContext;
