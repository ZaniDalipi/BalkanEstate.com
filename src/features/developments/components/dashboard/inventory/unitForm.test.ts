import { describe, it, expect } from 'vitest';
import { diffUnitForm, unitToForm, validateUnitForm } from './unitForm';
import { checkFloorplanFile } from './FloorplanUpload';
import { editPermissions, permissionForField } from './permissions';
import type { DevelopmentUnit } from '../../../types';

const UNIT = {
  id: 'u1',
  developmentId: 'd',
  buildingId: 'b1',
  floorId: 'f1',
  unitNumber: '1',
  unitType: 'apartment',
  price: 1000,
  currency: 'eur',
  netArea: 50,
  availability: 'available',
  listingIds: [],
} as DevelopmentUnit;

describe('unitForm', () => {
  it('produces an empty patch for an untouched form', () => {
    const f = unitToForm(UNIT);
    expect(diffUnitForm(f, { ...f })).toEqual({});
  });

  it('treats numerically equal input as unchanged and parses changed numbers', () => {
    const f = unitToForm(UNIT);
    expect(diffUnitForm(f, { ...f, netArea: '50.0', price: '1500' })).toEqual({ price: 1500 });
  });

  it('sends null for cleared optionals and upper-cases currency', () => {
    const f = unitToForm(UNIT);
    expect(diffUnitForm(f, { ...f, price: '', currency: 'usd', description: '  hi ' })).toEqual({
      price: null,
      currency: 'USD',
      description: 'hi',
    });
  });

  it('ignores feature order', () => {
    const f = { ...unitToForm(UNIT), features: ['a', 'b'] };
    expect(diffUnitForm(f, { ...f, features: ['b', 'a'] })).toEqual({});
  });

  it('validates required, non-negative, integer and currency', () => {
    const f = unitToForm(UNIT);
    expect(validateUnitForm({ ...f, unitNumber: ' ', beds: '1.5', price: '-1', currency: 'EU' })).toEqual({
      unitNumber: 'required',
      beds: 'integer',
      price: 'nonNegative',
      currency: 'currency',
    });
  });
});

describe('permissions', () => {
  it('maps fields to permission groups', () => {
    expect(permissionForField('pricePerSqm')).toBe('price.change');
    expect(permissionForField('availability')).toBe('availability.change');
    expect(permissionForField('beds')).toBe('unit.manage');
  });

  it('mirrors the role matrix and allows unknown roles', () => {
    expect(editPermissions('sales_agent')).toEqual({ unit: false, price: false, availability: true });
    expect(editPermissions('editor')).toEqual({ unit: true, price: false, availability: false });
    expect(editPermissions(undefined)).toEqual({ unit: true, price: true, availability: true });
  });
});

describe('checkFloorplanFile', () => {
  it('accepts images up to 10 MB only', () => {
    expect(checkFloorplanFile(new File(['x'], 'a.png', { type: 'image/png' }))).toBeNull();
    expect(checkFloorplanFile(new File(['x'], 'a.pdf', { type: 'application/pdf' }))).toBe('type');
    const big = new File(['x'], 'a.jpg', { type: 'image/jpeg' });
    Object.defineProperty(big, 'size', { value: 11 * 1024 * 1024 });
    expect(checkFloorplanFile(big)).toBe('size');
  });
});
