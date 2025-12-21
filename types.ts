// --- Enums and Simple Types ---
export enum UserRole {
    BUYER = 'buyer',
    PRIVATE_SELLER = 'private_seller',
    AGENT = 'agent',
    ADMIN = 'admin',
    SUPER_ADMIN = 'super_admin',
}

export type PropertyStatus = 'active' | 'pending' | 'sold' | 'draft';

export type PropertyImageTag = 'exterior' | 'living_room' | 'kitchen' | 'bedroom' | 'bathroom' | 'other';

export type AppView = 'search' | 'explore-cities' | 'saved-searches' | 'saved-properties' | 'inbox' | 'account' | 'create-listing' | 'agents' | 'agencies' | 'agentProfile' | 'agencyDetail' | 'admin';

export type AuthModalView = 'login' | 'signup' | 'forgotPassword' | 'forgotPasswordSuccess' | 'phoneCode' | 'phoneDetails';

export type SellerType = 'any' | 'agent' | 'private';

// --- Data Models ---

export interface Seller {
    type: 'agent' | 'private';
    name: string;
    avatarUrl?: string;
    phone: string;
    agencyName?: string;
    agencyLogo?: string;
    agencyId?: string;
}

export interface Testimonial {
    quote: string;
    clientName: string;
    rating: number;
    createdAt?: string;
    userId?: {
        _id: string;
        name: string;
        avatarUrl?: string;
    };
}

export interface User {
    id: string;
    _id?: string; // MongoDB ID (for compatibility)
    name: string;
    email: string;
    avatarUrl?: string;
    phone: string;
    role: UserRole;
    city?: string;
    country?: string;
    address?: string; // Street address for location search
    lat?: number;
    lng?: number;
    agencyName?: string;
    agentId?: string;
    agencyId?: string; // Agency ID for agents
    licenseNumber?: string;
    licenseVerified?: boolean;
    licenseVerificationDate?: Date;
    listingsCount?: number;
    totalListingsCreated?: number;
    testimonials?: Testimonial[];
    isSubscribed: boolean;
    publicKey?: string; // E2E encryption public key (JWK format)
    // Subscription fields (from Subscription document)
    subscriptionPlan?: string; // e.g., 'seller_pro_monthly', 'seller_pro_yearly'
    subscriptionProductName?: string; // Human-readable name
    subscriptionStatus?: 'active' | 'expired' | 'trial' | 'grace' | 'canceled';
    subscriptionExpiresAt?: string | Date;
    subscriptionStartedAt?: string | Date;
    subscriptionRenewalDate?: string | Date;
    subscriptionSource?: 'google' | 'apple' | 'stripe' | 'web';
    subscriptionPrice?: number; // 0 = coupon/free trial
    subscriptionAutoRenewing?: boolean;
    subscriptionCurrency?: string;
    marketStats?: {
        avgDaysOnMarket?: number;
        priceGrowthYoY?: number;
        activityLevel?: string;
    };
    // Dual-Role System fields
    availableRoles?: UserRole[];
    activeRole?: UserRole;
    primaryRole?: UserRole;
    // Unified Pro Subscription (15 listings shared across both roles)
    proSubscription?: {
        isActive: boolean;
        plan: 'pro_monthly' | 'pro_yearly';
        expiresAt?: Date | string;
        startedAt?: Date | string;
        totalListingsLimit: number; // Always 15 for Pro
        activeListingsCount: number; // Total active listings (private + agent combined)
        privateSellerCount: number; // Listings posted as private seller
        agentCount: number; // Listings posted as agent
        promotionCoupons?: {
            highlightCoupons: number; // 2 starter highlight coupons for agents
            usedHighlightCoupons: number;
        };
    };
    // Free tier tracking (for non-Pro users)
    freeSubscription?: {
        activeListingsCount: number; // 3 free listings for private sellers
        listingsLimit: number; // Always 3
    };
    // NEW: Unified subscription object (single source of truth)
    subscription?: {
        tier: 'free' | 'pro' | 'agency_owner' | 'agency_agent' | 'buyer';
        status: 'active' | 'canceled' | 'expired' | 'trial';
        listingsLimit: number; // 3 for free, 25 for pro/agency
        activeListingsCount: number;
        privateSellerCount: number;
        agentCount: number;
        promotionCoupons?: {
            monthly: number;
            available: number;
            used: number;
            rollover?: number;
            lastRefresh?: Date | string;
        };
        savedSearchesLimit?: number;
        totalPaid?: number;
        expiresAt?: Date | string;
        startedAt?: Date | string;
    };
}

