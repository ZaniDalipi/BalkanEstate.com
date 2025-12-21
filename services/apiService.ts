import { Property, Seller, User, UserRole, SavedSearch, Message, Conversation, Filters } from '../types';

// Get API URL from environment variables
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

// --- TOKEN MANAGEMENT ---

const getToken = (): string | null => {
  return localStorage.getItem('balkan_estate_token');
};

const setToken = (token: string) => {
  localStorage.setItem('balkan_estate_token', token);
};

const getRefreshToken = (): string | null => {
  return localStorage.getItem('balkan_estate_refresh_token');
};

const setRefreshToken = (token: string) => {
  localStorage.setItem('balkan_estate_refresh_token', token);
};

const removeToken = () => {
  localStorage.removeItem('balkan_estate_token');
  localStorage.removeItem('balkan_estate_refresh_token');
};

// --- HTTP CLIENT ---

interface RequestOptions {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
  requiresAuth?: boolean;
}

// Helper function to refresh the access token
const refreshAccessToken = async (): Promise<string | null> => {
  try {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      return null;
    }

    const response = await fetch(`${API_URL}/auth/refresh-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (data.accessToken) {
      setToken(data.accessToken);
      if (data.refreshToken) {
        setRefreshToken(data.refreshToken);
      }
      return data.accessToken;
    }

    return null;
  } catch (error) {
    console.error('Token refresh error:', error);
    return null;
  }
};

const apiRequest = async <T>(endpoint: string, options: RequestOptions = {}, retryCount = 0): Promise<T> => {
  const { method = 'GET', body, headers = {}, requiresAuth = false } = options;

  const config: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  // Add authorization header if required
  if (requiresAuth) {
    const token = getToken();
    if (token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      };
    }
  }

  // Add body if present
  if (body) {
    config.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, config);

    // Handle non-JSON responses
    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');

    // Handle 401 Unauthorized - try to refresh token
    if (response.status === 401 && requiresAuth && retryCount === 0) {
      console.log('Access token expired, attempting to refresh...');
      const newAccessToken = await refreshAccessToken();

      if (newAccessToken) {
        console.log('Token refreshed successfully, retrying request...');
        // Retry the request with the new token
        return apiRequest<T>(endpoint, options, 1);
      } else {
        // Refresh failed, clear tokens and redirect to login
        console.log('Token refresh failed, logging out...');
        removeToken();
        throw new Error('Session expired. Please login again.');
      }
    }

    if (!response.ok) {
      const error = isJson ? await response.json() : { message: response.statusText };
      const err: any = new Error(error.message || 'An error occurred');
      err.code = error.code || null; // Preserve backend error code
      err.statusCode = response.status;
      err.details = error; // Preserve full error object
      throw err;
    }

    return isJson ? await response.json() : ({} as T);
  } catch (error: any) {
    console.error('API request error:', error);
    throw error;
  }
};

// --- MOCK DATA (for backward compatibility) ---

export const sellers: { [key: string]: Seller } = {
  seller1: { type: 'agent', name: 'Ana Kovačević', avatarUrl: 'https://i.pravatar.cc/150?u=ana', phone: '+381 64 123 4567' },
  seller2: { type: 'private', name: 'Marko Petrović', avatarUrl: 'https://i.pravatar.cc/150?u=marko', phone: '+385 91 987 6543' },
  seller3: { type: 'agent', name: 'Ivan Horvat', avatarUrl: 'https://i.pravatar.cc/150?u=ivan', phone: '+385 91 123 4567', agencyName: 'Adriatic Properties' },
  seller4: { type: 'agent', name: 'Elena Georgieva', avatarUrl: 'https://i.pravatar.cc/150?u=elena', phone: '+359 88 123 4567', agencyName: 'Sofia Homes' },
  seller5: { type: 'private', name: 'Adnan Hodžić', avatarUrl: 'https://i.pravatar.cc/150?u=adnan', phone: '+387 61 987 6543' },
  seller6: { type: 'agent', name: 'Nikos Papadopoulos', avatarUrl: 'https://i.pravatar.cc/150?u=nikos', phone: '+30 697 123 4567', agencyName: 'Hellas Real Estate' },
  seller7: { type: 'agent', name: 'Alen Isić', avatarUrl: 'https://i.pravatar.cc/150?u=alen', phone: '+387 62 111 2222', agencyName: 'Sarajevo Realty' },
};

export const mockUsers: { [key: string]: User } = {
  'user_seller_1': { id: 'user_seller_1', name: 'Ana Kovačević', email: 'ana.k@example.com', avatarUrl: 'https://i.pravatar.cc/150?u=ana', phone: '+381641234567', role: UserRole.AGENT, city: 'Belgrade', country: 'Serbia', agencyName: 'Balkan Premier Estates', agentId: 'AGENT-12345', licenseNumber: 'RS-LIC-9876', testimonials: [], isSubscribed: true },
  'user_seller_2': { id: 'user_seller_2', name: 'Marko Petrović', email: 'marko.p@example.com', avatarUrl: 'https://i.pravatar.cc/150?u=marko', phone: '+385919876543', role: UserRole.PRIVATE_SELLER, city: 'Zagreb', country: 'Croatia', testimonials: [], isSubscribed: false },
};

// For backward compatibility
export const allProperties: Property[] = [];

// --- AUTHENTICATION API ---

export const checkAuth = async (): Promise<User | null> => {
  try {
    const token = getToken();
    if (!token) return null;

    const response = await apiRequest<{ user: User }>('/auth/me', { requiresAuth: true });
    return response.user;
  } catch (error) {
    // If token is invalid, remove it
    removeToken();
    return null;
  }
};

export const login = async (emailOrPhone: string, password: string): Promise<User> => {
  // Determine if it's an email or phone number
  const isEmail = emailOrPhone.includes('@');
  const body = isEmail
    ? { email: emailOrPhone, password }
    : { phone: emailOrPhone, password };

  const response = await apiRequest<{ user: User; accessToken?: string; refreshToken?: string; token?: string }>('/auth/login', {
    method: 'POST',
    body,
  });

  // Handle both new (accessToken/refreshToken) and old (token) formats
  const accessToken = response.accessToken || response.token;
  const refreshToken = response.refreshToken;

  if (accessToken) {
    setToken(accessToken);
  }
  if (refreshToken) {
    setRefreshToken(refreshToken);
  }

  return response.user;
};

export const signup = async (
  email: string,
  password: string,
  options?: {
    name?: string;
    phone?: string;
    role?: 'buyer' | 'private_seller' | 'agent';
    licenseNumber?: string;
    agencyInvitationCode?: string;
  }
): Promise<User> => {
  const response = await apiRequest<{ user: User; accessToken?: string; refreshToken?: string; token?: string }>('/auth/signup', {
    method: 'POST',
    body: {
      email,
      password,
      name: options?.name || email.split('@')[0],
      phone: options?.phone || '',
      role: options?.role || 'buyer',
      licenseNumber: options?.licenseNumber,
      agencyInvitationCode: options?.agencyInvitationCode,
    },
  });

  // Handle both new (accessToken/refreshToken) and old (token) formats
  const accessToken = response.accessToken || response.token;
  const refreshToken = response.refreshToken;

  if (accessToken) {
    setToken(accessToken);
  }
  if (refreshToken) {
    setRefreshToken(refreshToken);
  }

  return response.user;
};

export const logout = async (): Promise<void> => {
  const refreshToken = getRefreshToken();

  try {
    // Call enhanced logout endpoint with refresh token
    await apiRequest('/auth/logout', {
      method: 'POST',
      requiresAuth: true,
      body: { refreshToken }
    });
  } catch (error) {
    console.error('Logout error:', error);
    // Continue with local cleanup even if server call fails
  }

  removeToken();
};

export const logoutAllDevices = async (): Promise<void> => {
  try {
    await apiRequest('/auth/logout-all', {
      method: 'POST',
      requiresAuth: true
    });
  } catch (error) {
    console.error('Logout all devices error:', error);
    // Continue with local cleanup even if server call fails
  }

  removeToken();
};

export interface LoginHistoryEntry {
  timestamp: Date;
  success: boolean;
  ipAddress?: string;
  userAgent?: string;
  deviceInfo?: string;
  location?: string;
  failureReason?: string;
}

export const getLoginHistory = async (): Promise<LoginHistoryEntry[]> => {
  const response = await apiRequest<{ loginHistory: LoginHistoryEntry[]; total: number }>('/auth/login-history', {
    requiresAuth: true
  });
  return response.loginHistory;
};

export const requestPasswordReset = async (email: string): Promise<{ message: string; resetToken?: string }> => {
  const response = await apiRequest<{ message: string; resetToken?: string }>('/auth/forgot-password', {
    method: 'POST',
    body: { email },
  });

  return response;
};

export const resetPassword = async (token: string, newPassword: string): Promise<User> => {
  const response = await apiRequest<{ user: User; accessToken?: string; refreshToken?: string; token?: string }>('/auth/reset-password', {
    method: 'POST',
    body: { token, newPassword },
  });

  // Handle both new (accessToken/refreshToken) and old (token) formats
  const accessToken = response.accessToken || response.token;
  const refreshToken = response.refreshToken;

  if (accessToken) {
    setToken(accessToken);
  }
  if (refreshToken) {
    setRefreshToken(refreshToken);
  }

  return response.user;
};

export const changePassword = async (currentPassword: string, newPassword: string): Promise<{ message: string }> => {
  const response = await apiRequest<{ message: string }>('/auth/change-password', {
    method: 'POST',
    requiresAuth: true,
    body: { currentPassword, newPassword },
  });

  // Password change logs out all devices, so remove local tokens
  removeToken();

  return response;
};

export const getAvailableOAuthProviders = async (): Promise<{ google: boolean; facebook: boolean; apple: boolean }> => {
  try {
    const response = await apiRequest<{ providers: { google: boolean; facebook: boolean; apple: boolean } }>('/auth/oauth/providers');
    return response.providers;
  } catch (error) {
    console.error('Error fetching OAuth providers:', error);
    // Return all false if endpoint fails
    return { google: false, facebook: false, apple: false };
  }
};

export const getOAuthUrl = (provider: 'google' | 'facebook' | 'apple'): string => {
  const baseUrl = API_URL.replace('/api', '');
  return `${baseUrl}/api/auth/${provider}`;
};

export const loginWithSocial = (provider: 'google' | 'facebook' | 'apple'): void => {
  // Redirect to backend OAuth endpoint
  window.location.href = getOAuthUrl(provider);
};

export const sendPhoneCode = async (phone: string): Promise<void> => {
  // TODO: Implement phone verification on backend
  console.log(`Sending code to ${phone}`);
};

export const verifyPhoneCode = async (phone: string, code: string): Promise<{ user: User | null; isNew: boolean }> => {
  // TODO: Implement phone verification on backend
  throw new Error('Phone verification not yet implemented');
};

export const completePhoneSignup = async (phone: string, name: string, email: string): Promise<User> => {
  // TODO: Implement phone signup on backend
  throw new Error('Phone signup not yet implemented');
};

export const updateUser = async (userData: Partial<User>): Promise<User> => {
  const response = await apiRequest<{ user: User }>('/auth/profile', {
    method: 'PUT',
    body: userData,
    requiresAuth: true,
  });

  return response.user;
};

export const updateAgentProfile = async (agentData: any): Promise<any> => {
  const response = await apiRequest<{ agent: any }>('/agents/profile', {
    method: 'PUT',
    body: agentData,
    requiresAuth: true,
  });

  return response.agent;
};

export const switchRole = async (
  role: UserRole,
  licenseData?: { licenseNumber: string; agencyInvitationCode?: string; agentId?: string; languages?: string[] }
): Promise<User> => {
  const response = await apiRequest<{ user: User; message: string }>('/auth/switch-role', {
    method: 'POST',
    body: { role, ...licenseData },
    requiresAuth: true,
  });

  return response.user;
};

// --- PROPERTIES API ---

export const getProperties = async (filters?: Filters): Promise<Property[]> => {
  const params = new URLSearchParams();

  if (filters) {
    if (filters.query) params.append('query', filters.query);
    if (filters.minPrice !== null) params.append('minPrice', filters.minPrice.toString());
    if (filters.maxPrice !== null) params.append('maxPrice', filters.maxPrice.toString());
    if (filters.beds !== null) params.append('beds', filters.beds.toString());
    if (filters.baths !== null) params.append('baths', filters.baths.toString());
    if (filters.livingRooms !== null) params.append('livingRooms', filters.livingRooms.toString());
    if (filters.minSqft !== null) params.append('minSqft', filters.minSqft.toString());
    if (filters.maxSqft !== null) params.append('maxSqft', filters.maxSqft.toString());
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.sellerType && filters.sellerType !== 'any') params.append('sellerType', filters.sellerType);
    if (filters.propertyType && filters.propertyType !== 'any') params.append('propertyType', filters.propertyType);
  }

  const queryString = params.toString();
  const endpoint = `/properties${queryString ? `?${queryString}` : ''}`;

  const response = await apiRequest<{ properties: any[]; pagination: any }>(endpoint);

  // Transform backend properties to match frontend Property type
  return response.properties.map(transformBackendProperty);
};

export const getProperty = async (id: string): Promise<Property> => {
  const response = await apiRequest<{ property: any }>(`/properties/${id}`);
  return transformBackendProperty(response.property);
};

export const createListing = async (propertyData: Property): Promise<{ property: Property; updatedSubscription?: any }> => {
  const backendPropertyData = transformToBackendProperty(propertyData);

  const response = await apiRequest<{ property: any; updatedSubscription?: any }>('/properties', {
    method: 'POST',
    body: backendPropertyData,
    requiresAuth: true,
  });

  return {
    property: transformBackendProperty(response.property),
    updatedSubscription: response.updatedSubscription,
  };
};

export const updateListing = async (propertyData: Property): Promise<Property> => {
  const backendPropertyData = transformToBackendProperty(propertyData);

  const response = await apiRequest<{ property: any }>(`/properties/${propertyData.id}`, {
    method: 'PUT',
    body: backendPropertyData,
    requiresAuth: true,
  });

  return transformBackendProperty(response.property);
};

export const deleteProperty = async (propertyId: string): Promise<{ updatedSubscription?: any }> => {
  const response = await apiRequest<{ message: string; updatedSubscription?: any }>(`/properties/${propertyId}`, {
    method: 'DELETE',
    requiresAuth: true,
  });

  return {
    updatedSubscription: response.updatedSubscription,
  };
};

export const markPropertyAsSold = async (propertyId: string): Promise<Property> => {
  const response = await apiRequest<{ property: any }>(`/properties/${propertyId}/mark-sold`, {
    method: 'PATCH',
    requiresAuth: true,
  });

  return transformBackendProperty(response.property);
};

export const getMyListings = async (role?: 'agent' | 'private_seller'): Promise<Property[]> => {
  // Build URL with optional role filter
  const url = role
    ? `/properties/my/listings?role=${role}`
    : '/properties/my/listings';

  const response = await apiRequest<{ properties: any[] }>(url, {
    requiresAuth: true,
  });

  return response.properties.map(transformBackendProperty);
};

/**
 * Upload property images to Cloudinary
 * @param images - Array of image files to upload
 * @param propertyId - Optional property ID for organized folder structure
 * @returns Array of uploaded images with URLs and public IDs
 *
 * If propertyId is provided, images will be stored in:
 *   balkan-estate/properties/user-{userId}/listing-{propertyId}/
 * Otherwise, they'll be stored in a temp folder:
 *   balkan-estate/properties/user-{userId}/temp/
 */
export const uploadPropertyImages = async (
  images: File[],
  propertyId?: string,
  retryCount = 0
): Promise<{ url: string; publicId: string; tag: string }[]> => {
  const formData = new FormData();
  images.forEach((image) => {
    formData.append('images', image);
  });

  // Add propertyId if provided
  if (propertyId) {
    formData.append('propertyId', propertyId);
  }

  let token = getToken();
  if (!token) {
    throw new Error('Not authorized. Please login again.');
  }

  const endpoint = propertyId
    ? `${API_URL}/properties/${propertyId}/upload-images`
    : `${API_URL}/properties/upload-images`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  // Handle 401 Unauthorized - try to refresh token
  if (response.status === 401 && retryCount === 0) {
    console.log('Access token expired during image upload, attempting to refresh...');
    const newAccessToken = await refreshAccessToken();

    if (newAccessToken) {
      console.log('Token refreshed successfully, retrying image upload...');
      // Retry the upload with the new token
      return uploadPropertyImages(images, propertyId, 1);
    } else {
      // Refresh failed, clear tokens
      console.log('Token refresh failed, logging out...');
      removeToken();
      throw new Error('Session expired. Please login again.');
    }
  }

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to upload images');
  }

  const data = await response.json();
  return data.images;
};

// --- FAVORITES API ---

export const toggleSavedHome = async (propertyId: string, isSaved: boolean): Promise<{ success: true }> => {
  await apiRequest('/favorites/toggle', {
    method: 'POST',
    body: { propertyId },
    requiresAuth: true,
  });

  return { success: true };
};

export const getFavorites = async (): Promise<Property[]> => {
  const response = await apiRequest<{ favorites: any[] }>('/favorites', {
    requiresAuth: true,
  });

  return response.favorites
    .filter((fav) => fav.propertyId)
    .map((fav) => transformBackendProperty(fav.propertyId));
};

// --- SAVED SEARCHES API ---

export const addSavedSearch = async (search: SavedSearch): Promise<SavedSearch> => {
  const response = await apiRequest<{ savedSearch: any }>('/saved-searches', {
    method: 'POST',
    body: {
      name: search.name,
      filters: search.filters,
      drawnBoundsJSON: search.drawnBoundsJSON,
    },
    requiresAuth: true,
  });

  return transformBackendSavedSearch(response.savedSearch);
};

export const getSavedSearches = async (): Promise<SavedSearch[]> => {
  const response = await apiRequest<{ savedSearches: any[] }>('/saved-searches', {
    requiresAuth: true,
  });

  return response.savedSearches.map(transformBackendSavedSearch);
};

export const updateSavedSearchAccessTime = async (searchId: string, seenPropertyIds?: string[]): Promise<{ success: true }> => {
  await apiRequest(`/saved-searches/${searchId}/access`, {
    method: 'PATCH',
    requiresAuth: true,
    body: seenPropertyIds ? { seenPropertyIds } : undefined,
  });

  return { success: true };
};

export const updateSavedSearch = async (searchId: string, name: string): Promise<SavedSearch> => {
  const response = await apiRequest<{ savedSearch: any }>(`/saved-searches/${searchId}`, {
    method: 'PUT',
    requiresAuth: true,
    body: { name },
  });

  return transformBackendSavedSearch(response.savedSearch);
};

export const deleteSavedSearch = async (searchId: string): Promise<void> => {
  await apiRequest(`/saved-searches/${searchId}`, {
    method: 'DELETE',
    requiresAuth: true,
  });
};

// --- CONVERSATIONS/MESSAGING API ---

export const getConversations = async (): Promise<Conversation[]> => {
  try {
    const response = await apiRequest<{ conversations: any[] }>('/conversations', {
      requiresAuth: true,
    });

    // Filter out any null or invalid conversations
    const validConversations = response.conversations?.filter(
      (conv: any) => conv && conv._id
    ) || [];

    return validConversations.map(transformBackendConversation);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return [];
  }
};

export const getConversation = async (conversationId: string): Promise<{ conversation: Conversation; messages: Message[] }> => {
  const response = await apiRequest<{ conversation: any; messages: any[] }>(`/conversations/${conversationId}`, {
    requiresAuth: true,
  });

  return {
    conversation: transformBackendConversation(response.conversation),
    messages: response.messages.map(transformBackendMessage),
  };
};

export const createConversation = async (propertyId: string): Promise<Conversation> => {
  const response = await apiRequest<{ conversation: any }>('/conversations', {
    method: 'POST',
    body: { propertyId },
    requiresAuth: true,
  });

  return transformBackendConversation(response.conversation);
};

export const deleteConversation = async (conversationId: string): Promise<void> => {
  await apiRequest(`/conversations/${conversationId}`, {
    method: 'DELETE',
    requiresAuth: true,
  });
};

export const sendMessage = async (conversationId: string, message: Message): Promise<{ message: Message; securityWarnings?: string[] }> => {
  const body: any = {};

  // Include text and imageUrl
  if (message.text) body.text = message.text;
  if (message.imageUrl) body.imageUrl = message.imageUrl;

  // Include E2E encryption fields if present
  if (message.encryptedMessage) body.encryptedMessage = message.encryptedMessage;
  if (message.encryptedKeys) body.encryptedKeys = message.encryptedKeys;
  if (message.iv) body.iv = message.iv;

  const response = await apiRequest<{ message: any; securityWarnings?: string[] }>(`/conversations/${conversationId}/messages`, {
    method: 'POST',
    body,
    requiresAuth: true,
  });

  return {
    message: transformBackendMessage(response.message),
    securityWarnings: response.securityWarnings,
  };
};

export const uploadMessageImage = async (conversationId: string, imageFile: File): Promise<string> => {
  const formData = new FormData();
  formData.append('image', imageFile);

  const token = getToken();
  const response = await fetch(`${API_URL}/conversations/${conversationId}/upload-image`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to upload image');
  }

  const data = await response.json();
  return data.imageUrl;
};

export const getSecurityWarning = async (): Promise<string> => {
  const response = await apiRequest<{ warning: string }>('/conversations/security-warning');
  return response.warning;
};

export const setPublicKey = async (publicKey: string): Promise<void> => {
  await apiRequest('/auth/set-public-key', {
    method: 'POST',
    body: { publicKey },
    requiresAuth: true,
  });
};

export const getConversationPublicKeys = async (conversationId: string): Promise<Record<string, string | null>> => {
  const response = await apiRequest<{ publicKeys: Record<string, string | null> }>(`/conversations/${conversationId}/public-keys`, {
    requiresAuth: true,
  });
  return response.publicKeys;
};

export const markConversationAsRead = async (conversationId: string): Promise<void> => {
  await apiRequest(`/conversations/${conversationId}/read`, {
    method: 'PATCH',
    requiresAuth: true,
  });
};

// --- USER DATA API ---

export const getMyData = async (): Promise<{ savedHomes: Property[]; savedSearches: SavedSearch[]; conversations: Conversation[] }> => {
  const [favorites, savedSearches, conversations] = await Promise.all([
    getFavorites(),
    getSavedSearches(),
    getConversations(),
  ]);

  return {
    savedHomes: favorites,
    savedSearches,
    conversations,
  };
};

// --- SUBSCRIPTION API ---

export const subscribe = async (plan: string): Promise<{ success: true }> => {
  // TODO: Implement subscription endpoint on backend
  console.log(`Subscribing to ${plan}`);
  return { success: true };
};

// --- TRANSFORMATION HELPERS ---

// Transform backend property to frontend Property type
function transformBackendProperty(backendProp: any): Property {
  const seller = backendProp.sellerId;

  return {
    id: backendProp._id,
    sellerId: seller._id || seller,
    status: backendProp.status,
    title: backendProp.title,
    soldAt: backendProp.soldAt ? new Date(backendProp.soldAt).getTime() : undefined,
    price: backendProp.price,
    address: backendProp.address,
    city: backendProp.city,
    country: backendProp.country,
    beds: backendProp.beds,
    baths: backendProp.baths,
    livingRooms: backendProp.livingRooms,
    sqft: backendProp.sqft,
    yearBuilt: backendProp.yearBuilt,
    parking: backendProp.parking,
    description: backendProp.description,
    specialFeatures: backendProp.specialFeatures || [],
    materials: backendProp.materials || [],
    amenities: backendProp.amenities || [],
    tourUrl: backendProp.tourUrl,
    virtualTour360Url: backendProp.virtualTour360Url,
    hasVirtualTour360: backendProp.hasVirtualTour360 || false,
    imageUrl: backendProp.imageUrl,
    images: backendProp.images || [],
    lat: backendProp.lat,
    lng: backendProp.lng,
    seller: {
      type: backendProp.createdAsRole === 'agent' ? 'agent' : 'private', // Use createdAsRole, not seller.role
      name: seller.name,
      phone: seller.phone,
      avatarUrl: seller.avatarUrl,
      agencyName: seller.agencyName,
      agencyLogo: seller.agencyLogo,
      agencyId: seller.agencyId,
    },
    propertyType: backendProp.propertyType,
    floorNumber: backendProp.floorNumber,
    totalFloors: backendProp.totalFloors,
    floorplanUrl: backendProp.floorplanUrl,
    createdAt: new Date(backendProp.createdAt).getTime(),
    lastRenewed: new Date(backendProp.lastRenewed).getTime(),
    views: backendProp.views || 0,
    saves: backendProp.saves || 0,
    inquiries: backendProp.inquiries || 0,
    // Dual-role system - this is the key field!
    createdAsRole: backendProp.createdAsRole,
    // Advanced property features
    furnishing: backendProp.furnishing,
    heatingType: backendProp.heatingType,
    condition: backendProp.condition,
    viewType: backendProp.viewType,
    energyRating: backendProp.energyRating,
    hasBalcony: backendProp.hasBalcony,
    hasGarden: backendProp.hasGarden,
    hasElevator: backendProp.hasElevator,
    hasSecurity: backendProp.hasSecurity,
    hasAirConditioning: backendProp.hasAirConditioning,
    hasPool: backendProp.hasPool,
    petsAllowed: backendProp.petsAllowed,
    distanceToCenter: backendProp.distanceToCenter,
    distanceToSea: backendProp.distanceToSea,
    distanceToSchool: backendProp.distanceToSchool,
    distanceToHospital: backendProp.distanceToHospital,
  };
}

// Transform frontend Property to backend format
function transformToBackendProperty(frontendProp: Property): any {
  return {
    status: frontendProp.status,
    title: frontendProp.title,
    price: frontendProp.price,
    address: frontendProp.address,
    city: frontendProp.city,
    country: frontendProp.country,
    beds: frontendProp.beds,
    baths: frontendProp.baths,
    livingRooms: frontendProp.livingRooms,
    sqft: frontendProp.sqft,
    yearBuilt: frontendProp.yearBuilt,
    parking: frontendProp.parking,
    description: frontendProp.description,
    specialFeatures: frontendProp.specialFeatures,
    materials: frontendProp.materials,
    amenities: frontendProp.amenities,
    tourUrl: frontendProp.tourUrl,
    virtualTour360Url: frontendProp.virtualTour360Url,
    hasVirtualTour360: frontendProp.hasVirtualTour360 || false,
    imageUrl: frontendProp.imageUrl,
    images: frontendProp.images,
    lat: frontendProp.lat,
    lng: frontendProp.lng,
    propertyType: frontendProp.propertyType,
    floorNumber: frontendProp.floorNumber,
    totalFloors: frontendProp.totalFloors,
    floorplanUrl: frontendProp.floorplanUrl,
    // Dual-role system
    createdAsRole: frontendProp.createdAsRole,
    // Advanced property features
    furnishing: frontendProp.furnishing,
    heatingType: frontendProp.heatingType,
    condition: frontendProp.condition,
    viewType: frontendProp.viewType,
    energyRating: frontendProp.energyRating,
    hasBalcony: frontendProp.hasBalcony,
    hasGarden: frontendProp.hasGarden,
    hasElevator: frontendProp.hasElevator,
    hasSecurity: frontendProp.hasSecurity,
    hasAirConditioning: frontendProp.hasAirConditioning,
    hasPool: frontendProp.hasPool,
    petsAllowed: frontendProp.petsAllowed,
    distanceToCenter: frontendProp.distanceToCenter,
    distanceToSea: frontendProp.distanceToSea,
    distanceToSchool: frontendProp.distanceToSchool,
    distanceToHospital: frontendProp.distanceToHospital,
  };
}

// Transform backend saved search to frontend SavedSearch type
function transformBackendSavedSearch(backendSearch: any): SavedSearch {
  return {
    id: backendSearch._id,
    name: backendSearch.name,
    filters: backendSearch.filters,
    drawnBoundsJSON: backendSearch.drawnBoundsJSON,
    createdAt: new Date(backendSearch.createdAt).getTime(),
    lastAccessed: new Date(backendSearch.lastAccessed).getTime(),
    seenPropertyIds: backendSearch.seenPropertyIds || [],
  };
}

function transformBackendConversation(backendConv: any): Conversation {
  // Add null checks for all nested objects
  const property = backendConv.propertyId || null;
  const buyer = backendConv.buyerId || null;
  const seller = backendConv.sellerId || null;

  return {
    id: backendConv._id,
    propertyId: property ? (property._id || property) : null,
    property: property && property._id ? transformBackendProperty(property) : undefined,
    buyerId: buyer ? (buyer._id || buyer) : null,
    sellerId: seller ? (seller._id || seller) : null,
    buyer: buyer && buyer._id ? {
      id: buyer._id,
      name: buyer.name,
      avatarUrl: buyer.avatarUrl,
    } : undefined,
    seller: seller && seller._id ? {
      id: seller._id,
      name: seller.name,
      avatarUrl: seller.avatarUrl,
      role: seller.role,
      agencyName: seller.agencyName,
    } : undefined,
    messages: [],
    lastMessage: backendConv.lastMessage ? transformBackendMessage(backendConv.lastMessage) : undefined,
    createdAt: new Date(backendConv.createdAt).getTime(),
    isRead: backendConv.buyerUnreadCount === 0 && backendConv.sellerUnreadCount === 0,
    buyerUnreadCount: backendConv.buyerUnreadCount || 0,
    sellerUnreadCount: backendConv.sellerUnreadCount || 0,
  };
}

// Transform backend message to frontend Message type
function transformBackendMessage(backendMsg: any): Message {
  const sender = backendMsg.senderId || null;
  
  return {
    id: backendMsg._id,
    senderId: sender ? (sender._id || sender) : null,
    text: backendMsg.text,
    imageUrl: backendMsg.imageUrl,
    encryptedMessage: backendMsg.encryptedMessage,
    encryptedKeys: backendMsg.encryptedKeys,
    iv: backendMsg.iv,
    timestamp: new Date(backendMsg.createdAt).getTime(),
    isRead: backendMsg.isRead,
  };
}

// --- AGENCY API ---

export const getAgencies = async (filters?: { city?: string; featured?: boolean; page?: number; limit?: number }): Promise<any> => {
  const params = new URLSearchParams();
  if (filters?.city) params.append('city', filters.city);
  if (filters?.featured !== undefined) params.append('featured', String(filters.featured));
  if (filters?.page) params.append('page', String(filters.page));
  if (filters?.limit) params.append('limit', String(filters.limit));

  return await apiRequest(`/agencies?${params.toString()}`);
};

export const getAgency = async (agencyId: string): Promise<any> => {
  return await apiRequest(`/agencies/${agencyId}`, { requiresAuth: true });
};

export const getFeaturedAgencies = async (limit?: number): Promise<any> => {
  const params = limit ? `?limit=${limit}` : '';
  return await apiRequest(`/agencies/featured/rotation${params}`);
};

export const createAgency = async (agencyData: any): Promise<any> => {
  return await apiRequest('/agencies', {
    method: 'POST',
    body: agencyData,
    requiresAuth: true,
  });
};

export const updateAgency = async (agencyId: string, agencyData: any): Promise<any> => {
  return await apiRequest(`/agencies/${agencyId}`, {
    method: 'PUT',
    body: agencyData,
    requiresAuth: true,
  });
};

export const getAgencyAgents = async (agencyId: string): Promise<{ agents: any[] }> => {
  // The agency endpoint returns agents as part of the agency object
  const response = await apiRequest<{ agency: any }>(`/agencies/${agencyId}`, {
    requiresAuth: false,
  });
  // Transform the agents from User format to Agent format
  const agents = (response.agency?.agents || []).map((agent: any) => ({
    id: agent._id || agent.id,
    userId: agent._id || agent.id,
    name: agent.name || '',
    email: agent.email || '',
    phone: agent.phone || '',
    avatarUrl: agent.avatarUrl,
    role: agent.role || 'agent',
    agencyName: response.agency?.name,
    rating: agent.stats?.rating || 0,
    totalReviews: 0,
    propertiesSold: agent.stats?.propertiesSold || 0,
    activeListings: agent.stats?.activeListings || 0,
    totalSalesValue: agent.stats?.totalSalesValue || 0,
  }));
  return { agents };
};

export const addAgentToAgency = async (agencyId: string, agentUserId: string): Promise<any> => {
  return await apiRequest(`/agencies/${agencyId}/agents`, {
    method: 'POST',
    body: { agentUserId },
    requiresAuth: true,
  });
};

export const removeAgentFromAgency = async (agencyId: string, agentId: string): Promise<any> => {
  return await apiRequest(`/agencies/${agencyId}/agents/${agentId}`, {
    method: 'DELETE',
    requiresAuth: true,
  });
};

export const joinAgencyByInvitationCode = async (invitationCode: string, agencyId?: string): Promise<any> => {
  return await apiRequest('/agencies/join-by-code', {
    method: 'POST',
    body: { invitationCode, agencyId },
    requiresAuth: true,
  });
};

// --- AGENCY JOIN REQUEST API ---

export const createJoinRequest = async (agencyId: string, message?: string): Promise<any> => {
  return await apiRequest('/agency-join-requests', {
    method: 'POST',
    body: { agencyId, message },
    requiresAuth: true,
  });
};

export const getAgentJoinRequests = async (): Promise<any> => {
  return await apiRequest('/agency-join-requests/my-requests', {
    requiresAuth: true,
  });
};

export const getAgencyJoinRequests = async (agencyId: string): Promise<any> => {
  return await apiRequest(`/agency-join-requests/agency/${agencyId}`, {
    requiresAuth: true,
  });
};

export const approveJoinRequest = async (requestId: string): Promise<any> => {
  return await apiRequest(`/agency-join-requests/${requestId}/approve`, {
    method: 'PUT',
    requiresAuth: true,
  });
};

export const rejectJoinRequest = async (requestId: string): Promise<any> => {
  return await apiRequest(`/agency-join-requests/${requestId}/reject`, {
    method: 'PUT',
    requiresAuth: true,
  });
};

export const cancelJoinRequest = async (requestId: string): Promise<any> => {
  return await apiRequest(`/agency-join-requests/${requestId}`, {
    method: 'DELETE',
    requiresAuth: true,
  });
};

// --- AGENCY ADMIN MANAGEMENT API ---

export const addAgencyAdmin = async (agencyId: string, userId: string): Promise<any> => {
  return await apiRequest(`/agencies/${agencyId}/admins`, {
    method: 'POST',
    body: { userId },
    requiresAuth: true,
  });
};

export const removeAgencyAdmin = async (agencyId: string, userId: string): Promise<any> => {
  return await apiRequest(`/agencies/${agencyId}/admins/${userId}`, {
    method: 'DELETE',
    requiresAuth: true,
  });
};

export const verifyInvitationCode = async (agencyId: string, code: string): Promise<{valid: boolean; message?: string}> => {
  return await apiRequest(`/agencies/${agencyId}/verify-code`, {
    method: 'POST',
    body: { code },
    requiresAuth: true,
  });
};

export const findAgencyByInvitationCode = async (code: string): Promise<{success: boolean; agency: any}> => {
  return await apiRequest('/agencies/find-by-code', {
    method: 'POST',
    body: { code },
    requiresAuth: true,
  });
};

// --- PROMOTION API ---

export interface PromotionTier {
  id: string;
  name: string;
  description: string;
  features: string[];
  icon: string;
  color: string;
  highlight?: boolean;
}

export interface PromotionPricing {
  tierId: string;
  duration: number;
  price: number;
}

export interface UrgentModifier {
  id: string;
  name: string;
  description: string;
  price: number;
  badgeColor: string;
  canCombineWith: string[];
}

export interface AgencyPlanAllocation {
  planId: string;
  planName: string;
  monthlyFeaturedAds: number;
  monthlyHighlightAds: number;
  monthlyPremiumAds: number;
  discountPercentage: number;
}

export interface PromotionTiersResponse {
  tiers: Record<string, PromotionTier>;
  pricing: PromotionPricing[];
  urgentModifier: UrgentModifier;
  agencyAllocations: AgencyPlanAllocation[];
}

export interface PurchasePromotionParams {
  propertyId: string;
  promotionTier: 'featured' | 'highlight' | 'premium';
  duration: 7 | 15 | 30 | 60 | 90;
  hasUrgentBadge?: boolean;
  useAgencyAllocation?: boolean;
  couponCode?: string;
}

export interface CouponValidationResult {
  isValid: boolean;
  discount: number;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  message?: string;
}

export interface AgencyAllocation {
  plan: AgencyPlanAllocation;
  usage: {
    featured: number;
    highlight: number;
    premium: number;
  };
  remaining: {
    featured: number;
    highlight: number;
    premium: number;
  };
}

/**
 * Get all available promotion tiers, pricing, and agency allocations
 */
export const getPromotionTiers = async (): Promise<PromotionTiersResponse> => {
  return await apiRequest('/promotions/tiers');
};

/**
 * Get agency's monthly promotion allocation and usage (requires agency owner)
 */
export const getAgencyAllocation = async (): Promise<{ allocation: AgencyAllocation; agency: any }> => {
  return await apiRequest('/promotions/agency/allocation', {
    requiresAuth: true,
  });
};

/**
 * Purchase a property promotion with advanced options
 */
export const purchasePromotion = async (params: PurchasePromotionParams): Promise<any> => {
  return await apiRequest('/promotions', {
    method: 'POST',
    body: params,
    requiresAuth: true,
  });
};

/**
 * Validate a coupon code and get discount information
 */
export const validateCoupon = async (
  couponCode: string,
  promotionTier: string,
  price: number
): Promise<CouponValidationResult> => {
  const response = await apiRequest<{
    valid: boolean;
    coupon?: {
      code: string;
      description?: string;
      discountType: 'percentage' | 'fixed';
      discountValue: number;
    };
    discount?: {
      amount: number;
      originalPrice: number;
      finalPrice: number;
      savings: number;
      savingsPercentage: number;
    };
    message?: string;
  }>('/coupons/validate', {
    method: 'POST',
    body: { couponCode, promotionTier, price },
    requiresAuth: true,
  });

  // Map backend response to frontend interface
  return {
    isValid: response.valid,
    discount: response.discount?.amount || 0,
    discountType: response.coupon?.discountType || 'fixed',
    discountValue: response.coupon?.discountValue || 0,
    message: response.valid
      ? response.coupon?.description
      : response.message,
  };
};

/**
 * Get user's promotions
 */
export const getMyPromotions = async (): Promise<any> => {
  return await apiRequest('/promotions', {
    requiresAuth: true,
  });
};

/**
 * Cancel/deactivate a promotion
 */
export const cancelPromotion = async (promotionId: string): Promise<any> => {
  return await apiRequest(`/promotions/${promotionId}`, {
    method: 'DELETE',
    requiresAuth: true,
  });
};

/**
 * Get featured/promoted properties (public)
 */
export const getFeaturedProperties = async (filters?: {
  city?: string;
  tier?: string;
  limit?: number
}): Promise<any> => {
  const params = new URLSearchParams();
  if (filters?.city) params.append('city', filters.city);
  if (filters?.tier) params.append('tier', filters.tier);
  if (filters?.limit) params.append('limit', String(filters.limit));

  return await apiRequest(`/promotions/featured?${params.toString()}`);
};

/**
 * Get promotion statistics
 */
export const getPromotionStats = async (promotionId: string): Promise<any> => {
  return await apiRequest(`/promotions/${promotionId}/stats`, {
    requiresAuth: true,
  });
};


// --- AGENTS API ---

// Transform backend agent to frontend Agent type
function transformBackendAgent(backendAgent: any): any {
  const user = backendAgent.userId || {};
  const userId = typeof user === 'object' && user._id ? user._id : user;
  const agency = backendAgent.agencyId || {};
  const agencyId = typeof agency === 'object' && agency._id ? agency._id : agency;
  return {
    id: backendAgent._id || backendAgent.id,
    userId: String(userId), // The actual user ID for matching properties
    name: user.name || '',
    email: user.email || '',
    phone: user.phone || '',
    avatarUrl: user.avatarUrl,
    city: user.city,
    country: user.country,
    role: 'agent',
    agencyName: backendAgent.agencyName,
    agencyId: agencyId ? String(agencyId) : undefined,
    agencyLogo: agency.logo,
    agencyGradient: agency.coverGradient,
    agencyCoverImage: agency.coverImage,
    agencySlug: agency.slug,
    agentId: backendAgent.agentId,
    licenseNumber: backendAgent.licenseNumber,
    licenseVerified: backendAgent.licenseVerified,
    licenseVerificationDate: backendAgent.licenseVerificationDate,
    testimonials: backendAgent.testimonials || [],
    rating: backendAgent.rating || 0,
    totalSalesValue: backendAgent.totalSalesValue || 0,
    propertiesSold: backendAgent.totalSales || 0,
    activeListings: backendAgent.activeListings || 0,
    totalReviews: backendAgent.totalReviews || 0,
    isSubscribed: false,
    // Additional agent fields
    bio: backendAgent.bio,
    specializations: backendAgent.specializations || [],
    yearsOfExperience: backendAgent.yearsOfExperience,
    languages: backendAgent.languages || [],
    serviceAreas: backendAgent.serviceAreas || [],
    websiteUrl: backendAgent.websiteUrl,
    facebookUrl: backendAgent.facebookUrl,
    instagramUrl: backendAgent.instagramUrl,
    linkedinUrl: backendAgent.linkedinUrl,
    officeAddress: backendAgent.officeAddress,
    officePhone: backendAgent.officePhone,
    lat: backendAgent.lat,
    lng: backendAgent.lng,
  };
}

export const getAllAgents = async (): Promise<any> => {
  const response = await apiRequest<{ agents?: any[] }>("/agents");
  if (response.agents) {
    response.agents = response.agents.map(transformBackendAgent);
  }
  return response;
};

export const addAgentReview = async (agentId: string, review: { quote: string; rating: number; propertyId?: string }): Promise<any> => {
  const response = await apiRequest<{ agent?: any }>(`/agents/${agentId}/reviews`, {
    method: 'POST',
    body: review,
    requiresAuth: true,
  });
  if (response.agent) {
    response.agent = transformBackendAgent(response.agent);
  }
  return response;
};

export const leaveAgency = async (): Promise<{ message: string; user: { id: string; agencyId: null; agencyName: string } }> => {
  return await apiRequest('/agents/leave-agency', {
    method: 'POST',
    requiresAuth: true,
  });
};

// --- AGENCY FEATURED SUBSCRIPTION API ---

export const createFeaturedSubscription = async (
  agencyId: string,
  data: { interval?: 'weekly' | 'monthly' | 'yearly'; couponCode?: string; startTrial?: boolean }
): Promise<any> => {
  return await apiRequest(`/agencies/${agencyId}/featured-subscription`, {
    method: 'POST',
    body: data,
    requiresAuth: true,
  });
};

export const getFeaturedSubscription = async (agencyId: string): Promise<any> => {
  return await apiRequest(`/agencies/${agencyId}/featured-subscription`, {
    requiresAuth: false,
  });
};

export const cancelFeaturedSubscription = async (
  agencyId: string,
  immediately: boolean = false
): Promise<any> => {
  return await apiRequest(`/agencies/${agencyId}/featured-subscription`, {
    method: 'DELETE',
    body: { immediately },
    requiresAuth: true,
  });
};

export const confirmFeaturedPayment = async (
  agencyId: string,
  data: { stripeSubscriptionId: string; stripeCustomerId: string }
): Promise<any> => {
  return await apiRequest(`/agencies/${agencyId}/featured-subscription/confirm-payment`, {
    method: 'POST',
    body: data,
    requiresAuth: true,
  });
};

export const applyFeaturedCoupon = async (
  agencyId: string,
  couponCode: string
): Promise<any> => {
  return await apiRequest(`/agencies/${agencyId}/featured-subscription/apply-coupon`, {
    method: 'POST',
    body: { couponCode },
    requiresAuth: true,
  });
};

// Admin endpoints
export const getAllFeaturedSubscriptions = async (params?: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<any> => {
  const queryParams = new URLSearchParams();
  if (params?.status) queryParams.append('status', params.status);
  if (params?.page) queryParams.append('page', String(params.page));
  if (params?.limit) queryParams.append('limit', String(params.limit));

  return await apiRequest(`/admin/featured-subscriptions?${queryParams.toString()}`, {
    requiresAuth: true,
  });
};

export const checkExpiredSubscriptions = async (): Promise<any> => {
  return await apiRequest('/admin/featured-subscriptions/check-expired', {
    method: 'POST',
    requiresAuth: true,
  });
};

// ============================================================================
// CITY MARKET DATA & RECOMMENDATIONS
// ============================================================================

export interface CityMarketData {
  _id: string;
  city: string;
  country: string;
  countryCode: string;
  avgPricePerSqm: number;
  medianPrice: number;
  priceGrowthYoY: number;
  priceGrowthMoM: number;
  averageDaysOnMarket: number;
  listingsCount: number;
  soldLastMonth: number;
  demandScore: number;
  rentalYield: number;
  investmentScore: number;
  topNeighborhoods: string[];
  marketTrend: 'rising' | 'stable' | 'declining';
  highlights: string[];
  lastUpdated: string;
  dataSource: 'gemini' | 'manual' | 'calculated';
  featured: boolean;
  displayOrder: number;
}

/**
 * Get featured city recommendations
 */
export const getFeaturedCities = async (limit: number = 12): Promise<CityMarketData[]> => {
  const response = await apiRequest<{ cities: CityMarketData[] }>(`/cities/featured?limit=${limit}`, {
    requiresAuth: false,
  });
  return response.cities;
};

/**
 * Get cities by country
 */
export const getCitiesByCountry = async (country: string): Promise<CityMarketData[]> => {
  const response = await apiRequest<{ cities: CityMarketData[] }>(`/cities/country/${encodeURIComponent(country)}`, {
    requiresAuth: false,
  });
  return response.cities;
};

/**
 * Get market data for a specific city
 */
export const getCityMarketData = async (city: string, country: string): Promise<CityMarketData> => {
  const response = await apiRequest<{ data: CityMarketData }>(
    `/cities/market-data/${encodeURIComponent(city)}/${encodeURIComponent(country)}`,
    {
      requiresAuth: false,
    }
  );
  return response.data;
};

/**
 * Manually trigger market data update (admin only)
 */
export const triggerMarketDataUpdate = async (): Promise<void> => {
  await apiRequest('/cities/update-market-data', {
    method: 'POST',
    requiresAuth: true,
  });
};
