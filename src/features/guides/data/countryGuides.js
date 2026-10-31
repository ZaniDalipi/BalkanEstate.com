/**
 * Country buying guides — one entry per country the marketplace covers.
 *
 * Plain ESM (not TypeScript) on purpose: the React guide pages import it, and so
 * does scripts/prerender.mjs, which writes each guide into crawlable HTML at
 * build time. Keep the two in step by keeping the data here only.
 *
 * Editorial rules for this file:
 *  - State rules and procedures, not forecasts. No "prices will rise", no
 *    unsourced price-per-m² or rental-yield figures: asking prices change, and
 *    the live listings and city market pages are the place to read them.
 *  - Where a rule varies (by municipality, entity, nationality) say so rather
 *    than quote one number.
 *  - Every country lists the official bodies a buyer deals with, so a reader can
 *    check the current rules at the source.
 *  - Bump GUIDES_LAST_UPDATED whenever an entry changes.
 *
 * @typedef {{ name: string, url?: string }} GuideSource
 * @typedef {{
 *   slug: string,
 *   country: string,
 *   searchCountry: string,
 *   flag: string,
 *   foreignBuy: string,
 *   residency: string,
 *   tax: string,
 *   transferTax: string,
 *   topCities: string[],
 *   highlights: string[],
 *   legalProcess: string[],
 *   cautions: string[],
 *   sources: GuideSource[],
 * }} CountryGuide
 */

/** ISO date of the last editorial change to any guide below. */
export const GUIDES_LAST_UPDATED = '2026-10-11';

