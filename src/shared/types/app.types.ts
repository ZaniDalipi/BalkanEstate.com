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
  | 'community'
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
}

export interface AppState {
  user: any;
  onboardingComplete: boolean;
  isAuthenticating: boolean;
  activeView: AppView;
  isPricingModalOpen: boolean;
  isFirstLoginOffer: boolean;
  isAgencyCreationMode: boolean;
  isSubscriptionModalOpen: boolean;
  subscriptionEmail: string | null;
  isAuthModalOpen: boolean;
  authModalView: AuthModalView;
  properties: Property[];
  isLoadingProperties: boolean;
  propertiesError: string | null;
  selectedProperty: Property | null;
  propertyToEdit: Property | null;
  isAuthenticated: boolean;
  isLoadingUserData: boolean;
  currentUser: User | null;
  savedSearches: SavedSearch[];
  savedHomes: Property[];
  comparisonList: string[];
  conversations: Conversation[];
  activeConversationId: string | null;
  selectedAgentId: string | null;
  selectedAgencyId: string | Agency | null;
  pendingProperty: Property | null;
  pendingSubscription: PendingSubscription | null;
  pendingAgencyData: any | null;
  searchPageState: SearchPageState;
  activeDiscount: ActiveDiscount | null;
  isListingLimitWarningOpen: boolean;
  isDiscountGameOpen: boolean;
  isEnterpriseModalOpen: boolean;
  allMunicipalities: Record<string, MunicipalityData[]>;
}

export type AppAction =
  | { type: 'AUTH_CHECK_START' }
  | { type: 'AUTH_CHECK_COMPLETE'; payload: { isAuthenticated: boolean; user: User | null } }
  | { type: 'COMPLETE_ONBOARDING' }
  | { type: 'SET_ACTIVE_VIEW'; payload: AppView }
  | { type: 'TOGGLE_PRICING_MODAL'; payload: { isOpen: boolean; isOffer?: boolean; isAgencyMode?: boolean } }
  | { type: 'TOGGLE_SUBSCRIPTION_MODAL'; payload: { isOpen: boolean; email?: string } }
  | { type: 'TOGGLE_ENTERPRISE_MODAL'; payload: boolean }
  | { type: 'TOGGLE_AUTH_MODAL'; payload: { isOpen: boolean; view?: AuthModalView } }
  | { type: 'SET_AUTH_MODAL_VIEW'; payload: AuthModalView }
  | { type: 'SET_SELECTED_PROPERTY'; payload: string | null }
  | { type: 'SET_PROPERTY_TO_EDIT'; payload: Property | null }
  | { type: 'SET_SELECTED_AGENT'; payload: string | null }
  | { type: 'SET_SELECTED_AGENCY'; payload: string | Agency | null }
  | { type: 'PROPERTIES_LOADING' }
  | { type: 'PROPERTIES_SUCCESS'; payload: Property[] }
  | { type: 'PROPERTIES_ERROR'; payload: string }
  | { type: 'USER_DATA_LOADING' }
  | { type: 'USER_DATA_SUCCESS'; payload: { savedHomes: Property[]; savedSearches: SavedSearch[]; conversations: Conversation[] } }
  | { type: 'ADD_SAVED_SEARCH'; payload: SavedSearch }
  | { type: 'UPDATE_SAVED_SEARCH'; payload: SavedSearch }
  | { type: 'REMOVE_SAVED_SEARCH'; payload: string }
  | { type: 'TOGGLE_SAVED_HOME'; payload: Property }
  | { type: 'ADD_TO_COMPARISON'; payload: string }
  | { type: 'REMOVE_FROM_COMPARISON'; payload: string }
  | { type: 'CLEAR_COMPARISON' }
  | { type: 'SET_AUTH_STATE'; payload: { isAuthenticated: boolean; user: User | null } }
  | { type: 'ADD_PROPERTY'; payload: Property }
  | { type: 'UPDATE_PROPERTY'; payload: Property }
  | { type: 'RENEW_PROPERTY'; payload: string }
  | { type: 'MARK_PROPERTY_SOLD'; payload: string }
  | { type: 'MARK_PROPERTY_RENTED'; payload: { id: string; rentedAt?: number; rentedUntil?: number } }
  | { type: 'MARK_PROPERTY_AVAILABLE'; payload: string }
  | { type: 'DELETE_PROPERTY'; payload: string }
  | { type: 'UPDATE_USER'; payload: Partial<User> }
  | { type: 'CREATE_CONVERSATION'; payload: Conversation }
  | { type: 'DELETE_CONVERSATION'; payload: string }
  | { type: 'SET_ACTIVE_CONVERSATION'; payload: string | null }
  | { type: 'ADD_MESSAGE'; payload: { conversationId: string; message: Message } }
  | { type: 'CREATE_OR_ADD_MESSAGE'; payload: { propertyId: string; message: Message } }
  | { type: 'MARK_CONVERSATION_AS_READ'; payload: string }
  | { type: 'SET_PENDING_PROPERTY'; payload: Property | null }
  | { type: 'SET_PENDING_SUBSCRIPTION'; payload: PendingSubscription | null }
  | { type: 'SET_PENDING_AGENCY_DATA'; payload: any | null }
  | { type: 'UPDATE_SEARCH_PAGE_STATE'; payload: Partial<SearchPageState> }
  | { type: 'SET_ACTIVE_DISCOUNT'; payload: ActiveDiscount | null }
  | { type: 'TOGGLE_LISTING_LIMIT_WARNING'; payload: boolean }
  | { type: 'TOGGLE_DISCOUNT_GAME'; payload: boolean }
  | { type: 'UPDATE_SAVED_SEARCH_ACCESS_TIME'; payload: { searchId: string; seenPropertyIds?: string[] } };
