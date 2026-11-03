import type { BusinessListing } from '@/src/shared/types/businessListing.types';
import { WEEK_DAYS, formatMinutes, parseDayHours } from './businessHours';
import { websiteHref } from './businessFacts';
import { toDialable } from './phone';

const SCHEMA_DAY: Record<string, string> = {
  monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday', thursday: 'Thursday',
  friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday',
};

/**
 * schema.org LocalBusiness for the profile, so search engines can show the
 * address, phone and opening hours. Empty fields are left out.
 */
export function businessJsonLd(l: BusinessListing, pageUrl: string, imageUrl?: string): Record<string, unknown> {
  const hours = WEEK_DAYS.flatMap((day) => {
    const parsed = parseDayHours(l.businessHours?.[day]);
    if (parsed.kind !== 'ranges') return [];
    return parsed.ranges.map((r) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: SCHEMA_DAY[day],
      opens: formatMinutes(r.open),
      closes: r.close >= 1440 && r.open === 0 ? '23:59' : formatMinutes(r.close),
    }));
  });
  const sameAs = [l.website && websiteHref(l.website), ...Object.values(l.socialMedia ?? {})].filter((v): v is string => !!v?.trim());

  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: l.name,
    url: pageUrl,
    description: l.description || undefined,
    image: imageUrl,
    telephone: toDialable(l.contactPhone) || undefined,
    email: l.contactEmail || undefined,
    priceRange: l.priceRange,
    foundingDate: l.yearEstablished ? String(l.yearEstablished) : undefined,
    address: { '@type': 'PostalAddress', streetAddress: l.address || undefined, addressLocality: l.city, addressCountry: l.country },
    geo: l.latitude != null && l.longitude != null ? { '@type': 'GeoCoordinates', latitude: l.latitude, longitude: l.longitude } : undefined,
    areaServed: l.serviceAreas?.length ? l.serviceAreas : undefined,
    knowsLanguage: l.languages?.length ? l.languages : undefined,
    openingHoursSpecification: hours.length ? hours : undefined,
    sameAs: sameAs.length ? sameAs : undefined,
  };
  return Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));
}
