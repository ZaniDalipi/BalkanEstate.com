/**
 * Developments API client. Every call goes through the shared `apiRequest`
 * (token injection, CSRF, 401 refresh). Thin transport only — no business
 * logic, no React. Responses are narrowed to the feature's types.
 */
import { apiRequest, uploadRequest, blobRequest } from '@/src/shared/api';
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
  DevelopmentFollow,
  FollowPreferences,
  FollowFilters,
  NearbySuggestion,
  ControllableListing,
  DashboardUnit,
  UnitListQuery,
  UpdateUnitPayload,
  BulkUnitUpdatePayload,
  UpdateBuildingPayload,
  UpdateFloorPayload,
  UpsertSceneImageInput,
  UpsertSceneImageResult,
  SceneViewMetaPayload,
  PublicSceneView,
  UnitInquiryPayload,
  DevelopmentRole,
  AuditLogPage,
  AuditLogQuery,
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

/** Every published view of a target, in display order, hotspots pre-filtered for visitors. */
export const getPublicViews = (
  slug: string,
  targetType: SceneTargetType = 'development',
  targetId?: string
): Promise<{ views: PublicSceneView[] }> => {
  const qs = new URLSearchParams({ targetType });
  if (targetId) qs.set('targetId', targetId);
  return apiRequest<{ views: PublicSceneView[] }>(`${PUBLIC}/${encodeURIComponent(slug)}/views?${qs.toString()}`);
};

/** Inquiry about a unit that has no published listing (when the residence allows it). */
export const sendUnitInquiry = (
  slug: string,
  unitId: string,
  payload: UnitInquiryPayload
): Promise<{ message: string }> =>
  apiRequest(`${PUBLIC}/${encodeURIComponent(slug)}/units/${unitId}/inquiries`, {
    method: 'POST',
    body: payload,
  });

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

export const getMyDevelopment = (id: string): Promise<{ development: Development; role: DevelopmentRole }> =>
  apiRequest<{ development: Development; role: DevelopmentRole }>(`${DASH}/${id}`, {
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
  filters: UnitListQuery = {}
): Promise<Paginated<DashboardUnit>> => {
  const qs = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
  });
  const query = qs.toString();
  const raw = await apiRequest<{ units: DashboardUnit[]; total: number }>(
    `${DASH}/${developmentId}/units${query ? `?${query}` : ''}`,
    { requiresAuth: true }
  );
  return { items: raw.units ?? [], total: raw.total ?? 0 };
};

export const updateUnit = (
  developmentId: string,
  unitId: string,
  patch: UpdateUnitPayload
): Promise<{ unit: DashboardUnit }> =>
  apiRequest(`${DASH}/${developmentId}/units/${unitId}`, {
    method: 'PATCH',
    body: patch,
    requiresAuth: true,
  });

export const deleteUnit = (developmentId: string, unitId: string): Promise<{ success: boolean }> =>
  apiRequest(`${DASH}/${developmentId}/units/${unitId}`, { method: 'DELETE', requiresAuth: true });

export const bulkUpdateUnits = (
  developmentId: string,
  payload: BulkUnitUpdatePayload
): Promise<{ updated: number }> =>
  apiRequest(`${DASH}/${developmentId}/units/bulk`, {
    method: 'POST',
    body: payload,
    requiresAuth: true,
  });

/** The inventory as CSV (auth-gated, so fetched as a blob rather than linked). */
export const downloadUnitsCsv = async (developmentId: string): Promise<Blob> => {
  const { blob } = await blobRequest(`${DASH}/${developmentId}/units/export.csv`, { method: 'GET' });
  return blob;
};

export const uploadUnitFloorplan = (
  developmentId: string,
  unitId: string,
  file: File
): Promise<{ unit: DashboardUnit }> => {
  const formData = new FormData();
  formData.append('floorplan', file);
  return uploadRequest(`${DASH}/${developmentId}/units/${unitId}/floorplan`, formData);
};

export const deleteUnitFloorplan = (developmentId: string, unitId: string): Promise<{ unit: DashboardUnit }> =>
  apiRequest(`${DASH}/${developmentId}/units/${unitId}/floorplan`, { method: 'DELETE', requiresAuth: true });

/** Append 1–10 images to a unit's gallery (multipart field `images`; at most 30 per unit). */
export const uploadUnitGallery = (
  developmentId: string,
  unitId: string,
  files: File[]
): Promise<{ unit: DashboardUnit }> => {
  const formData = new FormData();
  files.forEach((file) => formData.append('images', file));
  return uploadRequest(`${DASH}/${developmentId}/units/${unitId}/gallery`, formData);
};

/** Remove the gallery image at `index` (its position in `unit.gallery`). */
export const deleteUnitGalleryImage = (
  developmentId: string,
  unitId: string,
  index: number
): Promise<{ unit: DashboardUnit }> =>
  apiRequest(`${DASH}/${developmentId}/units/${unitId}/gallery/${index}`, { method: 'DELETE', requiresAuth: true });

/** The development's audit trail, newest first (owner/manager only — `team.manage`). */
export const listDevelopmentAudit = async (
  developmentId: string,
  query: AuditLogQuery = {}
): Promise<AuditLogPage> => {
  const qs = new URLSearchParams();
  Object.entries(query).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
  });
  const q = qs.toString();
  const raw = await apiRequest<Partial<AuditLogPage>>(`${DASH}/${developmentId}/audit${q ? `?${q}` : ''}`, {
    requiresAuth: true,
  });
  return { entries: raw.entries ?? [], total: raw.total ?? 0 };
};

