// Properties API module
// Handles all property-related API calls

import { apiRequest, uploadRequest } from '@/src/shared/api';
import type { Property, Filters, UserRole } from '@/src/shared/types';

// --- Transformers ---

export function transformBackendProperty(backendProp: any): Property {
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
    videoUrl: backendProp.videoUrl,
    imageUrl: backendProp.imageUrl,
    images: backendProp.images || [],
    lat: backendProp.lat,
    lng: backendProp.lng,
    seller: {
      type: backendProp.createdAsRole === 'agent' ? 'agent' : 'private',
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
    createdAsRole: backendProp.createdAsRole,
    listingType: backendProp.listingType || 'sale',
    rentPeriod: backendProp.rentPeriod,
    securityDeposit: backendProp.securityDeposit,
    minimumLeaseDuration: backendProp.minimumLeaseDuration,
    maximumLeaseDuration: backendProp.maximumLeaseDuration,
    availableFrom: backendProp.availableFrom ? new Date(backendProp.availableFrom).getTime() : undefined,
    utilitiesIncluded: backendProp.utilitiesIncluded,
    internetIncluded: backendProp.internetIncluded,
    tenantRequirements: backendProp.tenantRequirements,
    maxOccupants: backendProp.maxOccupants,
    rentedAt: backendProp.rentedAt ? new Date(backendProp.rentedAt).getTime() : undefined,
    rentedUntil: backendProp.rentedUntil ? new Date(backendProp.rentedUntil).getTime() : undefined,
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
    isPromoted: backendProp.isPromoted || false,
    promotionTier: backendProp.promotionTier,
    promotionStartDate: backendProp.promotionStartDate
      ? new Date(backendProp.promotionStartDate).getTime()
      : undefined,
    promotionEndDate: backendProp.promotionEndDate
      ? new Date(backendProp.promotionEndDate).getTime()
      : undefined,
    hasUrgentBadge: backendProp.hasUrgentBadge || false,
    orientation: backendProp.orientation,
    visitAvailability: backendProp.visitAvailability,
  };
}

export function transformToBackendProperty(frontendProp: Property): any {
  const result: any = {
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
    imageUrl: frontendProp.imageUrl,
    images: frontendProp.images,
    lat: frontendProp.lat,
    lng: frontendProp.lng,
    propertyType: frontendProp.propertyType,
    createdAsRole: frontendProp.createdAsRole,
    listingType: frontendProp.listingType || 'sale',
    // Always include boolean amenities (default to false if undefined)
    hasBalcony: frontendProp.hasBalcony ?? false,
    hasGarden: frontendProp.hasGarden ?? false,
    hasElevator: frontendProp.hasElevator ?? false,
    hasSecurity: frontendProp.hasSecurity ?? false,
    hasAirConditioning: frontendProp.hasAirConditioning ?? false,
    hasPool: frontendProp.hasPool ?? false,
    petsAllowed: frontendProp.petsAllowed ?? false,
    // Always include virtual tour flag
    hasVirtualTour360: frontendProp.hasVirtualTour360 ?? false,
  };

  // Rental-specific fields - always include all fields for rent listings
  if (frontendProp.listingType === 'rent') {
    result.rentPeriod = frontendProp.rentPeriod || 'monthly';
    result.securityDeposit = frontendProp.securityDeposit ?? 0;
    result.minimumLeaseDuration = frontendProp.minimumLeaseDuration ?? 1;
    result.maximumLeaseDuration = frontendProp.maximumLeaseDuration ?? 12;
    result.utilitiesIncluded = frontendProp.utilitiesIncluded ?? false;
    result.internetIncluded = frontendProp.internetIncluded ?? false;
    result.tenantRequirements = frontendProp.tenantRequirements || [];
    result.maxOccupants = frontendProp.maxOccupants ?? 1;
    if (frontendProp.availableFrom) {
      result.availableFrom = new Date(frontendProp.availableFrom).toISOString();
    }
  }

  // URL fields
  if (frontendProp.tourUrl) result.tourUrl = frontendProp.tourUrl;
  if (frontendProp.virtualTour360Url) {
    result.virtualTour360Url = frontendProp.virtualTour360Url;
    result.hasVirtualTour360 = true;
  }
  if (frontendProp.videoUrl) result.videoUrl = frontendProp.videoUrl;
  if (frontendProp.floorplanUrl) result.floorplanUrl = frontendProp.floorplanUrl;

  // Floor info
  if (frontendProp.floorNumber !== undefined && frontendProp.floorNumber > 0) {
    result.floorNumber = frontendProp.floorNumber;
  }
  if (frontendProp.totalFloors !== undefined && frontendProp.totalFloors > 0) {
    result.totalFloors = frontendProp.totalFloors;
  }

  // Advanced property features
  if (frontendProp.furnishing && frontendProp.furnishing !== 'any') {
    result.furnishing = frontendProp.furnishing;
  }
  if (frontendProp.heatingType && frontendProp.heatingType !== 'any') {
    result.heatingType = frontendProp.heatingType;
  }
  if (frontendProp.condition && frontendProp.condition !== 'any') {
    result.condition = frontendProp.condition;
  }
  if (frontendProp.viewType && frontendProp.viewType !== 'any') {
    result.viewType = frontendProp.viewType;
  }
  if (frontendProp.energyRating && frontendProp.energyRating !== 'any') {
    result.energyRating = frontendProp.energyRating;
  }
  if (frontendProp.orientation && frontendProp.orientation !== 'any') {
    result.orientation = frontendProp.orientation;
  }
  if (frontendProp.visitAvailability) {
    result.visitAvailability = frontendProp.visitAvailability;
  }

  // Distance fields
  if (frontendProp.distanceToCenter !== undefined)
    result.distanceToCenter = frontendProp.distanceToCenter;
  if (frontendProp.distanceToSea !== undefined) result.distanceToSea = frontendProp.distanceToSea;
  if (frontendProp.distanceToSchool !== undefined)
    result.distanceToSchool = frontendProp.distanceToSchool;
  if (frontendProp.distanceToHospital !== undefined)
    result.distanceToHospital = frontendProp.distanceToHospital;

  return result;
}

