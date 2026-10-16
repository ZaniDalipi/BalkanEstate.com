/**
 * Developments API client. Every call goes through the shared `apiRequest`
 * (token injection, CSRF, 401 refresh). Thin transport only — no business
 * logic, no React. Responses are narrowed to the feature's types.
 */
import { apiRequest, uploadRequest } from '@/src/shared/api';
import type {
  Development,
  DevelopmentBuilding,
  DevelopmentFloor,
  DevelopmentUnit,
  CreateDevelopmentPayload,
  UpdateDevelopmentPayload,
  CreateBuildingPayload,
  CreateFloorPayload,
  CreateUnitPayload,
  UnitAvailability,
  AttachResult,
  PreviewResult,
  BulkAttachResult,
  Paginated,
  PublicUnit,
  UnitsSummary,
  PublicUnitDetail,
  Scene,
  Hotspot,
  PublishedScene,
  SceneTargetType,
} from '../types';

const PUBLIC = '/developments';
const DASH = '/dashboard/developments';

// --- Public (read-only) ---------------------------------------------------

export interface PublicListFilters {
  city?: string;
  country?: string;
  category?: string;
  limit?: number;
  skip?: number;
}

export const listPublicDevelopments = async (
  filters: PublicListFilters = {}
): Promise<Paginated<Development>> => {
  const qs = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
  });
  const query = qs.toString();
  const raw = await apiRequest<{ developments: Development[]; total: number }>(
    `${PUBLIC}${query ? `?${query}` : ''}`
  );
  return { items: raw.developments ?? [], total: raw.total ?? 0 };
};

export interface PublicDevelopmentDetail {
  development: Development;
  buildings: DevelopmentBuilding[];
  floors: DevelopmentFloor[];
}

export const getPublicDevelopment = (slug: string): Promise<PublicDevelopmentDetail> =>
  apiRequest<PublicDevelopmentDetail>(`${PUBLIC}/${encodeURIComponent(slug)}`);

export const getPublicDevelopmentUnits = (
  slug: string
): Promise<{ units: PublicUnit[]; summary: UnitsSummary }> =>
  apiRequest<{ units: PublicUnit[]; summary: UnitsSummary }>(
    `${PUBLIC}/${encodeURIComponent(slug)}/units`
  );

export const getPublicUnit = (slug: string, unitId: string): Promise<PublicUnitDetail> =>
  apiRequest<PublicUnitDetail>(
    `${PUBLIC}/${encodeURIComponent(slug)}/units/${encodeURIComponent(unitId)}`
  );

export const getPublishedScene = (
  slug: string,
  targetType: SceneTargetType = 'development',
  targetId?: string
): Promise<{ scene: PublishedScene | null }> => {
  const qs = new URLSearchParams({ targetType });
  if (targetId) qs.set('targetId', targetId);
  return apiRequest<{ scene: PublishedScene | null }>(
    `${PUBLIC}/${encodeURIComponent(slug)}/scene?${qs.toString()}`
  );
};

// --- Dashboard: development lifecycle -------------------------------------

export const listMyDevelopments = async (
  filters: { status?: string; limit?: number; skip?: number } = {}
): Promise<Paginated<Development>> => {
  const qs = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
  });
  const query = qs.toString();
  const raw = await apiRequest<{ developments: Development[]; total: number }>(
    `${DASH}${query ? `?${query}` : ''}`,
    { requiresAuth: true }
  );
  return { items: raw.developments ?? [], total: raw.total ?? 0 };
};

export const getMyDevelopment = (id: string): Promise<{ development: Development; role: string }> =>
  apiRequest<{ development: Development; role: string }>(`${DASH}/${id}`, {
    requiresAuth: true,
  });

export interface DevelopmentStructure {
  buildings: DevelopmentBuilding[];
  entrances: { id: string; buildingId: string; name: string }[];
  floors: DevelopmentFloor[];
}

export const getDevelopmentStructure = (id: string): Promise<DevelopmentStructure> =>
  apiRequest<DevelopmentStructure>(`${DASH}/${id}/structure`, { requiresAuth: true });

export const uploadDevelopmentCover = (
  id: string,
  file: File
): Promise<{ coverImage: string; development: Development }> => {
  const formData = new FormData();
  formData.append('cover', file);
  return uploadRequest<{ coverImage: string; development: Development }>(
    `${DASH}/${id}/cover`,
    formData
  );
};

export const createDevelopment = (payload: CreateDevelopmentPayload): Promise<{ development: Development }> =>
  apiRequest<{ development: Development }>(DASH, {
    method: 'POST',
    body: payload,
    requiresAuth: true,
  });

export const updateDevelopment = (
  id: string,
  payload: UpdateDevelopmentPayload
): Promise<{ development: Development }> =>
  apiRequest<{ development: Development }>(`${DASH}/${id}`, {
    method: 'PATCH',
    body: payload,
    requiresAuth: true,
  });

