/**
 * Developments / Residences — shared enums and the permission matrix.
 *
 * This is the backend's single source of truth for the controlled vocabularies
 * of the Developments feature: the Mongoose enums, every controller that
 * validates a client-supplied value, and the resource-scoped authorization
 * middleware all read from here. The frontend mirrors these lists in
 * `src/features/developments/types` — the two are the same contract seen from
 * either side of the API.
 *
 * Nothing here touches billing, subscriptions, or existing listing behaviour.
 */

/** What kind of development a project is. */
export const DEVELOPMENT_CATEGORIES = [
  'apartment_building',
  'residential_towers',
  'gated_community',
  'villa_complex',
  'mixed_use',
  'apartment_hotel',
] as const;
export type DevelopmentCategory = (typeof DEVELOPMENT_CATEGORIES)[number];

/**
 * Construction state of a development or building. Intentionally compatible
 * with the listing-level `constructionStatus` vocabulary so the two can be
 * reasoned about together, with the extra states a whole project needs.
 */
export const DEVELOPMENT_CONSTRUCTION_STATUSES = [
  'planned',
  'under_construction',
  'nearing_completion',
  'completed',
] as const;
export type DevelopmentConstructionStatus =
  (typeof DEVELOPMENT_CONSTRUCTION_STATUSES)[number];

/** Lifecycle of a development, building, floor, unit or scene record. */
export const DEVELOPMENT_STATUSES = ['draft', 'published', 'archived'] as const;
export type DevelopmentStatus = (typeof DEVELOPMENT_STATUSES)[number];

/**
 * Availability of a physical unit. This is the canonical set the public
 * explorer renders; linked marketing listings never widen it. Colour alone is
 * never used to convey these — the UI always pairs colour with text.
 */
export const UNIT_AVAILABILITY_STATES = [
  'available',
  'reserved',
  'sold',
  'rented',
  'not_released',
  'unavailable',
] as const;
export type UnitAvailability = (typeof UNIT_AVAILABILITY_STATES)[number];

/**
 * Whether a unit exists for buyers at all. `hidden` is the spec's
 * "hidden/draft": the unit is invisible on every public endpoint — not listed,
 * not counted, and any explorer hotspot pointing at it is stripped.
 */
export const UNIT_VISIBILITIES = ['public', 'hidden'] as const;
export type UnitVisibility = (typeof UNIT_VISIBILITIES)[number];
export const isUnitVisibility = (value: unknown): value is UnitVisibility =>
  typeof value === 'string' && (UNIT_VISIBILITIES as readonly string[]).includes(value);

/**
 * Whether a unit's price may be shown publicly. `on_request` keeps the unit
 * visible but strips price and price-per-m² from every public response.
 */
export const PRICE_VISIBILITIES = ['public', 'on_request'] as const;
export type PriceVisibility = (typeof PRICE_VISIBILITIES)[number];
export const isPriceVisibility = (value: unknown): value is PriceVisibility =>
  typeof value === 'string' && (PRICE_VISIBILITIES as readonly string[]).includes(value);

/** Camera perspective of a building view (a scene). */
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
export const isSceneViewDirection = (value: unknown): value is SceneViewDirection =>
  typeof value === 'string' && (SCENE_VIEW_DIRECTIONS as readonly string[]).includes(value);

/** A view key is a short slug unique per target: 'main', 'front', 'courtyard-2'. */
export const SCENE_VIEW_KEY_PATTERN = /^[a-z0-9][a-z0-9-]{0,39}$/;
export const DEFAULT_SCENE_VIEW_KEY = 'main';
/** Upper bound on hotspots per view — enough for a tower of several hundred units. */
export const MAX_HOTSPOTS_PER_SCENE = 2000;
/**
 * Upper bound on vertices across one view. Validation (duplicate and
 * self-intersection checks) is quadratic per polygon, so this keeps a single
 * save or publish to a bounded amount of CPU.
 */
export const MAX_POINTS_PER_SCENE = 20000;

/**
 * Apartment feature flags — the "Apartment type" toggles buyers filter on
 * (East Gate B2: "With big terrace", "Duplex", …). A unit may carry any
 * combination. Kept as a closed set so the filter UI and the editor share one
 * vocabulary; anything outside it is dropped on write.
 */
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
export const isUnitFeature = (value: unknown): value is UnitFeature =>
  typeof value === 'string' && (UNIT_FEATURES as readonly string[]).includes(value);

