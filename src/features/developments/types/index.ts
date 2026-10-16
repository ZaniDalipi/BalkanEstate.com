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
  orientation?: string;
  viewType?: string;
  price?: number;
  currency?: string;
  pricePerSqm?: number;
  availability: UnitAvailability;
  listingIds: string[];
  primaryListingId?: string;
}

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
}

export interface PublicUnitDetail {
  unit: PublicUnit;
  development: { name: string; slug: string; city: string; country: string };
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
