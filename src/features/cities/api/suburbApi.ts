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
      admin_level?: number | null;
      /**
       * Which of the map's two nested layers this shape belongs to:
       * `district` shapes tile the city, `neighbourhood` shapes sit inside
       * them. Absent on rows cached before the split, which held one
       * partition and are read as districts. See `boundaryLayers.ts`.
       */
      layer?: 'district' | 'neighbourhood';
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

/**
 * Where the shapes came from: administrative districts, mapped neighbourhood
 * areas, or — the usual case for a real city — both, districts with the
 * neighbourhoods nested inside them.
 */
export type CityBoundarySource = 'admin' | 'place' | 'mixed';

export interface CityGeoDataResponse {
  boundaries: GeoJSONFeatureCollection;
  source: CityBoundarySource | null;
  /** When the shapes were fetched from OpenStreetMap; null when unknown. */
  fetchedAt: string | null;
}

export const getCityGeoData = async (
  city: string,
  country: string
): Promise<CityGeoDataResponse> => {
  const response = await apiRequest<{
    success: boolean;
    data: GeoJSONFeatureCollection;
    source?: CityBoundarySource | null;
    fetchedAt?: string | null;
  }>(
    `/cities/geodata/${encodeURIComponent(city)}/${encodeURIComponent(country)}`,
    { requiresAuth: false }
  );

  return {
    boundaries: response.data ?? { type: 'FeatureCollection', features: [] },
    source: response.source ?? null,
    fetchedAt: response.fetchedAt ?? null,
  };
};