export interface Agent extends User {
    userId?: string; // The user ID that properties are linked to (different from agent document id)
    totalSalesValue: number;
    propertiesSold: number;
    activeListings: number;
    rating: number;
    totalReviews?: number;
    bio?: string;
    specializations?: string[];
    yearsOfExperience?: number;
    languages?: string[];
    serviceAreas?: string[];
    websiteUrl?: string;
    facebookUrl?: string;
    instagramUrl?: string;
    linkedinUrl?: string;
    officeAddress?: string;
    officePhone?: string;
    teamSize?: number;
    minPrice?: number;
    maxPrice?: number;
    receiveInquiries?: boolean;
    averageprice?: number;
    certifications?: string[];
    recentsales?: {
        propertyId: string;
        soldPrice: number;
        soldDate: string;
    }[];
    awards?: string[];
    agencyLogo?: string;
    agencySlug?: string;
    agencyGradient?: string;
    agencyCoverImage?: string;
    agencyType?: 'standard' | 'luxury' | 'commercial' | 'boutique' | 'team';
    lat?: number;
    lng?: number;

}

export interface Agency {
    _id: string;
    slug?: string;
    name: string;
    description?: string;
    logo?: string;
    coverImage?: string;
    email: string;
    phone: string;
    city?: string;
    country?: string;
    address?: string;
    zipCode?: string;
    lat?: number;
    lng?: number;
    website?: string;
    totalProperties: number;
    totalAgents: number;
    yearsInBusiness?: number;
    isFeatured: boolean;
    featuredStartDate?: string;
    featuredEndDate?: string;
    adRotationOrder?: number;
    specializations?: string[];
    specialties?: string[];
    certifications?: string[];
    languages?: string[];
    serviceAreas?: string[];
    facebookUrl?: string;
    instagramUrl?: string;
    linkedinUrl?: string;
    twitterUrl?: string;
    type?: 'standard' | 'luxury' | 'commercial' | 'boutique' | 'team';
    businessHours?: {
        monday?: string;
        tuesday?: string;
        wednesday?: string;
        thursday?: string;
        friday?: string;
        saturday?: string;
        sunday?: string;
    };
    agents?: any[]; // Array of agent objects
    ownerId?: string | { _id: string; name: string; email: string; role?: string }; // Owner user ID (also the creator/admin) - can be populated
    admins?: string[]; // Array of admin user IDs
    invitationCode?: string; // Code required to join agency
    createdAt?: string;
    updatedAt?: string;
    totalListings?: number;
    salesStats?: {
        salesLast12Months: number;
        totalSales: number;
        minPrice: number;
        maxPrice: number;
        averagePrice: number;
    };
}

export interface PropertyImage {
    url: string;
    tag: PropertyImageTag;
}

export type FurnishingStatus = 'any' | 'furnished' | 'semi-furnished' | 'unfurnished';
export type HeatingType = 'any' | 'central' | 'electric' | 'gas' | 'oil' | 'heat-pump' | 'solar' | 'wood' | 'none';
export type PropertyCondition = 'any' | 'new' | 'excellent' | 'good' | 'fair' | 'needs-renovation';
export type ViewType = 'any' | 'sea' | 'mountain' | 'city' | 'park' | 'garden' | 'street';
export type EnergyRating = 'any' | 'A+' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';

