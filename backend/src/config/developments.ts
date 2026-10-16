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
