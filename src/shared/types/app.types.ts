// Application state types

import { User } from './user.types';
import { Property, Filters } from './property.types';
import { Conversation, Message } from './conversation.types';
import { SavedSearch } from './saved.types';
import { MunicipalityData } from './location.types';
import { Agency } from './agency.types';

export type AppView =
  | 'search'
  | 'explore-cities'
  | 'city-dashboard'
  | 'saved-searches'
  | 'saved-properties'
  | 'inbox'
  | 'account'
  | 'create-listing'
  | 'my-listings'
  | 'agents'
  | 'agencies'
  | 'agentProfile'
  | 'agencyDetail'
  | 'admin'
  | 'agency-dashboard'
  | 'analytics'
  | 'reset-password'
  | 'verify-email'
  | 'valuation'
  | 'mortgage-calculator'
  | 'pricing'
  | 'how-it-works'
  | 'privacy'
  | 'terms'
  | 'cookies'
  | 'refund'
  | 'contact'
  | 'createAgency'
  | 'createAgencyPayment'
  | 'createAgencyConfirm'
  | 'guides'
  | 'blog'
  | 'not-found';

export type AuthModalView =
  | 'login'
  | 'signup'
  | 'forgotPassword'
  | 'forgotPasswordSuccess'
  | 'phoneCode'
  | 'phoneDetails';

export interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
}

export interface AiSearchQuery {
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  beds?: number;
  baths?: number;
  livingRooms?: number;
  minSqft?: number;
  maxSqft?: number;
  features?: string[];
}

export interface SearchPageState {
  filters: Filters;
  activeFilters: Filters;
  mapBoundsJSON: string | null;
  drawnBoundsJSON: string | null;
  mobileView: 'map' | 'list';
  searchMode: 'manual' | 'ai';
  aiChatHistory: ChatMessage[];
  isAiChatModalOpen: boolean;
  isFiltersOpen: boolean;
  focusMapOnProperty: { lat: number; lng: number; address: string; zoom?: number } | null;
}

export interface PendingSubscription {
  planName: string;
  planPrice: number;
  planInterval: 'month' | 'year';
  discountPercent?: number;
  modalType: 'buyer' | 'seller';
}

export interface ActiveDiscount {
  proYearly: number;
  proMonthly: number;
  enterprise: number;
  /** Single-use discount code won in the listing-limit game; applied at checkout */
  code?: string;
  /** ISO date after which the code stops working */
  validUntil?: string;
}
