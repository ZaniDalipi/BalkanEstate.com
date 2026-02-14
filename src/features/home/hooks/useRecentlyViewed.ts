import { useState, useEffect, useCallback } from 'react';
import { Property } from '@/types';

const STORAGE_KEY = 'balkanestate_recently_viewed';
const MAX_ITEMS = 20;

export interface RecentlyViewedItem {
  id: string;
  title?: string;
  address: string;
  city: string;
  country: string;
  price: number;
  imageUrl: string;
  beds: number;
  baths: number;
  sqft: number;
  propertyType: string;
  listingType: 'sale' | 'rent';
  viewedAt: number;
}

function loadFromStorage(): RecentlyViewedItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function saveToStorage(items: RecentlyViewedItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Storage quota exceeded - clear oldest items and retry
    try {
      const trimmed = items.slice(0, Math.floor(MAX_ITEMS / 2));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch {
      // Give up silently
    }
  }
}

/**
 * Hook to manage recently viewed properties.
 * Stores in localStorage so it persists across sessions.
 * Only tracks for logged-in users (pass isAuthenticated).
 */
export function useRecentlyViewed(isAuthenticated: boolean) {
  const [items, setItems] = useState<RecentlyViewedItem[]>([]);

  // Load from storage on mount
  useEffect(() => {
    if (isAuthenticated) {
      setItems(loadFromStorage());
    }
  }, [isAuthenticated]);

  const addProperty = useCallback(
    (property: Property) => {
      if (!isAuthenticated) return;

      const newItem: RecentlyViewedItem = {
        id: property.id,
        title: property.title,
        address: property.address,
        city: property.city,
        country: property.country,
        price: property.price,
        imageUrl: property.imageUrl || property.images?.[0]?.url || '',
        beds: property.beds,
        baths: property.baths,
        sqft: property.sqft,
        propertyType: property.propertyType,
        listingType: property.listingType,
        viewedAt: Date.now(),
      };

      setItems((prev) => {
        // Remove existing entry for this property (if any)
        const filtered = prev.filter((item) => item.id !== property.id);
        // Add to front
        const updated = [newItem, ...filtered].slice(0, MAX_ITEMS);
        saveToStorage(updated);
        return updated;
      });
    },
    [isAuthenticated]
  );

  const clearHistory = useCallback(() => {
    setItems([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    recentlyViewed: items,
    addProperty,
    clearHistory,
  };
}

export default useRecentlyViewed;
