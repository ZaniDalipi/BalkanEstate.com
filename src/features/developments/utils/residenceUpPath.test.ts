import { describe, it, expect } from 'vitest';
import { residenceUpPath } from './residenceUpPath';

const P = '/en/developments/plaza';

describe('residenceUpPath', () => {
  it('steps up one level at a time', () => {
    expect(residenceUpPath(P, '?b=B1&f=F5&unit=U1&beds=2')).toBe(`${P}?b=B1&f=F5&beds=2`);
    expect(residenceUpPath(P, '?b=B1&f=F5&v=V2&beds=2')).toBe(`${P}?b=B1&beds=2`);
    expect(residenceUpPath(P, '?b=B1&v=V2')).toBe(P);
    expect(residenceUpPath(P, '')).toBe('/en/developments');
  });

  it('works without a language prefix and keeps filters on the residence', () => {
    expect(residenceUpPath('/developments/plaza', '?b=B1&price=~200000')).toBe('/developments/plaza?price=%7E200000');
    expect(residenceUpPath('/developments/plaza', '')).toBe('/developments');
  });

  it('ignores other pages, including the owner dashboard', () => {
    expect(residenceUpPath('/en/developments', '')).toBeNull();
    expect(residenceUpPath('/en/dashboard/developments/abc', '')).toBeNull();
    expect(residenceUpPath('/en/developments/plaza/units/u1', '')).toBeNull();
    expect(residenceUpPath('/en/property/x', '')).toBeNull();
  });
});