export interface Property {
    id: string;
    title?: string;
    sellerId: string;
    status: PropertyStatus;
    soldAt?: number;
    title?: string; // Property listing title
    price: number;
    address: string;
    city: string;
    country: string;
    beds: number;
    baths: number;
    livingRooms: number;
    sqft: number;
    yearBuilt: number;
    parking: number;
    description: string;
    specialFeatures: string[];
    materials: string[];
    amenities: string[];
    tourUrl?: string;
    virtualTour360Url?: string; // URL for 360 virtual tour
    hasVirtualTour360?: boolean; // Flag indicating if 360 virtual tour is available
    imageUrl: string;
    images?: PropertyImage[];
    lat: number;
    lng: number;
    seller: Seller;
    propertyType: 'house' | 'apartment' | 'villa' | 'other';
    floorNumber?: number;
    totalFloors?: number;
    floorplanUrl?: string;
    createdAt?: number;
    lastRenewed?: number;
    views?: number;
    saves?: number;
    inquiries?: number;
    // Dual-role system
    createdAsRole?: UserRole;
    // Advanced property features
    furnishing?: FurnishingStatus;
    heatingType?: HeatingType;
    condition?: PropertyCondition;
    viewType?: ViewType;
    energyRating?: EnergyRating;
    hasBalcony?: boolean;
    hasGarden?: boolean;
    hasElevator?: boolean;
    hasSecurity?: boolean;
    hasAirConditioning?: boolean;
    hasPool?: boolean;
    petsAllowed?: boolean;
    distanceToCenter?: number; // in km
    distanceToSea?: number; // in km
    distanceToSchool?: number; // in km
    distanceToHospital?: number; // in km
    // Promotion fields
    isPromoted?: boolean;
    promotionTier?: 'standard' | 'featured' | 'highlight' | 'premium';
    promotionStartDate?: number;
    promotionEndDate?: number;
    hasUrgentBadge?: boolean;
}

export interface Message {
    id: string;
    senderId: string; // 'user' or seller's user ID
    text?: string;
    imageUrl?: string;
    // E2E Encryption fields
    encryptedMessage?: string;
    encryptedKeys?: Record<string, string>; // userId -> encrypted AES key
    iv?: string;
    timestamp: number;
    isRead: boolean;
}

export interface Conversation {
    id: string;
    propertyId: string;
    property?: Property;
    buyerId: string;
    sellerId: string;
    buyer?: {
        id: string;
        name: string;
        avatarUrl?: string;
    };
    seller?: {
        id: string;
        name: string;
        avatarUrl?: string;
        role?: string;
        agencyName?: string;
    };
    participants?: string[]; // user ID and seller ID (for backwards compatibility)
    messages: Message[];
    lastMessage?: Message;
    createdAt: number;
    isRead: boolean;
    buyerUnreadCount: number;
    sellerUnreadCount: number;
}

export interface Filters {
    query: string;
    country: string;
    minPrice: number | null;
    maxPrice: number | null;
    beds: number | null;
    baths: number | null;
    livingRooms: number | null;
    minSqft: number | null;
    maxSqft: number | null;
    sortBy: string;
    sellerType: SellerType;
    propertyType: 'any' | 'house' | 'apartment' | 'villa' | 'other';
    // Advanced filters
    minYearBuilt: number | null;
    maxYearBuilt: number | null;
    minParking: number | null;
    furnishing: FurnishingStatus;
    heatingType: HeatingType;
    condition: PropertyCondition;
    viewType: ViewType;
    energyRating: EnergyRating;
    hasBalcony: boolean | null;
    hasGarden: boolean | null;
    hasElevator: boolean | null;
    hasSecurity: boolean | null;
    hasAirConditioning: boolean | null;
    hasPool: boolean | null;
    petsAllowed: boolean | null;
    minFloorNumber: number | null;
    maxFloorNumber: number | null;
    maxDistanceToCenter: number | null; // in km
    maxDistanceToSea: number | null; // in km
    maxDistanceToSchool: number | null; // in km
    maxDistanceToHospital: number | null; // in km
    amenities: string[]; // Array of amenity tags to filter by
}

export const initialFilters: Filters = {
    query: '',
    country: 'any',
    minPrice: null,
    maxPrice: null,
    beds: null,
    baths: null,
    livingRooms: null,
    minSqft: null,
    maxSqft: null,
    sortBy: 'newest',
    sellerType: 'any',
    propertyType: 'any',
    // Advanced filters
    minYearBuilt: null,
    maxYearBuilt: null,
    minParking: null,
    furnishing: 'any',
    heatingType: 'any',
    condition: 'any',
    viewType: 'any',
    energyRating: 'any',
    hasBalcony: null,
    hasGarden: null,
    hasElevator: null,
    hasSecurity: null,
    hasAirConditioning: null,
    hasPool: null,
    petsAllowed: null,
    minFloorNumber: null,
    maxFloorNumber: null,
    maxDistanceToCenter: null,
    maxDistanceToSea: null,
    maxDistanceToSchool: null,
    maxDistanceToHospital: null,
    amenities: [],
};

