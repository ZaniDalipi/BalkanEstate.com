/**
 * Developments feature — shared frontend types.
 *
 * These mirror the backend contract in `backend/src/config/developments.ts` and
 * the development_* models. Kept as plain, narrow types so components and hooks
 * stay decoupled from transport details.
 */

export const DEVELOPMENT_CATEGORIES = [
  'apartment_building',
  'residential_towers',
  'gated_community',
  'villa_complex',
  'mixed_use',
  'apartment_hotel',
] as const;
export type DevelopmentCategory = (typeof DEVELOPMENT_CATEGORIES)[number];

export const DEVELOPMENT_CONSTRUCTION_STATUSES = [
  'planned',
  'under_construction',
  'nearing_completion',
  'completed',
] as const;
export type DevelopmentConstructionStatus =
  (typeof DEVELOPMENT_CONSTRUCTION_STATUSES)[number];

export type DevelopmentStatus = 'draft' | 'published' | 'archived';

export const UNIT_AVAILABILITY_STATES = [
  'available',
  'reserved',
  'sold',
  'rented',
  'not_released',
  'unavailable',
] as const;
export type UnitAvailability = (typeof UNIT_AVAILABILITY_STATES)[number];

export type DevelopmentRole =
  | 'owner'
  | 'manager'
  | 'sales_manager'
  | 'sales_agent'
  | 'editor'
  | 'viewer';

export interface DevelopmentContact {
  name?: string;
  email?: string;
  phone?: string;
}

export interface DevelopmentStats {
  buildings: number;
  units: number;
  available: number;
}

export interface Development {
  id: string;
  ownerId: string;
  ownerType: 'user' | 'agency';
  agencyId?: string;
  name: string;
  slug: string;
  description?: string;
  country: string;
  city: string;
  municipality?: string;
  address?: string;
  lat?: number;
  lng?: number;
  category: DevelopmentCategory;
  constructionStatus: DevelopmentConstructionStatus;
  expectedCompletionDate?: string;
  amenities: string[];
  website?: string;
  contact?: DevelopmentContact;
  coverImage?: string;
  /** Whether buyers may send an inquiry about a unit that has no linked listing. */
  allowUnitInquiries?: boolean;
  status: DevelopmentStatus;
  publishedAt?: string;
  stats: DevelopmentStats;
  createdAt: string;
  updatedAt: string;
}

export interface DevelopmentBuilding {
  id: string;
  developmentId: string;
  name: string;
  code?: string;
  slug: string;
  description?: string;
  totalFloors?: number;
  basementLevels?: number;
  order: number;
  /** Public availability summary (visible units only). */
  stats?: { units: number; available: number };
}

export interface DevelopmentFloor {
  id: string;
  developmentId: string;
  buildingId: string;
  entranceId?: string;
  label: string;
  level: number;
  kind: string;
  order: number;
}