export const updateBuilding = (
  developmentId: string,
  buildingId: string,
  patch: UpdateBuildingPayload
): Promise<{ building: DevelopmentBuilding }> =>
  apiRequest(`${DASH}/${developmentId}/buildings/${buildingId}`, {
    method: 'PATCH',
    body: patch,
    requiresAuth: true,
  });

export const updateFloor = (
  developmentId: string,
  floorId: string,
  patch: UpdateFloorPayload
): Promise<{ floor: DevelopmentFloor }> =>
  apiRequest(`${DASH}/${developmentId}/floors/${floorId}`, {
    method: 'PATCH',
    body: patch,
    requiresAuth: true,
  });

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

// --- Listing-creation suggestions -----------------------------------------

export const getNearbyDevelopments = (params: {
  lat: number;
  lng: number;
  country?: string;
  city?: string;
  limit?: number;
}): Promise<{ suggestions: NearbySuggestion[] }> => {
  const qs = new URLSearchParams({ lat: String(params.lat), lng: String(params.lng) });
  if (params.country) qs.set('country', params.country);
  if (params.city) qs.set('city', params.city);
  if (params.limit) qs.set('limit', String(params.limit));
  return apiRequest<{ suggestions: NearbySuggestion[] }>(`${PUBLIC}/nearby?${qs.toString()}`, {
    requiresAuth: true,
  });
};

export const attachListingToDevelopment = (
  developmentId: string,
  listingId: string
): Promise<{ property: unknown }> =>
  apiRequest(`${DASH}/${developmentId}/attach-listing`, {
    method: 'POST',
    body: { listingId },
    requiresAuth: true,
  });

export const requestAttachment = (
  slug: string,
  payload: { listingId?: string; note?: string }
): Promise<{ claim: unknown; alreadyRequested?: boolean }> =>
  apiRequest(`${PUBLIC}/${encodeURIComponent(slug)}/request-attachment`, {
    method: 'POST',
    body: payload,
    requiresAuth: true,
  });

/** Listings the caller controls, for the scene editor's listing picker. */
export const getAttachableListings = (
  developmentId: string,
  q?: string
): Promise<{ listings: ControllableListing[] }> => {
  const qs = q && q.trim() ? `?q=${encodeURIComponent(q.trim())}` : '';
  return apiRequest<{ listings: ControllableListing[] }>(
    `${DASH}/${developmentId}/attachable-listings${qs}`,
    { requiresAuth: true }
  );
};

// --- Follow & alerts (signed-in buyers) -----------------------------------

export interface FollowStatus {
  following: boolean;
  follow?: DevelopmentFollow;
}

export const getFollowStatus = (slug: string): Promise<FollowStatus> =>
  apiRequest<FollowStatus>(`${PUBLIC}/${encodeURIComponent(slug)}/follow`, { requiresAuth: true });

export const followDevelopment = (
  slug: string,
  payload: { preferences: FollowPreferences; filters: FollowFilters }
): Promise<FollowStatus> =>
  apiRequest<FollowStatus>(`${PUBLIC}/${encodeURIComponent(slug)}/follow`, {
    method: 'POST',
    body: payload,
    requiresAuth: true,
  });

export const unfollowDevelopment = (slug: string): Promise<{ following: boolean }> =>
  apiRequest(`${PUBLIC}/${encodeURIComponent(slug)}/follow`, {
    method: 'DELETE',
    requiresAuth: true,
  });

// --- Dashboard: scenes (visual map editor) --------------------------------

export const listScenes = (developmentId: string): Promise<{ scenes: Scene[] }> =>
  apiRequest(`${DASH}/${developmentId}/scenes`, { requiresAuth: true });

/** Upload or replace the image of one view of a target (creates the view if new). */
export const upsertSceneImage = (
  developmentId: string,
  input: UpsertSceneImageInput
): Promise<UpsertSceneImageResult> => {
  const formData = new FormData();
  formData.append('image', input.file);
  formData.append('targetType', input.targetType);
  if (input.targetId) formData.append('targetId', input.targetId);
  if (input.viewKey) formData.append('viewKey', input.viewKey);
  if (input.viewName) formData.append('viewName', input.viewName);
  if (input.viewDirection) formData.append('viewDirection', input.viewDirection);
  if (input.sortOrder !== undefined) formData.append('sortOrder', String(input.sortOrder));
  if (input.clearHotspots) formData.append('clearHotspots', 'true');
  return uploadRequest<UpsertSceneImageResult>(`${DASH}/${developmentId}/scenes`, formData);
};

export const updateSceneView = (
  developmentId: string,
  sceneId: string,
  patch: SceneViewMetaPayload
): Promise<{ scene: Scene }> =>
  apiRequest(`${DASH}/${developmentId}/scenes/${sceneId}`, {
    method: 'PATCH',
    body: patch,
    requiresAuth: true,
  });

export const unpublishScene = (developmentId: string, sceneId: string): Promise<{ scene: Scene }> =>
  apiRequest(`${DASH}/${developmentId}/scenes/${sceneId}/unpublish`, {
    method: 'POST',
    requiresAuth: true,
  });

/**
 * Save a view's draft regions. `baseVersion` is the draft version the editor
 * loaded; the server answers 409 (code 'version_conflict', currentVersion) if
 * someone saved in between, instead of silently overwriting their work. A 400
 * carries `errors: HotspotIssue[]` naming each rejected region.
 */
export const saveSceneDraft = (
  developmentId: string,
  sceneId: string,
  hotspots: Hotspot[],
  baseVersion?: number
): Promise<{ scene: Scene }> =>
  apiRequest(`${DASH}/${developmentId}/scenes/${sceneId}/draft`, {
    method: 'PATCH',
    body: baseVersion === undefined ? { hotspots } : { hotspots, baseVersion },
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
