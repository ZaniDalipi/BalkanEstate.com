import { useState, useEffect, useCallback } from 'react';
import { Property } from '@/types';

const STORAGE_KEY = 'balkan_recently_viewed';
const MAX_ITEMS = 10;

/** Minimal shape stored in localStorage to keep size small */
interface StoredProperty {
  id: string;
  title?: string;
  price: number;
  imageUrl: string;
  city: string;
  country: string;
  beds: number;
  baths: number;
  sqft: number;
  livingRooms: number;
  address: string;
  propertyType: Property['propertyType'];
  listingType: Property['listingType'];
  currency?: string;
  isPromoted?: boolean;
  promotionTier?: Property['promotionTier'];
  hasDiscount?: boolean;
  originalPrice?: number;
  images?: Property['images'];
  seller: Property['seller'];
  status: Property['status'];
  lat: number;
  lng: number;
  description: string;
  yearBuilt: number;
  parking: number;
  viewedAt: number;
}

function readStorage(): StoredProperty[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as StoredProperty[];
  } catch {
    return [];
  }
}

function writeStorage(items: StoredProperty[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // quota exceeded — clear oldest entries and retry
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 5)));
    } catch {
      // give up silently
    }
  }
}

/**
 * Track and retrieve recently viewed properties via localStorage.
 *
 * - `trackView(property)` — call when a property detail page mounts
 * - `recentlyViewed`      — the list (most-recent first, max 10)
 */
export function useRecentlyViewed() {
  const [recentlyViewed, setRecentlyViewed] = useState<StoredProperty[]>(() => readStorage());

  // Sync across tabs
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setRecentlyViewed(readStorage());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const trackView = useCallback((property: Property) => {
    setRecentlyViewed((prev) => {
      // Remove duplicate if already viewed
      const filtered = prev.filter((p) => p.id !== property.id);

      const entry: StoredProperty = {
        id: property.id,
        title: property.title,
        price: property.price,
        imageUrl: property.imageUrl,
        city: property.city,
        country: property.country,
        beds: property.beds,
        baths: property.baths,
        sqft: property.sqft,
        livingRooms: property.livingRooms,
        address: property.address,
        propertyType: property.propertyType,
        listingType: property.listingType,
        currency: property.currency,
        isPromoted: property.isPromoted,
        promotionTier: property.promotionTier,
        hasDiscount: property.hasDiscount,
        originalPrice: property.originalPrice,
        images: property.images,
        seller: property.seller,
        status: property.status,
        lat: property.lat,
        lng: property.lng,
        description: property.description,
        yearBuilt: property.yearBuilt,
        parking: property.parking,
        viewedAt: Date.now(),
      };

      const next = [entry, ...filtered].slice(0, MAX_ITEMS);
      writeStorage(next);
      return next;
    });
  }, []);

  // Cast to Property[] since StoredProperty is a superset of what components need
  return {
    recentlyViewed: recentlyViewed as unknown as Property[],
    trackView,
  };
}
