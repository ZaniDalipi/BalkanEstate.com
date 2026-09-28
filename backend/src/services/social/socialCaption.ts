/**
 * The default text for a listing's social post. Pure, so it is unit-tested
 * directly; the admin can rewrite it before approving.
 */

export interface CaptionListing {
  _id: unknown;
  title?: string;
  listingType?: 'sale' | 'rent';
  price?: number;
  isNegotiable?: boolean;
  rentPeriod?: 'monthly' | 'weekly' | 'daily';
  city?: string;
  country?: string;
  beds?: number;
  baths?: number;
  sqft?: number;
  propertyType?: string;
  description?: string;
}

// Instagram's caption limit; Facebook allows far more, so this bounds both.
export const MAX_CAPTION_LENGTH = 2200;
const DESCRIPTION_EXCERPT = 280;

const RENT_SUFFIX: Record<string, string> = { monthly: '/month', weekly: '/week', daily: '/night' };

export const listingUrlFor = (frontendUrl: string, propertyId: unknown): string =>
  `${frontendUrl.replace(/\/+$/, '')}/property/${String(propertyId)}`;

const formatPrice = (listing: CaptionListing): string => {
  if (listing.isNegotiable || !listing.price) return 'Price on request';
  const amount = `€${Math.round(listing.price).toLocaleString('en-US')}`;
  if (listing.listingType !== 'rent') return amount;
  return `${amount}${RENT_SUFFIX[listing.rentPeriod || 'monthly'] || ''}`;
};

const humanType = (propertyType?: string): string =>
  (propertyType || 'property').replace(/[-_]+/g, ' ');

// "Tirana" -> "#TiranaRealEstate"; drops characters hashtags can't carry.
const hashtag = (text: string): string =>
  '#' + text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '');

const excerpt = (text: string | undefined, max: number): string => {
  const clean = (text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > max * 0.6 ? lastSpace : max).trim()}…`;
};

export const buildSocialCaption = (listing: CaptionListing, listingUrl: string): string => {
  const forRent = listing.listingType === 'rent';
  const place = [listing.city, listing.country].filter(Boolean).join(', ');
  const headline =
    listing.title?.trim() ||
    `${humanType(listing.propertyType)} for ${forRent ? 'rent' : 'sale'}${listing.city ? ` in ${listing.city}` : ''}`;

  const facts = [
    listing.beds ? `🛏 ${listing.beds} bed${listing.beds === 1 ? '' : 's'}` : '',
    listing.baths ? `🛁 ${listing.baths} bath${listing.baths === 1 ? '' : 's'}` : '',
    listing.sqft ? `📐 ${listing.sqft} m²` : '',
  ].filter(Boolean);

  const tags = [
    '#BalkanEstate',
    forRent ? '#ForRent' : '#ForSale',
    listing.city ? hashtag(`${listing.city}RealEstate`) : '',
    listing.country ? hashtag(listing.country) : '',
  ].filter((t) => t.length > 1);

  const lines = [
    `🏡 ${headline.charAt(0).toUpperCase()}${headline.slice(1)}`,
    place ? `📍 ${place}` : '',
    `💶 ${formatPrice(listing)}`,
    facts.join(' · '),
    '',
    excerpt(listing.description, DESCRIPTION_EXCERPT),
    '',
    `👉 ${listingUrl}`,
    '',
    tags.join(' '),
  ];

  return lines
    .filter((line, i, all) => line !== '' || (i > 0 && all[i - 1] !== ''))
    .join('\n')
    .trim()
    .slice(0, MAX_CAPTION_LENGTH);
};
