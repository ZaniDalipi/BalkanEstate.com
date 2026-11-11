import { describe, expect, it } from 'vitest';
import type { TFunction } from 'i18next';
import { companyLabel, isAgencyCompany } from './companyLabel';

const t = ((_key: string, fallback: string) => fallback) as unknown as TFunction;

describe('companyLabel', () => {
  it('says “The builder” for a named builder and “The company” for the publishing agency', () => {
    expect(companyLabel(t, { source: undefined })).toBe('The builder');
    expect(companyLabel(t, undefined)).toBe('The builder');
    expect(companyLabel(t, { source: 'agency' })).toBe('The company');
    expect(isAgencyCompany({ source: 'agency' })).toBe(true);
  });
});
