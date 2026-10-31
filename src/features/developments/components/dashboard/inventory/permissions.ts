/**
 * Client mirror of the backend permission matrix
 * (backend/src/config/developments.ts → ROLE_PERMISSIONS), used ONLY to
 * disable controls a role cannot use. The server stays authoritative and
 * answers 403 regardless of what the UI allows.
 */
import type { DevelopmentRole } from '../../../types';

export type InventoryPermission =
  | 'unit.manage'
  | 'building.manage'
  | 'price.change'
  | 'availability.change'
  | 'listing.attach'
  | 'listing.detach'
  | 'publish'
  | 'project.edit'
  | 'media.upload'
  | 'team.manage';

const ALL: readonly InventoryPermission[] = [
  'unit.manage', 'building.manage', 'price.change', 'availability.change', 'listing.attach', 'listing.detach', 'publish', 'project.edit', 'media.upload', 'team.manage',
];

const ROLE_PERMISSIONS: Record<DevelopmentRole, readonly InventoryPermission[]> = {
  owner: ALL,
  manager: ALL,
  sales_manager: ['unit.manage', 'price.change', 'availability.change', 'listing.attach', 'listing.detach', 'media.upload'],
  sales_agent: ['availability.change', 'listing.attach', 'listing.detach'],
  editor: ['unit.manage', 'building.manage', 'project.edit', 'media.upload'],
  viewer: [],
};

/** Whether `role` may use `permission`. Unknown/missing role → allowed (server decides). */
export const roleCan = (role: string | undefined, permission: InventoryPermission): boolean => {
  if (!role || !(role in ROLE_PERMISSIONS)) return true;
  return ROLE_PERMISSIONS[role as DevelopmentRole].includes(permission);
};

/** Unit fields gated by `price.change`; `availability` by `availability.change`; the rest by `unit.manage`. */
export const PRICE_FIELDS = ['price', 'currency', 'pricePerSqm', 'priceVisibility'] as const;

export const permissionForField = (field: string): InventoryPermission =>
  (PRICE_FIELDS as readonly string[]).includes(field)
    ? 'price.change'
    : field === 'availability'
      ? 'availability.change'
      : 'unit.manage';

export interface EditPermissions {
  unit: boolean;
  price: boolean;
  availability: boolean;
}

export const editPermissions = (role: string | undefined): EditPermissions => ({
  unit: roleCan(role, 'unit.manage'),
  price: roleCan(role, 'price.change'),
  availability: roleCan(role, 'availability.change'),
});
