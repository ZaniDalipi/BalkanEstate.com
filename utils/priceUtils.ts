// Price utilities for discount calculations and display

import { Property, PriceInterval } from '@/shared/types/property.types';

/**
 * Calculate discount percentage between original and current price
 */
export const calculateDiscountPercentage = (
  originalPrice: number,
  currentPrice: number
): number => {
  if (originalPrice <= 0 || currentPrice >= originalPrice) return 0;
  return Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
};

/**
 * Get the active price interval for a property based on current date
 */
export const getActivePriceInterval = (
  priceIntervals?: PriceInterval[]
): PriceInterval | null => {
  if (!priceIntervals || priceIntervals.length === 0) return null;

  const now = Date.now();

  // Find the first active interval (started but not ended)
  return (
    priceIntervals.find((interval) => {
      const started = interval.startDate <= now;
      const notEnded = !interval.endDate || interval.endDate >= now;
      return started && notEnded;
    }) || null
  );
};

/**
 * Get the effective price for a property considering price intervals
 */
export const getEffectivePrice = (property: Property): number => {
  const activeInterval = getActivePriceInterval(property.priceIntervals);
  return activeInterval ? activeInterval.price : property.price;
};

/**
 * Check if a property has a price reduction
 */
export const hasPriceReduction = (property: Property): boolean => {
  return !!(
    property.originalPrice &&
    property.originalPrice > property.price
  );
};

/**
 * Get price reduction info for display
 */
export interface PriceReductionInfo {
  hasReduction: boolean;
  hasIncrease: boolean;
  originalPrice: number;
  currentPrice: number;
  discountPercentage: number;
  increasePercentage: number;
  savings: number;
  reducedAt?: number;
  intervalLabel?: string;
}

export const getPriceReductionInfo = (property: Property): PriceReductionInfo => {
  const activeInterval = getActivePriceInterval(property.priceIntervals);

  // If there's an active interval, use it
  if (activeInterval) {
    const originalPrice = property.originalPrice || property.price;
    const currentPrice = activeInterval.price;
    const discountPercentage = calculateDiscountPercentage(originalPrice, currentPrice);
    const increasePercentage = originalPrice > 0 && currentPrice > originalPrice
      ? Math.round(((currentPrice - originalPrice) / originalPrice) * 100)
      : 0;

    return {
      hasReduction: discountPercentage > 0,
      hasIncrease: increasePercentage > 0,
      originalPrice,
      currentPrice,
      discountPercentage,
      increasePercentage,
      savings: originalPrice - currentPrice,
      reducedAt: activeInterval.startDate,
      intervalLabel: activeInterval.label,
    };
  }

  // Check for regular price reduction
  if (property.originalPrice && property.originalPrice > property.price) {
    const discountPercentage = calculateDiscountPercentage(
      property.originalPrice,
      property.price
    );

    return {
      hasReduction: true,
      hasIncrease: false,
      originalPrice: property.originalPrice,
      currentPrice: property.price,
      discountPercentage,
      increasePercentage: 0,
      savings: property.originalPrice - property.price,
      reducedAt: property.priceReducedAt,
    };
  }

  // Check for price increase
  if (property.originalPrice && property.originalPrice < property.price) {
    const increasePercentage = Math.round(
      ((property.price - property.originalPrice) / property.originalPrice) * 100
    );

    return {
      hasReduction: false,
      hasIncrease: true,
      originalPrice: property.originalPrice,
      currentPrice: property.price,
      discountPercentage: 0,
      increasePercentage,
      savings: property.originalPrice - property.price,
      reducedAt: property.priceReducedAt,
    };
  }

  // No change
  return {
    hasReduction: false,
    hasIncrease: false,
    originalPrice: property.price,
    currentPrice: property.price,
    discountPercentage: 0,
    increasePercentage: 0,
    savings: 0,
  };
};

/**
 * Format price with currency
 */
export const formatPrice = (
  price: number,
  currency: string = 'EUR',
  locale: string = 'en-US'
): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
};

/**
 * Check if price was reduced recently (within days)
 */
export const isPriceReducedRecently = (
  property: Property,
  withinDays: number = 7
): boolean => {
  if (!property.priceReducedAt) return false;

  const reducedAt = new Date(property.priceReducedAt).getTime();
  const cutoff = Date.now() - withinDays * 24 * 60 * 60 * 1000;

  return reducedAt >= cutoff;
};

/**
 * Get upcoming price intervals (scheduled for future)
 */
export const getUpcomingPriceIntervals = (
  priceIntervals?: PriceInterval[]
): PriceInterval[] => {
  if (!priceIntervals || priceIntervals.length === 0) return [];

  const now = Date.now();
  return priceIntervals.filter((interval) => interval.startDate > now);
};