/**
 * Floor kinds. Deliberately expressive because floor numbering differs across
 * the Balkans — do not assume floors start at 0 or share a naming convention.
 * The numeric `level` orders floors; the `kind` + `label` describe them.
 */
export const FLOOR_KINDS = [
  'basement',
  'ground',
  'mezzanine',
  'standard',
  'penthouse',
  'custom',
] as const;
export type FloorKind = (typeof FLOOR_KINDS)[number];

/** Resource-scoped roles a user can hold on a specific development. */
export const DEVELOPMENT_ROLES = [
  'owner',
  'manager',
  'sales_manager',
  'sales_agent',
  'editor',
  'viewer',
] as const;
export type DevelopmentRole = (typeof DEVELOPMENT_ROLES)[number];

/** Membership lifecycle. */
export const MEMBERSHIP_STATUSES = ['active', 'invited', 'revoked'] as const;
export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];

/** Ownership-claim lifecycle for disputed/other-owner developments. */
export const CLAIM_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type ClaimStatus = (typeof CLAIM_STATUSES)[number];

/** What a visual-editor scene is attached to. */
export const SCENE_TARGET_TYPES = ['development', 'building', 'floor'] as const;
export type SceneTargetType = (typeof SCENE_TARGET_TYPES)[number];

/** What a hotspot links through to. */
export const HOTSPOT_LINK_TYPES = [
  'building',
  'entrance',
  'floor',
  'unit',
  'listing',
] as const;
export type HotspotLinkType = (typeof HOTSPOT_LINK_TYPES)[number];

export const HOTSPOT_SHAPES = ['polygon', 'rect'] as const;
export type HotspotShape = (typeof HOTSPOT_SHAPES)[number];

/**
 * The discrete permissions the feature authorizes. Grouping every mutation
 * behind a named permission (rather than scattering role checks) keeps the
 * frontend and backend from disagreeing about who may do what.
 */
export const DEVELOPMENT_PERMISSIONS = [
  'project.edit',
  'building.manage',
  'floor.manage',
  'unit.manage',
  'listing.attach',
  'listing.detach',
  'availability.change',
  'price.change',
  'media.upload',
  'scene.edit',
  'publish',
  'team.manage',
  'lead.access',
  'ownership.transfer',
] as const;
export type DevelopmentPermission = (typeof DEVELOPMENT_PERMISSIONS)[number];

/**
 * Permission matrix. `owner` holds everything implicitly (handled in code), but
 * is listed explicitly for clarity and so the matrix can be rendered as-is in
 * the dashboard. Higher-trust roles are supersets of lower ones by intent, not
 * by inheritance — each role lists exactly what it may do.
 */
export const ROLE_PERMISSIONS: Record<DevelopmentRole, readonly DevelopmentPermission[]> = {
  owner: [...DEVELOPMENT_PERMISSIONS],
  manager: [
    'project.edit',
    'building.manage',
    'floor.manage',
    'unit.manage',
    'listing.attach',
    'listing.detach',
    'availability.change',
    'price.change',
    'media.upload',
    'scene.edit',
    'publish',
    'team.manage',
    'lead.access',
  ],
  sales_manager: [
    'unit.manage',
    'listing.attach',
    'listing.detach',
    'availability.change',
    'price.change',
    'media.upload',
    'lead.access',
  ],
  sales_agent: [
    'listing.attach',
    'listing.detach',
    'availability.change',
    'lead.access',
  ],
  editor: [
    'project.edit',
    'building.manage',
    'floor.manage',
    'unit.manage',
    'media.upload',
    'scene.edit',
  ],
  viewer: [],
} as const;

/**
 * Whether a development role grants a permission. `owner` always does; every
 * other role is checked against the matrix above.
 */
export const roleHasPermission = (
  role: DevelopmentRole,
  permission: DevelopmentPermission
): boolean => {
  if (role === 'owner') return true;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
};

export const isDevelopmentRole = (value: unknown): value is DevelopmentRole =>
  typeof value === 'string' && (DEVELOPMENT_ROLES as readonly string[]).includes(value);

export const isUnitAvailability = (value: unknown): value is UnitAvailability =>
  typeof value === 'string' &&
  (UNIT_AVAILABILITY_STATES as readonly string[]).includes(value);
