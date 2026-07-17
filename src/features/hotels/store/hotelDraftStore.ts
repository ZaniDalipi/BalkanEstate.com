// Hotel create-form draft store.
// Persists the in-progress "list your property" form to localStorage so a
// page refresh (or accidental navigation) never loses the host's input.
// Follows the project convention: client state that must survive reloads lives
// in a persisted Zustand store (see app/store/filterStore.ts).

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type {
  HotelPropertyType,
  HotelAmenity,
  SupportedCurrency,
  CancellationPolicy,
  ParkingType,
  PaymentMethod,
  CreateRoomData,
} from '@/src/shared/types/hotel.types';

export interface HotelDraft {
  name: string;
  propertyType: HotelPropertyType | '';
  starRating?: number;
  description: string;
  currency: SupportedCurrency;
  country: string;
  city: string;
  address: string;
  neighborhood: string;
  postalCode: string;
  lat: number;
  lng: number;
  contactPhone: string;
  contactEmail: string;
  whatsapp: string;
  website: string;
  amenities: HotelAmenity[];
  customAmenities: string[];
  rooms: CreateRoomData[];
  checkInTime: string;
  checkOutTime: string;
  minNights?: number;
  maxNights?: number;
  cancellationPolicy: CancellationPolicy | '';
  petsAllowed: boolean;
  smokingAllowed: boolean;
  houseRules: string[];
  languagesSpoken: string[];
  checkInMinAge?: number;
  breakfastIncluded: boolean;
  parkingType: ParkingType | '';
  paymentMethods: PaymentMethod[];
  prepaymentRequired: boolean;
  savedAt: number;
}

interface HotelDraftState {
  draft: Partial<HotelDraft> | null;
  setDraft: (draft: Partial<HotelDraft>) => void;
  clearDraft: () => void;
}

// Drafts older than this are considered stale and ignored on load (7 days).
export const HOTEL_DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const useHotelDraftStore = create<HotelDraftState>()(
  devtools(
    persist(
      (set) => ({
        draft: null,
        setDraft: (draft) => set({ draft: { ...draft, savedAt: Date.now() } }),
        clearDraft: () => set({ draft: null }),
      }),
      { name: 'hotel-create-draft' }
    ),
    { name: 'hotel-create-draft' }
  )
);
