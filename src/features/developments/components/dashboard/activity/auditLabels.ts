import type { TFunction } from 'i18next';
import type { AuditEntry } from '../../../types';
import { formatNumber } from '../../../utils/format';

/**
 * English defaults for every audit action the backend records
 * (backend/src/models/DevelopmentAuditLog.ts → DevelopmentAuditAction).
 * Keys live under `activity.actions.<action with "." → "_">`.
 */
export const ACTION_LABELS: Record<string, string> = {
  'listing.attach': 'Attached a listing',
  'listing.detach': 'Detached a listing',
  'availability.change': 'Changed availability',
  'price.change': 'Changed price',
  'unit.create': 'Created unit',
  'unit.update': 'Updated unit',
  'unit.delete': 'Deleted unit',
  'unit.bulk_update': 'Bulk-updated units',
  'unit.import': 'Imported units from a spreadsheet',
  'floor.create': 'Added floor',
  'floor.update': 'Updated floor',
  'building.create': 'Added building',
  'building.update': 'Updated building',
  'building.delete': 'Deleted building',
  'floor.delete': 'Deleted floor',
  'scene.upload': 'Uploaded explorer image',
  'scene.update': 'Updated explorer view',
  'scene.draft': 'Saved explorer draft',
  'scene.publish': 'Published explorer view',
  'scene.unpublish': 'Unpublished explorer view',
  'scene.delete': 'Deleted explorer view',
  'development.create': 'Created development',
  'development.update': 'Updated development',
  'development.publish': 'Changed publication status',
  'development.delete': 'Deleted development',
  'billing.purchase': 'Bought a Residence Pass or buildings',
  'billing.grant': 'Residence Pass granted by BalkanEstate',
  'membership.grant': 'Added team member',
  'membership.revoke': 'Removed team member',
  'claim.create': 'Requested attachment',
  'claim.review': 'Reviewed attachment request',
};

export const actionKey = (action: string) => `activity.actions.${action.replace(/\./g, '_')}`;

/**
 * Field → [i18n key, English default], reusing the unit editor's labels so the
 * Activity tab names fields the same way the form does.
 */
const FIELD_LABELS: Record<string, [string, string]> = {
  unitNumber: ['unit.number', 'Unit number'],
  unitType: ['unit.type', 'Type'],
  beds: ['unit.beds', 'Beds'],
  baths: ['unit.baths', 'Baths'],
  livingRooms: ['inventory.edit.livingRooms', 'Living rooms'],
  netArea: ['inventory.edit.netArea', 'Internal area'],
  totalArea: ['inventory.edit.totalArea', 'Total area'],
  externalArea: ['inventory.edit.externalArea', 'External area'],
  terraceArea: ['inventory.edit.terraceArea', 'Terrace area'],
  balconies: ['inventory.edit.balconies', 'Balconies'],
  terraces: ['inventory.edit.terraces', 'Terraces'],
  orientation: ['unit.orientation', 'Orientation'],
  viewType: ['inventory.edit.viewType', 'View'],
  price: ['unit.price', 'Price'],
  currency: ['inventory.edit.currency', 'Currency'],
  pricePerSqm: ['inventory.edit.pricePerSqm', 'Price per m²'],
  priceVisibility: ['inventory.edit.priceVisibility', 'Price shown to buyers'],
  features: ['inventory.edit.features', 'Features'],
  description: ['inventory.edit.description', 'Description'],
};

const fieldLabel = (t: TFunction, field: string): string => {
  const entry = FIELD_LABELS[field];
  return entry ? String(t(entry[0], entry[1])) : field;
};

/** Human-readable label of an action; unknown actions show as recorded. */
export const actionLabel = (t: TFunction, action: string): string =>
  action in ACTION_LABELS ? String(t(actionKey(action), ACTION_LABELS[action])) : action;

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** A short, simple detail line from an entry's metadata, or null when there is nothing simple to say. */
export function entryDetail(t: TFunction, entry: AuditEntry): string | null {
  const m = isObj(entry.metadata) ? entry.metadata : {};
  const fmt = formatNumber;
  const gallery = isObj(m.gallery) ? m.gallery : null;
  if (gallery && num(gallery.added)) return String(t('activity.detail.photosAdded', 'Photos added: {{n}}', { n: num(gallery.added) }));
  if (gallery && num(gallery.removed)) return String(t('activity.detail.photoRemoved', 'Photo removed'));
  if (m.floorplan === true && isObj(m.changes) && isObj(m.changes.floorplan)) {
    return m.changes.floorplan.to
      ? String(t('activity.detail.floorplanUploaded', 'Floor plan uploaded'))
      : String(t('activity.detail.floorplanRemoved', 'Floor plan removed'));
  }
  switch (entry.action) {
    case 'price.change': {
      const from = num(m.from);
      const to = num(m.to);
      if (to === null) return null;
      const cur = typeof m.currency === 'string' ? ` ${m.currency}` : '';
      return `${from === null ? '—' : fmt(from)} → ${fmt(to)}${cur}`;
    }
    case 'availability.change': {
      if (typeof m.availability !== 'string') return null;
      const to = String(t(`availability.${m.availability}`, m.availability));
      return typeof m.from === 'string' ? `${String(t(`availability.${m.from}`, m.from))} → ${to}` : to;
    }
    case 'building.delete':
    case 'floor.delete': {
      const parts = [
        typeof m.name === 'string' ? m.name : null,
        num(m.floors) ? String(t('editor.structure.floors', { count: num(m.floors), defaultValue: '{{count}} floors' })) : null,
        num(m.units) ? String(t('editor.structure.units', { count: num(m.units), defaultValue: '{{count}} apartments' })) : null,
      ].filter(Boolean);
      return parts.length ? parts.join(' · ') : null;
    }
    case 'unit.delete':
      return typeof m.unitNumber === 'string' ? String(t('activity.detail.unitNumber', 'Unit {{number}}', { number: m.unitNumber })) : null;
    case 'unit.bulk_update': {
      const n = num(m.modified) ?? (Array.isArray(m.unitIds) ? m.unitIds.length : null);
      return n === null ? null : String(t('activity.detail.unitsUpdated', 'Units updated: {{n}}', { n }));
    }
    case 'unit.import':
      return String(
        t('activity.detail.imported', {
          created: num(m.unitsCreated) ?? 0,
          updated: num(m.unitsUpdated) ?? 0,
          defaultValue: 'New: {{created}} · Updated: {{updated}}',
        })
      );
    case 'scene.draft':
      return num(m.hotspotCount) === null ? null : String(t('activity.detail.regions', 'Regions: {{n}}', { n: num(m.hotspotCount) }));
    default:
      break;
  }
  if (isObj(m.changes)) {
    const fields = Object.keys(m.changes);
    if (fields.length > 0) return String(t('activity.detail.fields', 'Changed: {{fields}}', { fields: fields.map((f) => fieldLabel(t, f)).join(', ') }));
  }
  return null;
}
