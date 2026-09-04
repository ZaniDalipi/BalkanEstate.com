import { useState, useEffect, useCallback } from 'react';
import { Property } from '@/types';
import { hasSellerName } from '@/src/shared/utils/seller';

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
  // Kept so the carousel's card shows the same under-construction badge the
  // search results did — a listing that changes state between rails reads as
  // two different products.
  constructionStatus?: Property['constructionStatus'];
  expectedCompletionYear?: number | null;
  parking: number;
  viewedAt: number;
}

/**
 * An entry is only usable if it has an id — everything else the card can fall
 * back on, but an id-less entry renders the "invalid property" skeleton forever
 * and can never be de-duplicated. Anything that is not a well-formed array of
 * objects is treated as corrupt storage and dropped.
 */
function isUsableEntry(entry: unknown): entry is StoredProperty {
  return (
    !!entry &&
    typeof entry === 'object' &&
    typeof (entry as StoredProperty).id === 'string' &&
    (entry as StoredProperty).id.length > 0
  );
}

function readStorage(): StoredProperty[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isUsableEntry).slice(0, MAX_ITEMS);
  } catch {
    // Corrupt or unreadable (private mode, quota, hand-edited JSON) — start clean.
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
    if (!property?.id) return;

    setRecentlyViewed((prev) => {
      // Remove duplicate if already viewed, but keep it around to merge from
      const previousEntry = prev.find((p) => p.id === property.id);
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
        constructionStatus: property.constructionStatus,
        expectedCompletionYear: property.expectedCompletionYear,
        parking: property.parking,
        viewedAt: Date.now(),
      };

      // A detail page renders from cached data first and only then swaps in the
      // fetched record, so `trackView` can legitimately fire twice for the same
      // listing — once thin, once complete. Never let the thinner snapshot win:
      // keep whichever seller actually carries a name, so the carousel doesn't
      // regress to a bare "Private Seller" badge after a refresh.
      if (previousEntry && hasSellerName(previousEntry.seller) && !hasSellerName(entry.seller)) {
        entry.seller = previousEntry.seller;
      }

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