// --- API Functions ---

export const getProperties = async (filters?: Filters, options?: { limit?: number }): Promise<Property[]> => {
  const params = new URLSearchParams();

  // Add limit parameter - default to 1000 to get all properties for map/saved searches
  params.append('limit', String(options?.limit || 1000));

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
    if (filters.sellerType && filters.sellerType !== 'any')
      params.append('sellerType', filters.sellerType);
    if (filters.propertyType && filters.propertyType !== 'any')
      params.append('propertyType', filters.propertyType);
    if (filters.listingType && filters.listingType !== 'any')
      params.append('listingType', filters.listingType);
    if (filters.minPricePerSqm !== null && filters.minPricePerSqm !== undefined)
      params.append('minPricePerSqm', filters.minPricePerSqm.toString());
    if (filters.maxPricePerSqm !== null && filters.maxPricePerSqm !== undefined)
      params.append('maxPricePerSqm', filters.maxPricePerSqm.toString());
    if (filters.maxDaysListed !== null && filters.maxDaysListed !== undefined)
      params.append('maxDaysListed', filters.maxDaysListed.toString());
    if (filters.hasDiscount === true)
      params.append('hasDiscount', 'true');
  }

  const queryString = params.toString();
  const endpoint = `/properties${queryString ? `?${queryString}` : ''}`;
  const response = await apiRequest<{ properties: any[]; pagination: any }>(endpoint);

  return response.properties.map(transformBackendProperty);
};

export const getProperty = async (id: string): Promise<Property> => {
  const response = await apiRequest<{ property: any }>(`/properties/${id}`);
  return transformBackendProperty(response.property);
};

export const getPropertiesBySellerId = async (sellerId: string): Promise<Property[]> => {
  // Fetch active, sold, and rented properties for the seller
  const [activeResponse, soldResponse, rentedResponse] = await Promise.all([
    apiRequest<{ properties: any[]; pagination: any }>(`/properties?sellerId=${sellerId}&status=active&limit=1000`),
    apiRequest<{ properties: any[]; pagination: any }>(`/properties?sellerId=${sellerId}&status=sold&limit=1000`),
    apiRequest<{ properties: any[]; pagination: any }>(`/properties?sellerId=${sellerId}&status=rented&limit=1000`),
  ]);

  const allProperties = [
    ...activeResponse.properties,
    ...soldResponse.properties,
    ...rentedResponse.properties,
  ];

  return allProperties.map(transformBackendProperty);
};

export const createProperty = async (
  propertyData: Property
): Promise<{ property: Property; updatedSubscription?: any }> => {
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

export const updateProperty = async (propertyData: Property): Promise<Property> => {
  const backendPropertyData = transformToBackendProperty(propertyData);
  const response = await apiRequest<{ property: any }>(`/properties/${propertyData.id}`, {
    method: 'PUT',
    body: backendPropertyData,
    requiresAuth: true,
  });

  return transformBackendProperty(response.property);
};

export const deleteProperty = async (
  propertyId: string
): Promise<{ updatedSubscription?: any }> => {
  const response = await apiRequest<{ message: string; updatedSubscription?: any }>(
    `/properties/${propertyId}`,
    {
      method: 'DELETE',
      requiresAuth: true,
    }
  );

  return { updatedSubscription: response.updatedSubscription };
};

export const markPropertyAsSold = async (propertyId: string): Promise<Property> => {
  const response = await apiRequest<{ property: any }>(`/properties/${propertyId}/mark-sold`, {
    method: 'PATCH',
    requiresAuth: true,
  });

  return transformBackendProperty(response.property);
};

export const getMyListings = async (role?: 'agent' | 'private_seller'): Promise<Property[]> => {
  const url = role ? `/properties/my/listings?role=${role}` : '/properties/my/listings';
  const response = await apiRequest<{ properties: any[] }>(url, { requiresAuth: true });
  return response.properties.map(transformBackendProperty);
};

export const renewProperty = async (
  propertyId: string
): Promise<{
  success: boolean;
  message: string;
  property?: Property;
  lastRenewed?: string;
  canRenewAt?: string;
  code?: string;
  hoursRemaining?: number;
  minutesRemaining?: number;
}> => {
  return apiRequest(`/properties/${propertyId}/renew`, {
    method: 'PATCH',
    requiresAuth: true,
  });
};

// --- Image Upload ---

export interface UploadedImage {
  url: string;
  publicId: string;
  tag: string;
}

export const uploadPropertyImages = async (
  images: File[],
  propertyId?: string
): Promise<UploadedImage[]> => {
  const formData = new FormData();
  images.forEach((image) => {
    formData.append('images', image);
  });

  if (propertyId) {
    formData.append('propertyId', propertyId);
  }

  const endpoint = propertyId
    ? `/properties/${propertyId}/upload-images`
    : '/properties/upload-images';

  const response = await uploadRequest<{ images: UploadedImage[] }>(endpoint, formData);
  return response.images;
};