/** @type {CountryGuide[]} */
export const COUNTRY_GUIDES = [
  {
    slug: 'montenegro',
    country: 'Montenegro',
    searchCountry: 'Montenegro',
    flag: '🇲🇪',
    foreignBuy: 'Yes for apartments and houses; agricultural land, forests and some protected or border areas are restricted',
    residency: 'Owning property is one of the grounds for a temporary residence permit, renewed yearly',
    tax: '0.25–1% of market value per year, set by the municipality',
    transferTax: '3% real estate transfer tax',
    topCities: ['Budva', 'Kotor', 'Tivat', 'Podgorica', 'Herceg Novi', 'Bar'],
    highlights: [
      'EU candidate country with accession negotiations under way',
      'Foreign individuals can own apartments and houses in their own name',
      'Adriatic coastline including the Bay of Kotor, a UNESCO World Heritage site',
      'Annual property tax is set locally within a 0.25–1% band',
      'Coastal demand is strongly seasonal — check how a building is used outside summer',
    ],
    legalProcess: [
      'Find a property and agree the price with the seller',
      'Hire a local lawyer to check the title, permits and any encumbrances',
      'Sign a preliminary contract and pay a deposit (commonly around 10%)',
      'Obtain a Montenegrin tax identification number',
      'Sign the main purchase contract before a notary',
      'Pay the 3% transfer tax and register ownership with the Real Estate Administration',
      'Apply for a residence permit if you want one (optional)',
    ],
    cautions: [
      'Check that the building has a use permit — unfinished or unpermitted floors are common on the coast.',
    ],
    sources: [
      { name: 'Real Estate Administration of Montenegro (Uprava za katastar i državnu imovinu)' },
    ],
  },
  {
    slug: 'albania',
    country: 'Albania',
    searchCountry: 'Albania',
    flag: '🇦🇱',
    foreignBuy: 'Yes for apartments and buildings; foreigners cannot buy agricultural land (it can be leased)',
    residency: 'Property ownership can support a residence permit application',
    tax: 'Annual tax on buildings, set by the municipality',
    transferTax: 'No separate buyer transfer tax; notary and registration fees apply, and the seller is taxed on any gain',
    topCities: ['Tirana', 'Saranda', 'Vlora', 'Durres', 'Shkodra'],
    highlights: [
      'EU candidate country',
      'Long Ionian and Adriatic coastline, from Durrës and Vlorë to Sarandë',
      'Tirana has seen extensive new residential construction in recent years',
      'Purchases are completed before a notary and registered with the State Cadastre Agency',
    ],
    legalProcess: [
      'Find a property and agree the price',
      'Hire a local lawyer — strongly advised for foreign buyers',
      'Verify ownership and any mortgages at the State Cadastre Agency (ASHK, formerly ZRPP)',
      'Sign a preliminary agreement before a notary',
      'Obtain an Albanian tax identification number',
      'Sign the final deed of sale before a notary',
      'Register the property with the State Cadastre Agency',
    ],
    cautions: [
      'Title disputes and buildings without full permits have historically been common — insist on a clean cadastre certificate.',
    ],
    sources: [
      { name: 'State Cadastre Agency (ASHK)', url: 'https://ashk.gov.al' },
    ],
  },
  {
    slug: 'serbia',
    country: 'Serbia',
    searchCountry: 'Serbia',
    flag: '🇷🇸',
    foreignBuy: 'Foreign individuals can buy subject to reciprocity with their country; agricultural land is restricted',
    residency: 'Owning property in Serbia is one of the grounds for temporary residence',
    tax: 'Progressive annual property tax, set by the municipality (about 0.4% for most homes)',
    transferTax: '2.5% on resale property; new builds are sold with VAT instead',
    topCities: ['Belgrade', 'Novi Sad', 'Niš', 'Subotica'],
    highlights: [
      'Belgrade is the capital and largest city; Novi Sad is the second-largest',
      'EU candidate country',
      'Clear split between new-build (VAT) and resale (transfer tax) purchases',
    ],
    legalProcess: [
      'Find a property and negotiate terms',
      'Hire a local lawyer for due diligence',
      'Sign a preliminary contract with a deposit',
      'Obtain a Serbian tax identification number',
      'Sign the main contract, certified by a public notary',
      'Pay the transfer tax (resale) — the notary reports the sale to the tax office',
      'Register ownership with the Republic Geodetic Authority (cadastre)',
    ],
    cautions: [
      'Check whether the apartment is registered ("uknjižen") — unregistered units are harder to finance and resell.',
    ],
    sources: [
      { name: 'Republic Geodetic Authority (RGZ)', url: 'https://www.rgz.gov.rs' },
    ],
  },
  {
    slug: 'north-macedonia',
    country: 'North Macedonia',
    searchCountry: 'North Macedonia',
    flag: '🇲🇰',
    foreignBuy: 'Yes for apartments and buildings; land ownership by foreign individuals is restricted (often bought through a local company)',
    residency: 'Temporary residence may be available to property owners',
    tax: '0.1–0.2% per year, set by the municipality',
    transferTax: '2–4%, set by the municipality',
    topCities: ['Skopje', 'Ohrid', 'Bitola', 'Tetovo'],
    highlights: [
      'NATO member since 2020 and EU candidate country',
      'Lake Ohrid region is a UNESCO World Heritage site',
      'Low annual property tax (0.1–0.2%)',
      'Purchases are notarised and registered with the Agency for Real Estate Cadastre',
    ],
    legalProcess: [
      'Find a property and agree the price',
      'Hire a local lawyer',
      'For land purchases, set up a local company if required',
      'Verify ownership at the Agency for Real Estate Cadastre',
      'Sign the purchase contract before a notary',
      'Pay the transfer tax',
      'Register ownership at the cadastre',
    ],
    cautions: [
      'Request a current ownership certificate ("имотен лист") from the cadastre before paying any deposit.',
    ],
    sources: [
      { name: 'Agency for Real Estate Cadastre (AKN)', url: 'https://www.katastar.gov.mk' },
    ],
  },
  {
    slug: 'kosovo',
    country: 'Kosovo',
    searchCountry: 'Kosovo',
    flag: '🇽🇰',
    foreignBuy: 'Generally yes, with conditions that depend on nationality and the type of property',
    residency: 'Ask the Ministry of Internal Affairs about current residence rules for property owners',
    tax: 'Annual property tax set by the municipality',
    transferTax: 'Notary and registration fees apply — confirm the current amounts with a notary',
    topCities: ['Pristina', 'Prizren', 'Peja', 'Gjakova'],
    highlights: [
      'Pristina is the capital and the largest property market',
      'Kosovo uses the euro',
      'Ownership is registered with the municipal cadastre and the Kosovo Cadastral Agency',
    ],
    legalProcess: [
      'Find a property and agree terms',
      'Engage a local lawyer to verify the title',
      'Obtain a personal number from the civil registry',
      'Sign a preliminary agreement with a deposit',
      'Notarise the purchase contract',
      'Pay any applicable fees',
      'Register ownership with the municipal cadastre',
    ],
    cautions: [
      'Some cadastral records were reconstructed after 1999 — check the history of the title, not just the current owner.',
    ],
    sources: [
      { name: 'Kosovo Cadastral Agency (AKK)', url: 'https://akk.rks-gov.net' },
    ],
  },
  {
    slug: 'croatia',
    country: 'Croatia',
    searchCountry: 'Croatia',
    flag: '🇭🇷',
    foreignBuy: 'EU citizens on the same terms as Croatians; others need Ministry of Justice approval, subject to reciprocity; agricultural land is restricted',
    residency: 'EU residence rules apply (Croatia is an EU member)',
    tax: 'Since 2025 a municipal property tax applies to homes that are not a permanent residence or long-term rental; rates are set locally',
    transferTax: '3% real estate transfer tax',
    topCities: ['Split', 'Dubrovnik', 'Zagreb', 'Zadar', 'Rijeka'],
    highlights: [
      'EU member, in the euro area and the Schengen area since 2023',
      'Adriatic coastline and islands',
      'Land registry and cadastre records can be checked online',
      'Short-term letting needs a categorisation decision from the local authorities',
    ],
    legalProcess: [
      'Find a property and engage a lawyer',
      'Non-EU citizens apply to the Ministry of Justice for approval',
      'Sign a preliminary contract with a deposit',
      'Obtain a Croatian personal identification number (OIB)',
      'Sign the main contract, certified by a notary',
      'Pay the 3% transfer tax',
      'Register ownership with the land registry court',
    ],
    cautions: [
      'Check that the land registry and the cadastre describe the property the same way — mismatches are common on the coast.',
    ],
    sources: [
      { name: 'Joint land registry and cadastre system (Uređena zemlja)', url: 'https://oss.uredjenazemlja.hr' },
    ],
  },
  {
    slug: 'bosnia',
    country: 'Bosnia and Herzegovina',
    searchCountry: 'Bosnia',
    flag: '🇧🇦',
    foreignBuy: 'Yes, based on reciprocity with your country',
    residency: 'Ask the Service for Foreigners\' Affairs about current residence rules for property owners',
    tax: 'Set by each entity and canton',
    transferTax: 'Varies by entity and canton — confirm the current rate with a notary',
    topCities: ['Sarajevo', 'Mostar', 'Banja Luka', 'Tuzla'],
    highlights: [
      'Two entities (the Federation of BiH and Republika Srpska) with separate property laws',
      'Sarajevo and Mostar are the main markets for international buyers',
      'EU candidate country',
      'Local legal advice matters more here than almost anywhere else in the region',
    ],
    legalProcess: [
      'Find a property and hire a local lawyer',
      'Verify ownership and check for encumbrances',
      'Confirm a reciprocity agreement exists for your nationality',
      'Sign a preliminary contract with a deposit',
      'Notarise the purchase agreement',
      'Pay the applicable transfer tax',
      'Register ownership at the relevant land registry',
    ],
    cautions: [
      'Which law applies depends on where the property is — confirm the entity and canton before anything else.',
    ],
    sources: [
      { name: 'Land registry offices of the municipal courts (Federation of BiH)' },
      { name: 'Republic Administration for Geodetic and Property Affairs (Republika Srpska)' },
    ],
  },
  {
    slug: 'bulgaria',
    country: 'Bulgaria',
    searchCountry: 'Bulgaria',
    flag: '🇧🇬',
    foreignBuy: 'EU/EEA citizens can buy land and buildings; others can buy buildings and apartments but not land directly (often via a Bulgarian company)',
    residency: 'EU residence rules apply (Bulgaria is an EU member)',
    tax: '0.01–0.45% per year, set by the municipality',
    transferTax: '0.1–3% local acquisition tax, set by the municipality',
    topCities: ['Sofia', 'Burgas', 'Varna', 'Plovdiv', 'Bansko'],
    highlights: [
      'EU member and part of the Schengen area since 2025',
      'Black Sea coast and mountain resorts such as Bansko',
      'Very low annual property tax',
      'Flat 10% personal income tax',
    ],
    legalProcess: [
      'Find a property and engage a lawyer',
      'Non-EU citizens buying a house with land usually set up a Bulgarian company',
      'Obtain a Bulgarian identification number for foreigners (LNCh) or BULSTAT registration',
      'Sign a preliminary contract with a deposit',
      'Sign the notarial deed before a notary',
      'Pay the municipal acquisition tax and notary fees',
      'The deed is registered with the Registry Agency',
    ],
    cautions: [
      'In resort complexes, ask for the annual maintenance fee in writing — it is often the largest running cost.',
    ],
    sources: [
      { name: 'Registry Agency of Bulgaria', url: 'https://www.registryagency.bg' },
    ],
  },
  {
    slug: 'romania',
    country: 'Romania',
    searchCountry: 'Romania',
    flag: '🇷🇴',
    foreignBuy: 'EU citizens on the same terms as Romanians; others can buy buildings and apartments, while land usually requires a Romanian company',
    residency: 'EU residence rules apply (Romania is an EU member)',
    tax: 'Annual building and land tax, set by the local council',
    transferTax: 'No separate buyer transfer tax; the seller pays income tax on the sale, the buyer pays notary and land-book fees',
    topCities: ['Bucharest', 'Cluj-Napoca', 'Timișoara', 'Brașov', 'Constanța'],
    highlights: [
      'EU member',
      'Bucharest is the capital and largest city; Cluj-Napoca is a major university centre',
      'Every sale is completed by a notary, who also handles the related taxes',
      'Ownership is recorded in the land book (Cartea Funciară)',
    ],
    legalProcess: [
      'Find a property and hire a local lawyer',
      'Non-EU buyers of land usually register a Romanian company',
      'Obtain a Romanian tax identification number',
      'Sign a preliminary contract (antecontract / promisiune de vânzare)',
      'Sign the authenticated sale contract before a notary',
      'The notary withholds the seller\'s tax and files the paperwork',
      'Ownership is entered in the land book',
    ],
    cautions: [
      'Ask the notary for a recent land-book extract (extras de carte funciară) — it shows mortgages and disputes.',
    ],
    sources: [
      { name: 'National Agency for Cadastre and Land Registration (ANCPI)', url: 'https://www.ancpi.ro' },
    ],
  },
  {
    slug: 'greece',
    country: 'Greece',
    searchCountry: 'Greece',
    flag: '🇬🇷',
    foreignBuy: 'Yes; non-EU buyers need approval in designated border areas',
    residency: 'Golden Visa thresholds were raised in 2023–2024: €800,000 in Attica, Thessaloniki, Mykonos, Santorini and larger islands, €400,000 elsewhere, and €250,000 only for conversions or listed-building restorations',
    tax: 'ENFIA annual property tax, based on the property\'s official value',
    transferTax: '3.09% on resale property (new builds may be subject to VAT)',
    topCities: ['Athens', 'Thessaloniki', 'Crete', 'Mykonos', 'Santorini'],
    highlights: [
      'EU, euro area and Schengen member',
      'Residence-by-investment ("Golden Visa") programme, with higher thresholds since 2024',
      'Large island and coastal market',
      'Property records are moving to the Hellenic Cadastre',
    ],
    legalProcess: [
      'Find a property and hire a Greek lawyer',
      'Obtain a Greek tax number (AFM)',
      'The lawyer searches the title at the land registry or cadastre',
      'Sign a preliminary agreement with a deposit',
      'Sign the final contract before a notary',
      'Pay the transfer tax',
      'Register the deed with the land registry or Hellenic Cadastre',
      'Apply for a Golden Visa if eligible (optional)',
    ],
    cautions: [
      'Golden Visa thresholds depend on the location — check the current rules before relying on them.',
    ],
    sources: [
      { name: 'Hellenic Cadastre (Ktimatologio)', url: 'https://www.ktimatologio.gr' },
      { name: 'Enterprise Greece — residence permits for investors', url: 'https://www.enterprisegreece.gov.gr' },
    ],
  },
];

/** @param {string | undefined} slug */
export function findCountryGuide(slug) {
  if (!slug) return undefined;
  const key = slug.toLowerCase();
  return COUNTRY_GUIDES.find((g) => g.slug === key);
}
