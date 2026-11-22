/**
 * The ten countries of the market landing pages, by page slug.
 *
 * Plain ESM (not TypeScript) on purpose, like the guides data: the build
 * script (scripts/prerender.mjs, run on Node 20) imports it as well as the app
 * and the Pages Functions. Mirrors MARKET_COUNTRIES in
 * backend/src/services/marketPages/marketPlaces.ts.
 */

/** Market page slug by country name as listings and guides store it (lower-case). */
const COUNTRY_SLUG_BY_NAME = {
  albania: 'albania',
  'bosnia and herzegovina': 'bosnia-and-herzegovina',
  bosnia: 'bosnia-and-herzegovina',
  bulgaria: 'bulgaria',
  croatia: 'croatia',
  greece: 'greece',
  kosovo: 'kosovo',
  montenegro: 'montenegro',
  'north macedonia': 'north-macedonia',
  macedonia: 'north-macedonia',
  romania: 'romania',
  serbia: 'serbia',
};

/**
 * The market country page slug for a country name, or undefined outside the ten.
 * @param {string | undefined} countryName
 * @returns {string | undefined}
 */
export const marketCountrySlug = (countryName) =>
  countryName ? COUNTRY_SLUG_BY_NAME[countryName.trim().toLowerCase()] : undefined;

/** The ten country page slugs. @type {readonly string[]} */
export const MARKET_COUNTRY_SLUGS = [...new Set(Object.values(COUNTRY_SLUG_BY_NAME))].sort();
