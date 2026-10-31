import { describe, expect, it } from 'vitest';
import { builderPayload, builderToForm, formFieldOf, isValidPhone, validateBuilderForm, type BuilderForm } from './builderValidation';

const form = (over: Partial<Omit<BuilderForm, 'socials'>> & { socials?: Partial<BuilderForm['socials']> } = {}): BuilderForm => {
  const base = builderToForm();
  return { ...base, ...over, socials: { ...base.socials, ...(over.socials ?? {}) } } as BuilderForm;
};
const NOW = new Date('2026-06-01');

describe('validateBuilderForm', () => {
  it('an empty form is fine (no builder)', () => expect(validateBuilderForm(form(), NOW)).toEqual({}));
  it('a filled-in builder needs a name', () => {
    expect(validateBuilderForm(form({ tagline: 'Since 2004' }), NOW)).toEqual({ name: { code: 'FIELD_REQUIRED' } });
    expect(validateBuilderForm(form({ socials: { facebook: 'https://facebook.com/x' } }), NOW)).toEqual({ name: { code: 'FIELD_REQUIRED' } });
  });
  it('accepts a complete, sensible builder', () => {
    expect(
      validateBuilderForm(form({ name: 'Balkan Build', foundedYear: '2004', completedProjects: '18', website: 'https://balkanbuild.mk', email: 'sales@balkanbuild.mk', phone: '+389 2 123 4567', socials: { facebook: 'https://www.facebook.com/bb', youtube: 'https://youtu.be/x' } }), NOW)
    ).toEqual({});
  });
  it('names the field and the problem, with the values its text needs', () => {
    const e = validateBuilderForm(
      form({ name: 'x'.repeat(121), tagline: 'x'.repeat(161), foundedYear: '1700', completedProjects: '2.5', website: 'javascript:alert(1)', email: 'sales@', phone: 'call us', socials: { facebook: 'https://evil.example.com/x', instagram: 'instagram', linkedin: 'https://www.linkedin.com/company/bb' } }),
      NOW
    );
    expect(e).toEqual({
      name: { code: 'FIELD_TOO_LONG', params: { max: 120 } },
      tagline: { code: 'FIELD_TOO_LONG', params: { max: 160 } },
      foundedYear: { code: 'FIELD_RANGE', params: { min: 1800, max: 2026 } },
      completedProjects: { code: 'FIELD_RANGE', params: { min: 0, max: 10000 } },
      website: { code: 'URL_INVALID' },
      email: { code: 'EMAIL_INVALID' },
      phone: { code: 'PHONE_INVALID' },
      'socials.facebook': { code: 'SOCIAL_HOST', params: { network: 'Facebook' } },
      'socials.instagram': { code: 'URL_INVALID' },
    });
  });
  it('a founding year in the future is refused', () => {
    expect(validateBuilderForm(form({ name: 'B', foundedYear: '2027' }), NOW).foundedYear).toEqual({ code: 'FIELD_RANGE', params: { min: 1800, max: 2026 } });
  });
});

describe('isValidPhone', () => {
  it('takes common formats and refuses words or too few digits', () => {
    expect(isValidPhone('+389 2 123 4567')).toBe(true);
    expect(isValidPhone('(02) 555-1234')).toBe(true);
    expect(isValidPhone('call me')).toBe(false);
    expect(isValidPhone('123')).toBe(false);
  });
});

describe('builderPayload / builderToForm', () => {
  it('sends trimmed text and numbers, leaves out empty fields, and null for an empty form', () => {
    expect(builderPayload(form({ name: ' Balkan Build ', foundedYear: '2004', completedProjects: '', socials: { instagram: ' https://instagram.com/bb ' } }))).toEqual({
      name: 'Balkan Build',
      foundedYear: 2004,
      socials: { instagram: 'https://instagram.com/bb' },
    });
    expect(builderPayload(form())).toBeNull();
  });
  it('round-trips a stored builder', () => {
    const f = builderToForm({ name: 'B', foundedYear: 2004, socials: { youtube: 'https://youtu.be/x' } });
    expect(f).toMatchObject({ name: 'B', foundedYear: '2004', completedProjects: '', socials: { youtube: 'https://youtu.be/x', facebook: '' } });
  });
});

describe('formFieldOf', () => {
  it('maps the server’s field to the form’s, and ignores anything else', () => {
    expect(formFieldOf('builder.website')).toBe('website');
    expect(formFieldOf('builder.socials.facebook')).toBe('socials.facebook');
    expect(formFieldOf('builder.logo')).toBeUndefined();
    expect(formFieldOf('name')).toBeUndefined();
  });
});
