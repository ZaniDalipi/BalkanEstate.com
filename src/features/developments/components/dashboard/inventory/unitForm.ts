/**
 * Pure form model for the unit edit dialog: unit → form state, validation,
 * and the minimal PATCH (only changed fields; an emptied optional field is
 * sent as `null` so the server clears it).
 */
import { UNIT_CURRENCY, UNIT_ORIENTATIONS, UNIT_VIEWS } from '../../../types';
import type {
  DevelopmentFloor,
  DevelopmentUnit,
  UnitPrefill,
  PriceVisibility,
  UnitAvailability,
  UnitVisibility,
  UpdateUnitPayload,
} from '../../../types';

export const INT_FIELDS = ['beds', 'baths', 'livingRooms', 'balconies', 'terraces'] as const;
export const DECIMAL_FIELDS = ['netArea', 'totalArea', 'externalArea', 'terraceArea', 'price', 'pricePerSqm'] as const;
export const NULLABLE_TEXT_FIELDS = ['orientation', 'viewType', 'description'] as const;

type IntField = (typeof INT_FIELDS)[number];
type DecimalField = (typeof DECIMAL_FIELDS)[number];
type NumericField = IntField | DecimalField;
type NullableTextField = (typeof NULLABLE_TEXT_FIELDS)[number];

export type UnitFormState = Record<NumericField | NullableTextField, string> & {
  unitNumber: string;
  unitType: string;
  buildingId: string;
  floorId: string;
  availability: UnitAvailability;
  visibility: UnitVisibility;
  priceVisibility: PriceVisibility;
  features: string[];
  /** Parking spots / storage rooms (unit ids) it comes with. */
  linkedUnitIds: string[];
  /** Of those, the ones the seller picked to take the new availability too (sent only with a status change). */
  alsoLinkedUnitIds: string[];
  /** Always EUR in the form; sent with any price change so prices are stored in euros. */
  currency: typeof UNIT_CURRENCY;
};

export type UnitFormErrors = Partial<Record<keyof UnitFormState, string>>;

const str = (v: number | string | null | undefined): string => (v === undefined || v === null ? '' : String(v));

export const unitToForm = (u: DevelopmentUnit): UnitFormState => ({
  unitNumber: u.unitNumber ?? '',
  unitType: u.unitType ?? '',
  buildingId: u.buildingId ?? '',
  floorId: u.floorId ?? '',
  beds: str(u.beds),
  baths: str(u.baths),
  livingRooms: str(u.livingRooms),
  balconies: str(u.balconies),
  terraces: str(u.terraces),
  netArea: str(u.netArea),
  totalArea: str(u.totalArea),
  externalArea: str(u.externalArea),
  terraceArea: str(u.terraceArea),
  price: str(u.price),
  pricePerSqm: str(u.pricePerSqm),
  orientation: u.orientation ?? '',
  viewType: u.viewType ?? '',
  description: u.description ?? '',
  currency: UNIT_CURRENCY,
  availability: u.availability,
  visibility: u.visibility ?? 'public',
  priceVisibility: u.priceVisibility ?? 'public',
  features: [...(u.features ?? [])],
  linkedUnitIds: [...(u.linkedUnitIds ?? [])],
  alsoLinkedUnitIds: [],
});

const inList = (list: readonly string[], value: string) => list.includes(value);

/**
 * Error codes (translated by the dialog) keyed by field. Orientation and view
 * must come from the fixed lists; a legacy value already on the unit is left
 * alone until it is changed.
 */
export const validateUnitForm = (f: UnitFormState, original?: UnitFormState): UnitFormErrors => {
  const errors: UnitFormErrors = {};
  if (!f.unitNumber.trim()) errors.unitNumber = 'required';
  if (!f.unitType.trim()) errors.unitType = 'required';
  if (!f.buildingId) errors.buildingId = 'required';
  if (!f.floorId) errors.floorId = 'required';
  for (const k of [...INT_FIELDS, ...DECIMAL_FIELDS]) {
    const raw = f[k].trim();
    if (!raw) continue;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) errors[k] = 'nonNegative';
    else if ((INT_FIELDS as readonly string[]).includes(k) && !Number.isInteger(n)) errors[k] = 'integer';
  }
  if (f.orientation && f.orientation !== original?.orientation && !inList(UNIT_ORIENTATIONS, f.orientation)) errors.orientation = 'choice';
  if (f.viewType && f.viewType !== original?.viewType && !inList(UNIT_VIEWS, f.viewType)) errors.viewType = 'choice';
  if (f.description.length > 5000) errors.description = 'tooLong';
  return errors;
};

const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));

/** Only the fields that differ from `original`; cleared optionals become `null`. */
export const diffUnitForm = (original: UnitFormState, current: UnitFormState): UpdateUnitPayload => {
  const patch: UpdateUnitPayload = {};
  const p = patch as Record<string, unknown>;
  for (const k of ['unitNumber', 'unitType'] as const) {
    if (current[k].trim() !== original[k].trim()) patch[k] = current[k].trim();
  }
  for (const k of ['buildingId', 'floorId', 'availability', 'visibility', 'priceVisibility'] as const) {
    if (current[k] !== original[k]) p[k] = current[k];
  }
  for (const k of [...INT_FIELDS, ...DECIMAL_FIELDS]) {
    const a = original[k].trim();
    const b = current[k].trim();
    if (a === b || (a !== '' && b !== '' && Number(a) === Number(b))) continue;
    p[k] = b === '' ? null : Number(b);
  }
  for (const k of NULLABLE_TEXT_FIELDS) {
    const a = original[k].trim();
    const b = current[k].trim();
    if (a !== b) p[k] = b === '' ? null : b;
  }
  if ('price' in p || 'pricePerSqm' in p) p.currency = UNIT_CURRENCY;
  if (!sameSet(original.features, current.features)) patch.features = [...current.features];
  if (!sameSet(original.linkedUnitIds, current.linkedUnitIds)) patch.linkedUnitIds = [...current.linkedUnitIds];
  // Only spots it still comes with, and only when its own status changes.
  const also = current.alsoLinkedUnitIds.filter((id) => current.linkedUnitIds.includes(id));
  if (patch.availability !== undefined && also.length) patch.alsoLinkedUnitIds = also;
  return patch;
};

/**
 * Copy a listing's data into the form. Only fields the listing has are
 * filled; the floor is matched by level within the chosen building. Returns
 * the new state and the names of the fields that changed.
 */
export const applyPrefill = (
  form: UnitFormState,
  prefill: Pick<UnitPrefill, 'fields' | 'floorLevel'>,
  floors: DevelopmentFloor[]
): { form: UnitFormState; filled: (keyof UnitFormState)[] } => {
  const next: UnitFormState = { ...form };
  const filled: (keyof UnitFormState)[] = [];
  const put = <K extends keyof UnitFormState>(key: K, value: UnitFormState[K]) => {
    if (JSON.stringify(next[key]) === JSON.stringify(value)) return;
    next[key] = value;
    filled.push(key);
  };
  const { features, ...rest } = prefill.fields;
  for (const [key, value] of Object.entries(rest)) {
    if (value === undefined || value === null || !(key in next)) continue;
    put(key as keyof UnitFormState, String(value) as never);
  }
  if (features?.length) put('features', [...new Set([...next.features, ...features])]);
  const floor = prefill.floorLevel === undefined ? undefined : floors.find((f) => f.buildingId === next.buildingId && f.level === prefill.floorLevel);
  if (floor) put('floorId', floor.id);
  return { form: next, filled };
};