export interface DevelopmentUnit {
  id: string;
  developmentId: string;
  buildingId: string;
  entranceId?: string;
  floorId: string;
  unitNumber: string;
  unitType: string;
  totalArea?: number;
  netArea?: number;
  grossArea?: number;
  beds?: number;
  baths?: number;
  livingRooms?: number;
  /** Outdoor area that is not a terrace, m². `netArea` is the internal area. */
  externalArea?: number;
  terraceArea?: number;
  balconies?: number;
  terraces?: number;
  orientation?: string;
  viewType?: string;
  features?: string[];
  description?: string;
  price?: number;
  currency?: string;
  pricePerSqm?: number;
  availability: UnitAvailability;
  /** Dashboard only; public responses never include hidden units. */
  visibility?: UnitVisibility;
  /** Dashboard only; publicly surfaced as `priceOnRequest`. */
  priceVisibility?: PriceVisibility;
  floorplan?: UnitImage;
  gallery?: UnitImage[];
  listingIds: string[];
  primaryListingId?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Apartment feature flags buyers filter on — mirrors backend UNIT_FEATURES. */
export const UNIT_FEATURES = [
  'big_terrace',
  'duplex',
  'penthouse',
  'studio',
  'garden',
  'corner',
  'furnished',
  'parking',
  'storage',
  'sea_view',
  'two_sided',
  'smart_home',
] as const;
export type UnitFeature = (typeof UNIT_FEATURES)[number];

// --- Request/response payloads -------------------------------------------

export interface CreateDevelopmentPayload {
  name: string;
  description?: string;
  country: string;
  city: string;
  municipality?: string;
  address?: string;
  lat?: number;
  lng?: number;
  category: DevelopmentCategory;
  constructionStatus?: DevelopmentConstructionStatus;
  website?: string;
  agencyId?: string;
}

export type UpdateDevelopmentPayload = Partial<CreateDevelopmentPayload>;

export interface CreateBuildingPayload {
  name: string;
  code?: string;
  description?: string;
  totalFloors?: number;
  basementLevels?: number;
  order?: number;
}

export interface CreateFloorPayload {
  buildingId: string;
  label: string;
  level: number;
  kind?: string;
  entranceId?: string;
  order?: number;
}

export interface CreateUnitPayload {
  buildingId: string;
  floorId: string;
  entranceId?: string;
  unitNumber: string;
  unitType: string;
  totalArea?: number;
  netArea?: number;
  grossArea?: number;
  beds?: number;
  baths?: number;
  features?: string[];
  price?: number;
  currency?: string;
  availability?: UnitAvailability;
}

export type ConflictCode =
  | 'listing_already_attached_elsewhere'
  | 'listing_not_controlled_by_caller'
  | 'unit_in_other_development'
  | 'listing_archived_or_sold'
  | 'already_attached_to_this_unit';

export interface AttachmentConflict {
  code: ConflictCode;
  message: string;
  blocking: boolean;
}

export interface AttachResult {
  unit: DevelopmentUnit;
  listingId: string;
  conflicts: AttachmentConflict[];
}

export interface PreviewResult {
  conflicts: AttachmentConflict[];
  canAttach: boolean;
}

export interface BulkAttachResult {
  attached: string[];
  failed: { listingId: string; unitId: string; reason: string }[];
}

export interface Paginated<T> {
  items: T[];
  total: number;
}

/** A unit as exposed to the public, enriched with its building/floor labels. */
export interface PublicUnit extends DevelopmentUnit {
  buildingName?: string | null;
  floorLabel?: string | null;
  floorLevel?: number | null;
  /** `availability` here is EFFECTIVE (unit ∧ linked listings); this says which decided it. */
  availabilitySource?: AvailabilitySource;
  /** Price withheld publicly; `price`/`pricePerSqm` are absent. */
  priceOnRequest?: boolean;
  /** Whether a published listing is attached (`primaryListingId` is then set). */
  hasListing?: boolean;
}

export interface UnitsSummary {
  total: number;
  available: number;
  priceMin: number | null;
  priceMax: number | null;
  currency: string;
}

/** A marketing listing attached to a unit, as shown on the unit detail page. */
export interface LinkedListing {
  id: string;
  title?: string;
  imageUrl?: string;
  images?: { url: string }[];
  price?: number;
  listingType?: 'sale' | 'rent';
  beds?: number;
  baths?: number;
  sqft?: number;
  createdByName?: string;
  createdByAgencyName?: string;
  status?: 'active' | 'pending' | 'sold' | 'rented';
  isNegotiable?: boolean;
}

export interface PublicUnitDetail {
  unit: PublicUnit;
  development: {
    name: string;
    slug: string;
    city: string;
    country: string;
    allowUnitInquiries?: boolean;
  };
  listings: LinkedListing[];
}

// --- Interactive scenes (visual map / floor-plan editor) ------------------

export type HotspotShape = 'polygon' | 'rect';
export type HotspotLinkType = 'building' | 'entrance' | 'floor' | 'unit' | 'listing';
export type SceneTargetType = 'development' | 'building' | 'floor';

export interface Hotspot {
  id: string;
  shape: HotspotShape;
  /** Vertices (polygon) or the two opposite corners (rect), each [x,y] in 0–1. */
  points: number[][];
  label?: string;
  linkType: HotspotLinkType;
  linkId: string;
  z: number;
}

export interface SceneVersion {
  hotspots: Hotspot[];
  version: number;
  publishedAt?: string;
}

export interface Scene {
  id: string;
  developmentId: string;
  targetType: SceneTargetType;
  targetId: string;
  /** One camera perspective of the target; unique per target ('main' for legacy). */
  viewKey: string;
  viewName?: string;
  viewDirection: SceneViewDirection;
  sortOrder: number;
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  draft: SceneVersion;
  published?: SceneVersion;
  version: number;
}

export interface PublishedScene {
  targetType: SceneTargetType;
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  hotspots: Hotspot[];
}

// --- Follow & alerts ------------------------------------------------------

export interface FollowPreferences {
  newUnits: boolean;
  priceReductions: boolean;
  availabilityChanges: boolean;
  newBuildings: boolean;
}

export interface FollowFilters {
  minBeds?: number;
  maxBeds?: number;
  minPrice?: number;
  maxPrice?: number;
  minArea?: number;
  maxArea?: number;
}

export interface DevelopmentFollow {
  id: string;
  developmentId: string;
  preferences: FollowPreferences;
  filters: FollowFilters;
}

// --- Listing-creation suggestions -----------------------------------------

export interface NearbySuggestion {
  development: Development;
  distanceM: number;
  matchScore: number;
  canAttach: boolean;
}

/** A listing the caller controls, for the scene editor's listing picker. */
export interface ControllableListing {
  id: string;
  title: string;
  imageUrl?: string;
  price?: number;
  listingType?: 'sale' | 'rent';
  city?: string;
}

// --- Interactive residence explorer: contracts ----------------------------
// Mirrors backend/src/config/developments.ts and the explorer endpoints. Every
// id is the encoded (16-char) form; the API accepts encoded or raw ids.

export type UnitVisibility = 'public' | 'hidden';
export type PriceVisibility = 'public' | 'on_request';
/** Which input decided a unit's effective availability. */
export type AvailabilitySource = 'unit' | 'listing';

export const SCENE_VIEW_DIRECTIONS = [
  'front',
  'back',
  'left',
  'right',
  'aerial',
  'courtyard',
  'custom',
] as const;
export type SceneViewDirection = (typeof SCENE_VIEW_DIRECTIONS)[number];
/** Matches backend SCENE_VIEW_KEY_PATTERN. */
export const SCENE_VIEW_KEY_PATTERN = /^[a-z0-9][a-z0-9-]{0,39}$/;
export const MAX_HOTSPOTS_PER_SCENE = 2000;

export interface UnitImage {
  url: string;
  width?: number;
  height?: number;
}

/** A unit as the dashboard inventory sees it (GET /dashboard/developments/:id/units). */
export interface DashboardUnit extends DevelopmentUnit {
  effectiveAvailability: UnitAvailability;
  availabilitySource: AvailabilitySource;
  buildingName?: string | null;
  floorLabel?: string | null;
  floorLevel?: number | null;
  linkedListings: Array<{ id: string; title: string; status: string }>;
}

export type UnitSort =
  | 'unitNumber'
  | '-unitNumber'
  | 'price'
  | '-price'
  | 'floor'
  | '-floor'
  | 'updatedAt'
  | '-updatedAt';

export interface UnitListQuery {
  search?: string;
  buildingId?: string;
  floorId?: string;
  availability?: UnitAvailability;
  visibility?: UnitVisibility;
  sort?: UnitSort;
  limit?: number;
  skip?: number;
}

/**
 * PATCH /dashboard/developments/:id/units/:unitId. Field-level authorization:
 * price fields need `price.change`, `availability` needs `availability.change`,
 * everything else `unit.manage`.
 */
export interface UpdateUnitPayload {
  unitNumber?: string;
  unitType?: string;
  buildingId?: string;
  floorId?: string;
  beds?: number | null;
  baths?: number | null;
  livingRooms?: number | null;
  totalArea?: number | null;
  netArea?: number | null;
  grossArea?: number | null;
  externalArea?: number | null;
  terraceArea?: number | null;
  balconies?: number | null;
  terraces?: number | null;
  orientation?: string | null;
  viewType?: string | null;
  features?: string[];
  description?: string | null;
  visibility?: UnitVisibility;
  priceVisibility?: PriceVisibility;
  price?: number | null;
  currency?: string | null;
  pricePerSqm?: number | null;
  availability?: UnitAvailability;
}

export interface BulkUnitUpdatePayload {
  unitIds: string[];
  availability?: UnitAvailability;
  visibility?: UnitVisibility;
}

export interface UpdateBuildingPayload {
  name?: string;
  code?: string;
  description?: string;
  totalFloors?: number;
  basementLevels?: number;
  order?: number;
}

export interface UpdateFloorPayload {
  label?: string;
  level?: number;
  kind?: string;
  order?: number;
}

/** POST /dashboard/developments/:id/scenes (multipart). */
export interface UpsertSceneImageInput {
  targetType: SceneTargetType;
  targetId?: string;
  file: File;
  viewKey?: string;
  viewName?: string;
  viewDirection?: SceneViewDirection;
  sortOrder?: number;
  /** Drop existing regions (used when a replacement image changes aspect ratio). */
  clearHotspots?: boolean;
}

export interface UpsertSceneImageResult {
  scene: Scene;
  /** The replacement image's aspect ratio differs from the old one; regions may be misaligned. */
  aspectChanged: boolean;
}

export interface SceneViewMetaPayload {
  viewName?: string;
  viewDirection?: SceneViewDirection;
  sortOrder?: number;
}

/** One rejected hotspot in a 400 from PATCH .../scenes/:sceneId/draft. */
export interface HotspotIssue {
  index: number;
  hotspotId?: string;
  code:
    | 'non_finite'
    | 'out_of_bounds'
    | 'invalid_rect'
    | 'too_few_points'
    | 'too_many_points'
    | 'duplicate_points'
    | 'zero_area'
    | 'self_intersecting'
    | 'invalid_link_type'
    | 'missing_link'
    | 'link_not_found'
    | 'invalid_shape'
    | 'too_many_hotspots'
    | 'invalid_id'
    | 'invalid_label';
  /** Which part of the hotspot failed (e.g. 'points', 'linkId', 'label'). */
  field?: string;
  message: string;
}

/** A published view as the public explorer receives it (GET /developments/:slug/views). */
export interface PublicSceneView {
  viewKey: string;
  viewName?: string;
  viewDirection: SceneViewDirection;
  sortOrder: number;
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  /** Already filtered server-side to links a visitor may see. */
  hotspots: Hotspot[];
}

/** POST /developments/:slug/units/:unitId/inquiries — for units with no listing. */
export interface UnitInquiryPayload {
  name: string;
  email: string;
  phone?: string;
  message: string;
}
