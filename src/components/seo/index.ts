export { SEO, default } from './SEO';
export { Breadcrumbs, generatePropertyBreadcrumbs, generateAgencyBreadcrumbs, generateAgentBreadcrumbs, generateSearchBreadcrumbs } from './Breadcrumbs';
export { OrganizationSchema } from './OrganizationSchema';
export { FAQSchema, realEstateFAQs } from './FAQSchema';
export {
  COUNTRIES_SEO,
  PROPERTY_TYPES_SEO,
  REGIONAL_KEYWORDS,
  getCountrySEO,
  getCitySEO,
  getPropertyTypeSEO,
  generateSearchSEOTitle,
  generateSearchSEODescription,
} from './seoKeywords';
export type { CountrySEO, CitySEO, PropertyTypeSEO } from './seoKeywords';