export interface SavedSearch {
    id: string;
    name: string;
    filters: Filters;
    drawnBoundsJSON: string | null;
    createdAt: number;
    lastAccessed: number;
    seenPropertyIds?: string[];
}

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

// --- Location/Map Data ---

export interface CountryBounds {
    name: string;
    bounds: [[number, number], [number, number]]; // [[south, west], [north, east]]
    center: [number, number]; // [lat, lng]
}

export const COUNTRY_BOUNDS: Record<string, CountryBounds> = {
    'albania': {
        name: 'Albania',
        bounds: [[39.6448, 19.2823], [42.6611, 21.0574]],
        center: [41.1533, 20.1683]
    },
    'bosnia': {
        name: 'Bosnia and Herzegovina',
        bounds: [[42.5553, 15.7287], [45.2764, 19.6237]],
        center: [43.9159, 17.6791]
    },
    'bulgaria': {
        name: 'Bulgaria',
        bounds: [[41.2353, 22.3571], [44.2167, 28.6122]],
        center: [42.7339, 25.4858]
    },
    'croatia': {
        name: 'Croatia',
        bounds: [[42.3869, 13.4932], [46.5549, 19.4277]],
        center: [45.1000, 15.2000]
    },
    'greece': {
        name: 'Greece',
        bounds: [[34.8021, 19.3736], [41.7488, 28.2336]],
        center: [39.0742, 21.8243]
    },
    'kosovo': {
        name: 'Kosovo',
        bounds: [[41.8564, 20.0142], [43.2682, 21.7895]],
        center: [42.6026, 20.9030]
    },
    'macedonia': {
        name: 'North Macedonia',
        bounds: [[40.8427, 20.4529], [42.3736, 23.0342]],
        center: [41.6086, 21.7453]
    },
    'montenegro': {
        name: 'Montenegro',
        bounds: [[41.8503, 18.4331], [43.5585, 20.3398]],
        center: [42.7087, 19.3744]
    },
    'romania': {
        name: 'Romania',
        bounds: [[43.6190, 20.2619], [48.2653, 29.7497]],
        center: [45.9432, 24.9668]
    },
    'serbia': {
        name: 'Serbia',
        bounds: [[42.2322, 18.8142], [46.1900, 23.0063]],
        center: [44.0165, 21.0059]
    },
    'slovenia': {
        name: 'Slovenia',
        bounds: [[45.4214, 13.3754], [46.8766, 16.5967]],
        center: [46.1512, 14.9955]
    },
    'turkey': {
        name: 'Turkey (European part)',
        bounds: [[40.8223, 26.0433], [42.1061, 29.4149]],
        center: [41.0082, 28.9784]
    }
};

export interface SettlementData {
  name: string;
  lat: number;
  lng: number;
}
export interface MunicipalityData {
    name: string;
    settlements: SettlementData[];
}

export interface NominatimResult {
  place_id: number;
  licence: string;
  osm_type: string;
  osm_id: number;
  boundingbox: [string, string, string, string]; // [south, north, west, east]
  lat: string;
  lon: string;
  display_name: string;
  class: string;
  type: string;
  importance: number;
  icon?: string;
  name?: string;
  address?: {
    road?: string;
    street?: string;
    suburb?: string;
    neighbourhood?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    state?: string;
    country: string;
    country_code: string;
    postcode?: string;
  };
}

// --- App State Management ---

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
    focusMapOnProperty: { lat: number; lng: number; address: string } | null; // Property location to focus map on
}

export interface PendingSubscription {
    planName: string;
    planPrice: number;
    planInterval: 'month' | 'year';
    discountPercent?: number;
    modalType: 'buyer' | 'seller'; // which modal to open
}

export interface AppState {
    user: any;
    onboardingComplete: boolean;
    isAuthenticating: boolean;
    activeView: AppView;
    isPricingModalOpen: boolean;
    isFirstLoginOffer: boolean;
    isAgencyCreationMode: boolean; // Flag to indicate agency creation flow (only show Enterprise plan)
    isSubscriptionModalOpen: boolean;
    subscriptionEmail: string | null; // Email entered in subscription form
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
    comparisonList: string[]; // array of property IDs
    conversations: Conversation[];
    activeConversationId: string | null;
    selectedAgentId: string | null;
    selectedAgencyId: string | Agency | null;
    pendingProperty: Property | null;
    pendingSubscription: PendingSubscription | null;
    pendingAgencyData: any | null; // Agency form data to be created after payment
    searchPageState: SearchPageState;
    activeDiscount: { proYearly: number; proMonthly: number; enterprise: number; } | null;
    isListingLimitWarningOpen: boolean;
    isDiscountGameOpen: boolean;
    isEnterpriseModalOpen: boolean;
    allMunicipalities: Record<string, MunicipalityData[]>;
}

