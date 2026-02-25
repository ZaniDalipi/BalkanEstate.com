import { API_CONFIG } from '../../../shared/constants/app.constants';

const BASE_URL = `${API_CONFIG.BASE_URL}/property-requests`;

export interface PropertyRequestData {
  name: string;
  email?: string;
  phone?: string;
  telegramUsername?: string;
  listingType: 'sale' | 'rent';
  propertyType?: string;
  country?: string;
  city?: string;
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  minBeds?: number;
  minBaths?: number;
  minSqft?: number;
  maxSqft?: number;
  amenities?: string[];
  additionalNotes?: string;
}

export interface PropertyRequest {
  _id: string;
  name: string;
  email?: string;
  telegramUsername?: string;
  source: 'website' | 'telegram';
  listingType: 'sale' | 'rent';
  propertyType: string;
  country?: string;
  city?: string;
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  minBeds?: number;
  minBaths?: number;
  minSqft?: number;
  maxSqft?: number;
  additionalNotes?: string;
  status: 'active' | 'matched' | 'closed' | 'expired';
  responseCount: number;
  createdAt: string;
}

export interface PropertyRequestsResponse {
  requests: PropertyRequest[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PropertyRequestStats {
  totalActive: number;
  recentCount: number;
  byType: Record<string, number>;
  topCountries: { country: string; count: number }[];
}

export interface TelegramInfo {
  groupLink: string;
  botUsername: string;
  features: string[];
}

export async function fetchPropertyRequests(params: {
  page?: number;
  limit?: number;
  listingType?: string;
  propertyType?: string;
  country?: string;
  city?: string;
} = {}): Promise<PropertyRequestsResponse> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', String(params.page));
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.listingType) searchParams.set('listingType', params.listingType);
  if (params.propertyType) searchParams.set('propertyType', params.propertyType);
  if (params.country) searchParams.set('country', params.country);
  if (params.city) searchParams.set('city', params.city);

  const response = await fetch(`${BASE_URL}?${searchParams.toString()}`);
  if (!response.ok) throw new Error('Failed to fetch property requests');
  return response.json();
}

export async function createPropertyRequest(data: PropertyRequestData): Promise<{ message: string; request: PropertyRequest }> {
  const token = localStorage.getItem('balkan_estate_token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(BASE_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to submit property request');
  }
  return response.json();
}

export async function fetchPropertyRequestStats(): Promise<PropertyRequestStats> {
  const response = await fetch(`${BASE_URL}/stats`);
  if (!response.ok) throw new Error('Failed to fetch request stats');
  return response.json();
}

export async function fetchTelegramInfo(): Promise<TelegramInfo> {
  const response = await fetch(`${API_CONFIG.BASE_URL}/telegram/info`);
  if (!response.ok) throw new Error('Failed to fetch Telegram info');
  return response.json();
}
