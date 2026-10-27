import { describe, it, expect } from 'vitest';
import { applyPrefill, diffUnitForm, unitToForm, validateUnitForm } from './unitForm';
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
    // A price change always carries the currency: residence prices are in euros.
    expect(diffUnitForm(f, { ...f, netArea: '50.0', price: '1500' })).toEqual({ price: 1500, currency: 'EUR' });
  });

  it('sends null for cleared optionals and keeps prices in euros', () => {
    const f = unitToForm(UNIT);
    expect(f.currency).toBe('EUR');
    expect(diffUnitForm(f, { ...f, price: '', description: '  hi ' })).toEqual({
      price: null,
      currency: 'EUR',
      description: 'hi',
    });
  });

  it('ignores feature order', () => {
    const f = { ...unitToForm(UNIT), features: ['a', 'b'] };
    expect(diffUnitForm(f, { ...f, features: ['b', 'a'] })).toEqual({});
  });

  it('validates required, non-negative, integer and the fixed choices', () => {
    const f = unitToForm(UNIT);
    expect(validateUnitForm({ ...f, unitNumber: ' ', beds: '1.5', price: '-1', orientation: 'up', viewType: 'volcano' }, f)).toEqual({
      unitNumber: 'required',
      beds: 'integer',
      price: 'nonNegative',
      orientation: 'choice',
      viewType: 'choice',
    });
    // An older value already on the unit is not flagged until it is changed.
    const legacy = unitToForm({ ...UNIT, orientation: 'S/SE' });
    expect(validateUnitForm(legacy, legacy)).toEqual({});
  });

  it('fills the form from a listing and matches the floor by level', () => {
    const f = unitToForm(UNIT);
    const floors = [
      { id: 'f1', buildingId: 'b1', level: 1 },
      { id: 'f4', buildingId: 'b1', level: 4 },
      { id: 'x4', buildingId: 'b2', level: 4 },
    ] as never;
    const { form, filled } = applyPrefill(
      f,
      { fields: { beds: 2, totalArea: 80, price: 1000, orientation: 'southEast', features: ['parking'] }, floorLevel: 4 },
      floors
    );
    expect(form).toMatchObject({ beds: '2', totalArea: '80', price: '1000', orientation: 'southEast', features: ['parking'], floorId: 'f4' });
    expect(filled).toEqual(['beds', 'totalArea', 'orientation', 'features', 'floorId']); // price was already 1000
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

  it('sends the parking spots picked to follow the status only with a status change', () => {
    const base = { ...unitToForm({ id: 'u', unitNumber: 'A1', unitType: 'apartment', availability: 'available', linkedUnitIds: ['p1', 'p2'] } as never) };
    expect(diffUnitForm(base, { ...base, alsoLinkedUnitIds: ['p1'] })).toEqual({});
    expect(diffUnitForm(base, { ...base, availability: 'sold', alsoLinkedUnitIds: ['p1'] })).toEqual({ availability: 'sold', alsoLinkedUnitIds: ['p1'] });
    expect(diffUnitForm(base, { ...base, availability: 'sold' })).toEqual({ availability: 'sold' });
    // A spot removed in the same edit is not sent.
    expect(diffUnitForm(base, { ...base, availability: 'sold', linkedUnitIds: ['p2'], alsoLinkedUnitIds: ['p1'] })).toEqual({ availability: 'sold', linkedUnitIds: ['p2'] });
  });
});
