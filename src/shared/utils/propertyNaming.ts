import type { Property } from '@/types';

/**
 * Zillow's naming convention for listings.
 *
 * Zillow never gives a listing a marketing name — the listing *is* its address.
 * A card reads:
 *
 *     $1,200,000
 *     3 bds | 2 ba | 1,500 sqft — House for sale
 *     1234 Ocean Dr, Miami Beach, FL 33139
 *
 * so the identity of a property is (street line, locality line) and everything
 * descriptive lives on one abbreviated facts line that ends in
 * "<home type> for <status>". This module is the single place that builds those
 * three strings, so the card, the aria-label and the image alt text can never
 * drift apart the way a hand-written `property.title || …` in each of them does.
 *
 * Seller-written titles are kept only as a fallback for listings with no usable
 * street address — dropping them entirely would leave those cards headed by a
 * bare home type.
 */

/**
 * i18next's `t`, in the (key, defaultValue, options) shape this codebase uses.
 *
 * Kept as its own narrow type rather than importing `TFunction`: the latter is
 * an overload set keyed to the caller's namespace tuple, so it varies per call
 * site and cannot be named here. Callers pass `t as unknown as Translate`, the
 * same escape hatch `SearchPage` already uses for `SearchHeader`.
 */
export type Translate = (key: string, defaultValue?: string, options?: Record<string, unknown>) => string;

const HOME_TYPE_LABELS: Record<string, { key: string; fallback: string }> = {
    house: { key: 'search:propertyTypes.house', fallback: 'House' },
    apartment: { key: 'search:propertyTypes.apartment', fallback: 'Apartment' },
    villa: { key: 'search:propertyTypes.villa', fallback: 'Villa' },
    'luxury-villa': { key: 'villas:card.defaultTitle', fallback: 'Luxury Villa' },
    land: { key: 'search:propertyTypes.land', fallback: 'Lot / Land' },
    other: { key: 'search:propertyTypes.other', fallback: 'Home' },
};

const clean = (v: string | undefined | null): string => (v ?? '').trim();

/**
 * A street line is only useful if it says something the locality line does not.
 * Imported listings routinely carry the city, the country or a bare postcode in
 * `address`, which would render as a heading that repeats the line beneath it.
 */
const isUsableStreet = (address: string, property: Property): boolean => {
    if (!address) return false;
    const a = address.toLowerCase();
    if (a === clean(property.city).toLowerCase()) return false;
    if (a === clean(property.country).toLowerCase()) return false;
    // "Tirana, Albania" — the locality line with no street in front of it.
    if (a === getLocalityLine(property).toLowerCase()) return false;
    // Digits only, or punctuation only.
    if (!/[a-zà-ž]/i.test(address)) return false;
    return true;
};

/** Zillow's home-type vocabulary for a listing ("House", "Luxury Villa", …). */
export const getHomeTypeLabel = (property: Property, t: Translate): string => {
    const entry = HOME_TYPE_LABELS[property.propertyType] ?? HOME_TYPE_LABELS.other;
    return t(entry.key, entry.fallback);
};

/**
 * Zillow's status wording — the tail of the facts line and the badge on the
 * photo. `sold`/`rented` win over the market, because a sold listing is no
 * longer "for sale".
 */
export const getListingStatusLabel = (property: Property, t: Translate): string => {
    if (property.status === 'sold') return t('property:sold', 'Sold');
    if (property.status === 'rented') return t('property:rented', 'Rented');
    if (property.status === 'pending') return t('property:pending', 'Pending');
    return property.listingType === 'sale'
        ? t('villas:filters.forSale', 'For Sale')
        : t('villas:filters.forRent', 'For Rent');
};

/** "Miami Beach, FL" → here, "Tirana, Albania". Never contains the street. */
export const getLocalityLine = (property: Property): string =>
    [clean(property.city), clean(property.country)].filter(Boolean).join(', ');

/**
 * The heading, plus whether building it had to fold the city in.
 *
 * That flag is what keeps `getFullPropertyName` from producing "Luxury Villa in
 * Tirana, Tirana, Albania". Testing the built string for the city instead would
 * mis-fire on a real street that happens to end in the city's name
 * ("Rruga Tirana", in Tirana), silently dropping the city from the address.
 */
const resolveStreet = (property: Property, t: Translate): { text: string; includesCity: boolean } => {
    const address = clean(property.address);
    if (isUsableStreet(address, property)) return { text: address, includesCity: false };

    const title = clean(property.title);
    if (title) return { text: title, includesCity: false };

    const city = clean(property.city);
    const homeType = getHomeTypeLabel(property, t);
    if (!city) return { text: homeType, includesCity: false };
    return {
        text: t('property:naming.typeIn', '{{type}} in {{place}}', { type: homeType, place: city }),
        includesCity: true,
    };
};

/**
 * The card heading. The street address when there is one, the seller's own
 * title when there is not, and "<home type> in <city>" as the last resort — a
 * heading is never empty.
 */
export const getStreetLine = (property: Property, t: Translate): string =>
    resolveStreet(property, t).text;

/** Street and locality joined — for aria-labels, alt text, tooltips and SEO. */
export const getFullPropertyName = (property: Property, t: Translate): string => {
    const { text, includesCity } = resolveStreet(property, t);
    if (includesCity) {
        const country = clean(property.country);
        return country ? `${text}, ${country}` : text;
    }
    const locality = getLocalityLine(property);
    return locality ? `${text}, ${locality}` : text;
};

/**
 * Zillow's abbreviated facts line: "3 bds · 2 ba · 140 m² · House · For Sale".
 * Counts that are zero or missing are dropped rather than shown as "0 bds".
 *
 * `includeStatus` exists for surfaces that already carry a status badge — the
 * villa card puts one on the photo, and repeating it in the text below is
 * noise rather than information.
 */
export const getFactsLine = (
    property: Property,
    t: Translate,
    { includeStatus = true }: { includeStatus?: boolean } = {},
): string => {
    const parts: string[] = [];
    if (property.beds > 0) parts.push(`${property.beds} ${t('property:naming.bdsAbbr', 'bds')}`);
    if (property.baths > 0) parts.push(`${property.baths} ${t('property:naming.baAbbr', 'ba')}`);
    if (property.sqft > 0) parts.push(`${property.sqft.toLocaleString()} m²`);
    parts.push(getHomeTypeLabel(property, t));
    if (includeStatus) parts.push(getListingStatusLabel(property, t));
    return parts.join(' · ');
};
