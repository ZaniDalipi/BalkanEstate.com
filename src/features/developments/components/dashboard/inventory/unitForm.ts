/**
 * Pure form model for the unit edit dialog: unit → form state, validation,
 * and the minimal PATCH (only changed fields; an emptied optional field is
 * sent as `null` so the server clears it).
 */
import type {
  DevelopmentUnit,
  PriceVisibility,
  UnitAvailability,
  UnitVisibility,
  UpdateUnitPayload,
} from '../../../types';

export const INT_FIELDS = ['beds', 'baths', 'livingRooms', 'balconies', 'terraces'] as const;
export const DECIMAL_FIELDS = ['netArea', 'totalArea', 'externalArea', 'terraceArea', 'price', 'pricePerSqm'] as const;
export const NULLABLE_TEXT_FIELDS = ['orientation', 'viewType', 'description', 'currency'] as const;

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
  currency: u.currency ?? '',
  availability: u.availability,
  visibility: u.visibility ?? 'public',
  priceVisibility: u.priceVisibility ?? 'public',
  features: [...(u.features ?? [])],
});

/** Error codes (translated by the dialog) keyed by field. */
export const validateUnitForm = (f: UnitFormState): UnitFormErrors => {
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
  if (f.currency.trim() && !/^[A-Za-z]{3}$/.test(f.currency.trim())) errors.currency = 'currency';
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
    const b = k === 'currency' ? current[k].trim().toUpperCase() : current[k].trim();
    const a = k === 'currency' ? original[k].trim().toUpperCase() : original[k].trim();
    if (a !== b) p[k] = b === '' ? null : b;
  }
  if (!sameSet(original.features, current.features)) patch.features = [...current.features];
  return patch;
};
