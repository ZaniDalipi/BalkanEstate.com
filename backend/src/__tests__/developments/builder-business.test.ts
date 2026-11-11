process.env.SKIP_TEST_DB = 'true';

import { businessAsBuilder } from '../../services/developments/builderBusiness';
import { resolveCompany } from '../../services/developments/residenceCompany';

const NOW = new Date('2026-11-09');
const business = {
  _id: '64b7f0c2a1b2c3d4e5f60718',
  name: 'Aria Build Group',
  slug: 'aria-build-group-skopje',
  description: 'We build homes.',
  logoUrl: 'https://media.test/b/logo.webp',
  bannerUrl: 'https://media.test/b/banner.webp',
  contactPhone: '+389 2 123 4567',
  contactEmail: 'sales@aria.example.com',
  website: 'aria.example.com',
  address: 'Bul. Partizanski 12',
  city: 'Skopje',
  country: 'North Macedonia',
  yearEstablished: 2004,
  licenseNumber: 'MK-1182',
  socialMedia: { facebook: 'https://facebook.com/aria', instagram: '' },
};

describe('businessAsBuilder', () => {
  it('shows the Business Directory company, with what the owner typed filling its gaps', () => {
    const typed = { name: 'Aria (typed)', tagline: 'Since 2004', completedProjects: 18, about: 'typed about', socials: { youtube: 'https://youtube.com/@aria', facebook: 'https://facebook.com/typed' } };
    expect(businessAsBuilder(business, typed, NOW)).toEqual({
      name: 'Aria Build Group',
      tagline: 'Since 2004',
      completedProjects: 18,
      about: 'We build homes.',
      foundedYear: 2004,
      licenseNumber: 'MK-1182',
      website: 'https://aria.example.com/',
      email: 'sales@aria.example.com',
      phone: '+389 2 123 4567',
      address: 'Bul. Partizanski 12, Skopje, North Macedonia',
      logo: { url: 'https://media.test/b/logo.webp' },
      banner: { url: 'https://media.test/b/banner.webp' },
      socials: { youtube: 'https://youtube.com/@aria', facebook: 'https://facebook.com/aria' },
      source: 'business',
      businessSlug: 'aria-build-group-skopje',
    });
  });

  it('drops unsafe or impossible values and never anything internal', () => {
    const out = businessAsBuilder({ name: 'B', website: 'javascript:alert(1)', logoUrl: 'data:image/svg+xml,x', contactEmail: 'nope', yearEstablished: 2999, owner: 'u1', logoPublicId: 'secret' } as never, {}, NOW);
    expect(out).toEqual({ name: 'B', source: 'business' });
  });

  it('is nothing without a live business', () => {
    expect(businessAsBuilder(null, { name: 'Typed' }, NOW)).toBeUndefined();
  });
});

describe('resolveCompany', () => {
  it('prefers the linked business, then the typed builder, then the agency', () => {
    expect(resolveCompany({ name: 'Typed' }, business, { name: 'Agency' })).toMatchObject({ name: 'Aria Build Group', source: 'business' });
    expect(resolveCompany({ name: 'Typed' }, null, { name: 'Agency' })).toEqual({ name: 'Typed' });
    expect(resolveCompany(undefined, null, { name: 'Agency' })).toMatchObject({ name: 'Agency', source: 'agency' });
    expect(resolveCompany(undefined, null, null)).toBeUndefined();
  });
});