export type AppAction =
    | { type: 'AUTH_CHECK_START' }
    | { type: 'AUTH_CHECK_COMPLETE', payload: { isAuthenticated: boolean, user: User | null } }
    | { type: 'COMPLETE_ONBOARDING' }
    | { type: 'SET_ACTIVE_VIEW', payload: AppView }
    | { type: 'TOGGLE_PRICING_MODAL', payload: { isOpen: boolean, isOffer?: boolean, isAgencyMode?: boolean } }
    | { type: 'TOGGLE_SUBSCRIPTION_MODAL', payload: { isOpen: boolean, email?: string } }
    | { type: 'TOGGLE_ENTERPRISE_MODAL', payload: boolean }
    | { type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: boolean, view?: AuthModalView } }
    | { type: 'SET_AUTH_MODAL_VIEW', payload: AuthModalView }
    | { type: 'SET_SELECTED_PROPERTY', payload: string | null }
    | { type: 'SET_PROPERTY_TO_EDIT', payload: Property | null }
    | { type: 'SET_SELECTED_AGENT', payload: string | null }
    | { type: 'SET_SELECTED_AGENCY', payload: string | null }
    | { type: 'PROPERTIES_LOADING' }
    | { type: 'PROPERTIES_SUCCESS', payload: Property[] }
    | { type: 'PROPERTIES_ERROR', payload: string }
    | { type: 'USER_DATA_LOADING' }
    | { type: 'USER_DATA_SUCCESS', payload: { savedHomes: Property[], savedSearches: SavedSearch[], conversations: Conversation[] } }
    | { type: 'ADD_SAVED_SEARCH', payload: SavedSearch }
    | { type: 'REMOVE_SAVED_SEARCH', payload: string }
    | { type: 'TOGGLE_SAVED_HOME', payload: Property }
    | { type: 'ADD_TO_COMPARISON', payload: string }
    | { type: 'REMOVE_FROM_COMPARISON', payload: string }
    | { type: 'CLEAR_COMPARISON' }
    | { type: 'SET_AUTH_STATE', payload: { isAuthenticated: boolean, user: User | null } }
    | { type: 'ADD_PROPERTY', payload: Property }
    | { type: 'UPDATE_PROPERTY', payload: Property }
    | { type: 'RENEW_PROPERTY', payload: string }
    | { type: 'MARK_PROPERTY_SOLD', payload: string }
    | { type: 'DELETE_PROPERTY', payload: string }
    | { type: 'UPDATE_USER', payload: Partial<User> }
    | { type: 'CREATE_CONVERSATION', payload: Conversation }
    | { type: 'DELETE_CONVERSATION', payload: string }
    | { type: 'SET_ACTIVE_CONVERSATION', payload: string | null }
    | { type: 'ADD_MESSAGE', payload: { conversationId: string, message: Message } }
    | { type: 'CREATE_OR_ADD_MESSAGE', payload: { propertyId: string, message: Message } }
    | { type: 'MARK_CONVERSATION_AS_READ', payload: string }
    | { type: 'SET_PENDING_PROPERTY', payload: Property | null }
    | { type: 'SET_PENDING_SUBSCRIPTION', payload: PendingSubscription | null }
    | { type: 'SET_PENDING_AGENCY_DATA', payload: any | null }
    | { type: 'UPDATE_SEARCH_PAGE_STATE', payload: Partial<SearchPageState> }
    | { type: 'SET_ACTIVE_DISCOUNT', payload: { proYearly: number; proMonthly: number; enterprise: number; } | null }
    | { type: 'TOGGLE_LISTING_LIMIT_WARNING', payload: boolean }
    | { type: 'TOGGLE_DISCOUNT_GAME', payload: boolean }
    | { type: 'UPDATE_SAVED_SEARCH_ACCESS_TIME', payload: { searchId: string; seenPropertyIds?: string[] } };