export const publishDevelopment = (
  id: string,
  status: 'draft' | 'published'
): Promise<{ development: Development }> =>
  apiRequest<{ development: Development }>(`${DASH}/${id}/publish`, {
    method: 'POST',
    body: { status },
    requiresAuth: true,
  });

export const deleteDevelopment = (id: string): Promise<{ success: boolean }> =>
  apiRequest<{ success: boolean }>(`${DASH}/${id}`, {
    method: 'DELETE',
    requiresAuth: true,
  });

// --- Dashboard: inventory -------------------------------------------------

export const createBuilding = (
  developmentId: string,
  payload: CreateBuildingPayload
): Promise<{ building: DevelopmentBuilding }> =>
  apiRequest(`${DASH}/${developmentId}/buildings`, {
    method: 'POST',
    body: payload,
    requiresAuth: true,
  });

export const createFloor = (
  developmentId: string,
  payload: CreateFloorPayload
): Promise<{ floor: DevelopmentFloor }> =>
  apiRequest(`${DASH}/${developmentId}/floors`, {
    method: 'POST',
    body: payload,
    requiresAuth: true,
  });

export const createUnit = (
  developmentId: string,
  payload: CreateUnitPayload
): Promise<{ unit: DevelopmentUnit }> =>
  apiRequest(`${DASH}/${developmentId}/units`, {
    method: 'POST',
    body: payload,
    requiresAuth: true,
  });

export const listUnits = async (
  developmentId: string,
  filters: { buildingId?: string; floorId?: string; availability?: string; limit?: number; skip?: number } = {}
): Promise<Paginated<DevelopmentUnit>> => {
  const qs = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
  });
  const query = qs.toString();
  const raw = await apiRequest<{ units: DevelopmentUnit[]; total: number }>(
    `${DASH}/${developmentId}/units${query ? `?${query}` : ''}`,
    { requiresAuth: true }
  );
  return { items: raw.units ?? [], total: raw.total ?? 0 };
};

export const setUnitAvailability = (
  developmentId: string,
  unitId: string,
  availability: UnitAvailability
): Promise<{ unit: DevelopmentUnit }> =>
  apiRequest(`${DASH}/${developmentId}/units/${unitId}/availability`, {
    method: 'PATCH',
    body: { availability },
    requiresAuth: true,
  });

// --- Dashboard: existing-listing attachment -------------------------------

export const previewAttachment = (
  developmentId: string,
  unitId: string,
  listingId: string
): Promise<PreviewResult> =>
  apiRequest(`${DASH}/${developmentId}/units/${unitId}/listings/preview`, {
    method: 'POST',
    body: { listingId },
    requiresAuth: true,
  });

export const attachListing = (
  developmentId: string,
  unitId: string,
  listingId: string,
  force = false
): Promise<AttachResult> =>
  apiRequest(`${DASH}/${developmentId}/units/${unitId}/listings`, {
    method: 'POST',
    body: { listingId, force },
    requiresAuth: true,
  });

export const detachListing = (
  developmentId: string,
  unitId: string,
  listingId: string
): Promise<{ unit: DevelopmentUnit }> =>
  apiRequest(`${DASH}/${developmentId}/units/${unitId}/listings/${listingId}`, {
    method: 'DELETE',
    requiresAuth: true,
  });

// --- Dashboard: scenes (visual map editor) --------------------------------

export const listScenes = (developmentId: string): Promise<{ scenes: Scene[] }> =>
  apiRequest(`${DASH}/${developmentId}/scenes`, { requiresAuth: true });

export const upsertSceneImage = (
  developmentId: string,
  targetType: SceneTargetType,
  file: File,
  targetId?: string
): Promise<{ scene: Scene }> => {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('targetType', targetType);
  if (targetId) formData.append('targetId', targetId);
  return uploadRequest<{ scene: Scene }>(`${DASH}/${developmentId}/scenes`, formData);
};

export const saveSceneDraft = (
  developmentId: string,
  sceneId: string,
  hotspots: Hotspot[]
): Promise<{ scene: Scene }> =>
  apiRequest(`${DASH}/${developmentId}/scenes/${sceneId}/draft`, {
    method: 'PATCH',
    body: { hotspots },
    requiresAuth: true,
  });

export const publishScene = (
  developmentId: string,
  sceneId: string
): Promise<{ scene: Scene }> =>
  apiRequest(`${DASH}/${developmentId}/scenes/${sceneId}/publish`, {
    method: 'POST',
    requiresAuth: true,
  });

export const deleteScene = (
  developmentId: string,
  sceneId: string
): Promise<{ success: boolean }> =>
  apiRequest(`${DASH}/${developmentId}/scenes/${sceneId}`, {
    method: 'DELETE',
    requiresAuth: true,
  });

export const bulkAttachListings = (
  developmentId: string,
  items: { listingId: string; unitId: string }[],
  force = false
): Promise<BulkAttachResult> =>
  apiRequest(`${DASH}/${developmentId}/listings/bulk-attach`, {
    method: 'POST',
    body: { items, force },
    requiresAuth: true,
  });
