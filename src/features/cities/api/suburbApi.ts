// Suburb, image, and geo-boundary API module

import { apiRequest } from '@/src/shared/api';
import type { SuburbData } from '@/src/shared/types/suburb.types';

export interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    id?: string | number;
    properties: {
      osm_id?: number;
      name: string;
      name_en?: string | null;
      admin_level?: number;
      [key: string]: unknown;
    };
    geometry: {
      type: 'Polygon' | 'MultiPolygon';
      coordinates: unknown;
    };
  }>;
}

export interface WikiCityImage {
  title: string;
  url: string;
  thumbUrl: string;
  credit: string;
}

export interface CityImagesResponse {
  images: WikiCityImage[];
  fallbackUrl: string;
}

export const getSuburbData = async (
  city: string,
  country: string
): Promise<SuburbData> => {
  const response = await apiRequest<{ suburbs: SuburbData; source: string }>(
    `/cities/suburbs/${encodeURIComponent(city)}/${encodeURIComponent(country)}`,
    { requiresAuth: false }
  );
  return response.suburbs;
};

export const getCityImages = async (
  city: string,
  country: string
): Promise<CityImagesResponse> => {
  const response = await apiRequest<CityImagesResponse>(
    `/cities/images/${encodeURIComponent(city)}/${encodeURIComponent(country)}`,
    { requiresAuth: false }
  );
  return response;
};

export const getCityGeoData = async (
  city: string,
  country: string
): Promise<GeoJSONFeatureCollection> => {
  const response = await apiRequest<{ success: boolean; data: GeoJSONFeatureCollection }>(
    `/cities/geodata/${encodeURIComponent(city)}/${encodeURIComponent(country)}`,
    { requiresAuth: false }
  );
  return response.data;
};
