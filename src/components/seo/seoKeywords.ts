/**
 * SEO Keyword Data Module
 * Maps countries, cities, and property types to optimized meta titles,
 * descriptions, and keywords based on competitor analysis.
 *
 * Target keywords are ordered by opportunity score (highest first).
 */

export interface CountrySEO {
  name: string;
  slug: string;
  title: string;
  description: string;
  keywords: string[];
  cities: CitySEO[];
  /** Hreflang language code for the country's primary language */
  lang: string;
  /** ISO country code */
  isoCode: string;
}

export interface CitySEO {
  name: string;
  slug: string;
  title: string;
  description: string;
  keywords: string[];
}

export interface PropertyTypeSEO {
  type: string;
  slug: string;
  title: string;
  description: string;
}

// ─── Country + City SEO Data ─────────────────────────────────────────────────

export const COUNTRIES_SEO: CountrySEO[] = [
  // ── Tier 1: Highest opportunity ──────────────────────────────────
  {
    name: 'Kosovo',
    slug: 'Kosovo',
    lang: 'sq',
    isoCode: 'XK',
    title: 'Property for Sale in Kosovo - Houses, Apartments & Land',
    description:
      'Find property for sale in Kosovo. Browse apartments, houses, villas, and land listings in Pristina, Prizren, and across Kosovo. AI-powered search on BalkanEstateAI.',
    keywords: [
      'property for sale Kosovo',
      'buy property Kosovo',
      'apartments for sale Pristina',
      'houses for sale Kosovo',
      'freehold property Kosovo',
      'land for sale Kosovo',
      'real estate Kosovo',
      'Kosovo property investment',
    ],
    cities: [
      {
        name: 'Pristina',
        slug: 'Pristina',
        title: 'Apartments & Houses for Sale in Pristina, Kosovo',
        description:
          'Browse apartments and houses for sale in Pristina. Find affordable property in Kosovo\'s capital with AI-powered search. New builds, city center flats, and family homes.',
        keywords: ['apartments for sale Pristina', 'buy apartment Pristina', 'houses for sale Pristina', 'property Pristina Kosovo'],
      },
      {
        name: 'Prizren',
        slug: 'Prizren',
        title: 'Property for Sale in Prizren, Kosovo - Houses & Apartments',
        description:
          'Discover property for sale in Prizren, Kosovo. Historic city with affordable apartments, houses, and land for sale. Search with BalkanEstateAI.',
        keywords: ['property for sale Prizren', 'houses for sale Prizren', 'apartments Prizren Kosovo'],
      },
    ],
  },
  {
    name: 'North Macedonia',
    slug: 'North Macedonia',
    lang: 'mk',
    isoCode: 'MK',
    title: 'Real Estate North Macedonia - Property for Sale in Skopje & Ohrid',
    description:
      'Find real estate in North Macedonia. Browse apartments, houses, and land for sale in Skopje, Ohrid, and across the country. AI-powered property search on BalkanEstateAI.',
    keywords: [
      'real estate North Macedonia',
      'buy property Skopje',
      'property for sale North Macedonia',
      'apartments for sale Skopje',
      'Ohrid real estate',
      'land for sale North Macedonia',
      'agricultural land for sale North Macedonia',
      'станови за продажба скопје',
      'куќи за продажба македонија',
    ],
    cities: [
      {
        name: 'Skopje',
        slug: 'Skopje',
        title: 'Buy Property in Skopje - Apartments & Houses for Sale',
        description:
          'Buy property in Skopje, North Macedonia. Find apartments, houses, and new builds for sale in the capital. Affordable prices, AI-powered search on BalkanEstateAI.',
        keywords: ['buy property Skopje', 'apartments for sale Skopje', 'houses for sale Skopje', 'Skopje real estate'],
      },
      {
        name: 'Ohrid',
        slug: 'Ohrid',
        title: 'Ohrid Real Estate - Property for Sale by UNESCO Lake',
        description:
          'Explore Ohrid real estate. Find lakeside apartments, houses, and villas for sale by UNESCO Lake Ohrid. North Macedonia\'s top destination.',
        keywords: ['Ohrid real estate', 'property for sale Ohrid', 'lakeside property Ohrid', 'houses for sale Ohrid'],
      },
      {
        name: 'Bitola',
        slug: 'Bitola',
        title: 'Property for Sale in Bitola - Houses & Apartments',
        description:
          'Browse property for sale in Bitola, North Macedonia. Affordable houses, apartments, and land in Macedonia\'s second city.',
        keywords: ['property for sale Bitola', 'houses Bitola', 'apartments Bitola'],
      },
    ],
  },
  {
    name: 'Albania',
    slug: 'Albania',
    lang: 'sq',
    isoCode: 'AL',
    title: 'Buy Property in Albania - Apartments, Villas & Land for Sale',
    description:
      'Buy property in Albania. Find apartments for sale in Tirana, villas on the Albanian Riviera, and land across the country. Low prices, high ROI. AI-powered search on BalkanEstateAI.',
    keywords: [
      'buy property Albania',
      'apartments for sale Tirana',
      'property investment Albania',
      'villa for sale Albania',
      'Albania real estate investment 2026',
      'Sarande property for sale',
      'luxury villa Saranda Albania',
      'Tirana apartment price per sqm',
      'shtepi ne shitje tirane',
      'banesa ne shitje prishtine',
      'toke ne shitje shqiperi',
    ],
    cities: [
      {
        name: 'Tirana',
        slug: 'Tirana',
        title: 'Apartments for Sale in Tirana - Buy Property in Albania\'s Capital',
        description:
          'Find apartments for sale in Tirana, Albania. New builds, city center flats, and investment properties. Tirana apartment prices from €800/sqm. AI-powered search.',
        keywords: [
          'apartments for sale Tirana',
          'buy property Tirana',
          'Tirana apartment price per sqm',
          'new build apartments Tirana 2026',
          'shtepi ne shitje tirane',
        ],
      },
      {
        name: 'Saranda',
        slug: 'Saranda',
        title: 'Sarande Property for Sale - Albanian Riviera Real Estate',
        description:
          'Discover Sarande property for sale on the Albanian Riviera. Seaside apartments, luxury villas, and investment properties with sea views. Growing tourism market.',
        keywords: ['Sarande property for sale', 'Albanian Riviera real estate', 'villa for sale Saranda', 'seaside apartment Albania'],
      },
      {
        name: 'Durres',
        slug: 'Durres',
        title: 'Property for Sale in Durres - Coastal Apartments & Houses',
        description:
          'Browse property for sale in Durres, Albania. Coastal apartments, beachfront properties, and affordable houses near Tirana.',
        keywords: ['property for sale Durres', 'apartments Durres Albania', 'beachfront Durres'],
      },
      {
        name: 'Vlora',
        slug: 'Vlora',
        title: 'Vlora Real Estate - Property for Sale on the Albanian Coast',
        description:
          'Find property for sale in Vlora, Albania. Seaside apartments and villas at the gateway to the Albanian Riviera.',
        keywords: ['property for sale Vlora', 'Vlora real estate', 'seaside property Vlora'],
      },
    ],
  },

  // ── Tier 2: Growth markets ───────────────────────────────────────
  {
    name: 'Montenegro',
    slug: 'Montenegro',
    lang: 'me',
    isoCode: 'ME',
    title: 'Property for Sale in Montenegro - Real Estate, Villas & Apartments',
    description:
      'Find property for sale in Montenegro. Browse luxury villas in Budva, apartments in Kotor, land on the coast, and new builds in Tivat. AI-powered search with BalkanEstateAI.',
    keywords: [
      'property for sale Montenegro',
      'buy property Montenegro',
      'real estate Montenegro',
      'apartments for sale Budva',
      'apartments for sale Kotor',
      'property for sale Tivat',
      'luxury villa Montenegro',
      'buy apartment Podgorica',
      'Montenegro property for foreigners',
      'new build apartments Montenegro',
      'off plan property Montenegro',
      'buy land Montenegro coast',
      'rental yield Montenegro',
      'Montenegro residence permit property',
      'Porto Montenegro real estate',
      'nekretnine crna gora',
    ],
    cities: [
      {
        name: 'Budva',
        slug: 'Budva',
        title: 'Apartments for Sale in Budva - Montenegro Coastal Property',
        description:
          'Find apartments for sale in Budva, Montenegro. Coastal properties, sea view apartments, and luxury residences on the Budva Riviera. From €1,500/sqm.',
        keywords: ['apartments for sale Budva', 'property for sale Budva', 'Budva real estate', 'seaside apartment Budva'],
      },
      {
        name: 'Kotor',
        slug: 'Kotor',
        title: 'Apartments for Sale in Kotor - UNESCO Bay Property',
        description:
          'Discover apartments for sale in Kotor, Montenegro. Property in the UNESCO Bay of Kotor. Old town apartments, new builds, and sea view homes.',
        keywords: ['apartments for sale Kotor', 'property Kotor Montenegro', 'Bay of Kotor real estate', 'Kotor old town apartment'],
      },
      {
        name: 'Tivat',
        slug: 'Tivat',
        title: 'Property for Sale in Tivat - Porto Montenegro Real Estate',
        description:
          'Browse property for sale in Tivat, Montenegro. Luxury apartments near Porto Montenegro, new builds, and coastal residences. Premium Adriatic location.',
        keywords: ['property for sale Tivat', 'Porto Montenegro real estate', 'Tivat apartments', 'luxury property Tivat'],
      },
      {
        name: 'Podgorica',
        slug: 'Podgorica',
        title: 'Buy Apartment in Podgorica - Montenegro Capital Property',
        description:
          'Buy apartment in Podgorica, Montenegro. Affordable capital city property, new builds, and investment opportunities. Prices from €1,000/sqm.',
        keywords: ['buy apartment Podgorica', 'property Podgorica', 'Podgorica real estate', 'apartments for sale Podgorica'],
      },
      {
        name: 'Herceg Novi',
        slug: 'Herceg Novi',
        title: 'Property for Sale in Herceg Novi - Coastal Montenegro',
        description:
          'Find property for sale in Herceg Novi, Montenegro. Adriatic coast apartments, sea view villas, and affordable homes at the entrance to the Bay of Kotor.',
        keywords: ['prodaja stanova Herceg Novi', 'property for sale Herceg Novi', 'Herceg Novi apartments'],
      },
      {
        name: 'Bar',
        slug: 'Bar',
        title: 'Property for Sale in Bar - Southern Montenegro Coast',
        description:
          'Browse property for sale in Bar, Montenegro. Affordable coastal property, apartments, and houses in Montenegro\'s port city.',
        keywords: ['property for sale Bar Montenegro', 'apartments Bar Montenegro'],
      },
      {
        name: 'Kolasin',
        slug: 'Kolasin',
        title: 'Property for Sale in Kolasin - Montenegro Mountain Resort',
        description:
          'Find property for sale in Kolasin, Montenegro. Mountain resort apartments, ski property, and land. Growing ski tourism destination.',
        keywords: ['zemljište Kolašin prodaja', 'property Kolasin Montenegro', 'ski property Montenegro'],
      },
    ],
  },
  {
    name: 'Bosnia and Herzegovina',
    slug: 'Bosnia',
    lang: 'bs',
    isoCode: 'BA',
    title: 'Property for Sale in Bosnia and Herzegovina - Real Estate BiH',
    description:
      'Find property for sale in Bosnia and Herzegovina. Browse apartments in Sarajevo, houses in Mostar, and affordable real estate across BiH. AI-powered search.',
    keywords: [
      'property for sale Bosnia',
      'real estate Bosnia Herzegovina',
      'apartments for sale Sarajevo',
      'houses for sale Mostar',
      'stanovi na prodaju sarajevo',
      'nekretnine bosna',
    ],
    cities: [
      {
        name: 'Sarajevo',
        slug: 'Sarajevo',
        title: 'Apartments for Sale in Sarajevo - Bosnia Real Estate',
        description:
          'Find apartments for sale in Sarajevo, Bosnia. Capital city property, new builds, and investment opportunities in BiH\'s largest market.',
        keywords: ['apartments for sale Sarajevo', 'stanovi na prodaju sarajevo', 'Sarajevo real estate', 'property Sarajevo'],
      },
      {
        name: 'Mostar',
        slug: 'Mostar',
        title: 'Property for Sale in Mostar - Houses & Apartments in Herzegovina',
        description:
          'Browse property for sale in Mostar, Bosnia. Historic city apartments, houses, and land in Herzegovina. Tourism investment potential.',
        keywords: ['property for sale Mostar', 'houses Mostar', 'real estate Mostar Herzegovina'],
      },
    ],
  },

  // ── Tier 3: Competitive markets (target international buyers) ────
  {
    name: 'Serbia',
    slug: 'Serbia',
    lang: 'sr',
    isoCode: 'RS',
    title: 'Real Estate Serbia - Property for Sale in Belgrade & Beyond',
    description:
      'Find real estate in Serbia. Browse apartments for sale in Belgrade, houses across Serbia, and investment properties. AI-powered search on BalkanEstateAI.',
    keywords: [
      'real estate Serbia',
      'apartments for sale Belgrade',
      'property for sale Serbia',
      'Serbia property market forecast',
      'stanovi na prodaju beograd',
      'kuce na prodaju srbija',
      'prodaja stanova Beograd',
      'nekretnine Srbija',
    ],
    cities: [
      {
        name: 'Belgrade',
        slug: 'Belgrade',
        title: 'Apartments for Sale in Belgrade - Serbia Real Estate',
        description:
          'Find apartments for sale in Belgrade, Serbia. New Belgrade flats, city center apartments, and investment properties in Serbia\'s capital. AI-powered search.',
        keywords: ['apartments for sale Belgrade', 'prodaja stanova Beograd', 'Belgrade real estate', 'buy apartment Belgrade'],
      },
      {
        name: 'Novi Sad',
        slug: 'Novi Sad',
        title: 'Property for Sale in Novi Sad - Apartments & Houses',
        description:
          'Browse property for sale in Novi Sad, Serbia. European Capital of Culture with affordable apartments and growing property market.',
        keywords: ['property for sale Novi Sad', 'apartments Novi Sad', 'Novi Sad real estate'],
      },
      {
        name: 'Nis',
        slug: 'Nis',
        title: 'Property for Sale in Nis - Affordable Serbian Real Estate',
        description:
          'Find property for sale in Nis, Serbia. Affordable apartments and houses in Serbia\'s third largest city.',
        keywords: ['property for sale Nis', 'apartments Nis Serbia'],
      },
    ],
  },
  {
    name: 'Croatia',
    slug: 'Croatia',
    lang: 'hr',
    isoCode: 'HR',
    title: 'Property for Sale in Croatia - Coastal Homes, Apartments & Villas',
    description:
      'Find property for sale in Croatia. Browse seaside apartments in Split, houses on the Dalmatian coast, villas in Dubrovnik, and more. AI-powered search.',
    keywords: [
      'property for sale Croatia',
      'buy house Croatia coast',
      'seaside property Croatia',
      'Dubrovnik property for sale',
      'apartments for sale Split',
      'Croatia property tax foreigners',
      'stanovi Split',
      'kuće Dalmacija',
      'apartmani Dubrovnik prodaja',
      'nekretnine Hrvatska',
    ],
    cities: [
      {
        name: 'Split',
        slug: 'Split',
        title: 'Property for Sale in Split - Dalmatian Coast Real Estate',
        description:
          'Find property for sale in Split, Croatia. Coastal apartments, Dalmatian stone houses, and investment properties in Croatia\'s second city.',
        keywords: ['property for sale Split', 'stanovi Split', 'Split real estate', 'apartments Split Croatia'],
      },
      {
        name: 'Dubrovnik',
        slug: 'Dubrovnik',
        title: 'Dubrovnik Property for Sale - Luxury Croatian Real Estate',
        description:
          'Discover Dubrovnik property for sale. Old town apartments, luxury villas, and coastal homes in Croatia\'s crown jewel.',
        keywords: ['Dubrovnik property for sale', 'apartmani Dubrovnik prodaja', 'luxury property Dubrovnik'],
      },
      {
        name: 'Zagreb',
        slug: 'Zagreb',
        title: 'Apartments for Sale in Zagreb - Croatia Capital Property',
        description:
          'Browse apartments for sale in Zagreb, Croatia. Capital city property, new builds, and investment opportunities.',
        keywords: ['apartments for sale Zagreb', 'Zagreb real estate', 'property Zagreb'],
      },
    ],
  },
  {
    name: 'Bulgaria',
    slug: 'Bulgaria',
    lang: 'bg',
    isoCode: 'BG',
    title: 'Real Estate Bulgaria - Property & Apartments for Sale',
    description:
      'Find real estate in Bulgaria. Affordable apartments in Sofia, Black Sea coast properties, and ski resort homes. AI-powered search on BalkanEstateAI.',
    keywords: [
      'real estate Bulgaria',
      'Sofia apartments for sale',
      'property for sale Bulgaria',
      'имоти продажба София',
      'имот бг',
      'апартаменти под наем',
    ],
    cities: [
      {
        name: 'Sofia',
        slug: 'Sofia',
        title: 'Sofia Apartments for Sale - Bulgaria Capital Real Estate',
        description:
          'Find apartments for sale in Sofia, Bulgaria. Affordable capital city property, new builds, and investment opportunities. Prices from €1,000/sqm.',
        keywords: ['Sofia apartments for sale', 'имоти продажба София', 'Sofia real estate', 'buy property Sofia'],
      },
      {
        name: 'Burgas',
        slug: 'Burgas',
        title: 'Property for Sale in Burgas - Black Sea Coast Bulgaria',
        description:
          'Browse property for sale in Burgas on Bulgaria\'s Black Sea coast. Seaside apartments, beach properties, and affordable investments.',
        keywords: ['property for sale Burgas', 'Black Sea property Bulgaria', 'Burgas apartments'],
      },
    ],
  },
  {
    name: 'Romania',
    slug: 'Romania',
    lang: 'ro',
    isoCode: 'RO',
    title: 'Property for Sale in Romania - Bucharest & Cluj Real Estate',
    description:
      'Find property for sale in Romania. Browse apartments in Bucharest, houses in Cluj-Napoca, and real estate across the country. AI-powered search.',
    keywords: [
      'property for sale Romania',
      'Bucharest real estate',
      'apartments for sale Bucharest',
      'houses for sale Cluj',
      'apartamente de vanzare Bucuresti',
      'case de vanzare Cluj',
    ],
    cities: [
      {
        name: 'Bucharest',
        slug: 'Bucharest',
        title: 'Bucharest Real Estate - Apartments & Property for Sale',
        description:
          'Find Bucharest real estate. Apartments for sale, new developments, and investment properties in Romania\'s capital. AI-powered search.',
        keywords: ['Bucharest real estate', 'apartamente de vanzare Bucuresti', 'apartments Bucharest', 'property Bucharest'],
      },
      {
        name: 'Cluj-Napoca',
        slug: 'Cluj-Napoca',
        title: 'Property for Sale in Cluj-Napoca - Romania Tech Hub',
        description:
          'Browse property for sale in Cluj-Napoca, Romania\'s fastest-growing tech hub. Apartments, houses, and investment properties.',
        keywords: ['property for sale Cluj', 'case de vanzare Cluj', 'Cluj-Napoca real estate'],
      },
    ],
  },
  {
    name: 'Greece',
    slug: 'Greece',
    lang: 'el',
    isoCode: 'GR',
    title: 'Property for Sale in Greece - Islands, Athens & Coastal Homes',
    description:
      'Find property for sale in Greece. Browse Athens apartments, island homes, and coastal villas. Golden visa eligible. AI-powered search.',
    keywords: [
      'property for sale Greece',
      'Athens property investment',
      'Greek island property',
      'Greece golden visa property',
      'σπίτια προς πώληση Αθήνα',
      'ακίνητα Ελλάδα',
    ],
    cities: [
      {
        name: 'Athens',
        slug: 'Athens',
        title: 'Athens Property Investment - Apartments & Houses for Sale',
        description:
          'Find Athens property investment opportunities. Apartments, houses, and golden visa eligible properties in Greece\'s capital.',
        keywords: ['Athens property investment', 'σπίτια προς πώληση Αθήνα', 'apartments Athens', 'Athens golden visa'],
      },
      {
        name: 'Thessaloniki',
        slug: 'Thessaloniki',
        title: 'Property for Sale in Thessaloniki - Northern Greece Real Estate',
        description:
          'Browse property for sale in Thessaloniki. Apartments, houses, and investment properties in Greece\'s second city.',
        keywords: ['property for sale Thessaloniki', 'Thessaloniki real estate', 'apartments Thessaloniki'],
      },
    ],
  },
];

// ─── Property Type SEO Data ──────────────────────────────────────────────────

export const PROPERTY_TYPES_SEO: PropertyTypeSEO[] = [
  {
    type: 'apartment',
    slug: 'apartment',
    title: 'Apartments for Sale in the Balkans',
    description:
      'Browse apartments for sale across the Balkans. City center flats, new builds, and investment apartments in Serbia, Montenegro, Croatia, Albania, and more.',
  },
  {
    type: 'house',
    slug: 'house',
    title: 'Houses for Sale in the Balkans',
    description:
      'Find houses for sale across the Balkans. Family homes, countryside houses, and village properties in Serbia, Montenegro, Croatia, Albania, and beyond.',
  },
  {
    type: 'villa',
    slug: 'villa',
    title: 'Luxury Villas for Sale in the Balkans',
    description:
      'Discover luxury villas for sale across the Balkans. Coastal villas in Montenegro and Croatia, countryside estates, and premium residences.',
  },
  {
    type: 'land',
    slug: 'land',
    title: 'Land for Sale in the Balkans',
    description:
      'Find land for sale across the Balkans. Building plots, agricultural land, and development sites in Serbia, Montenegro, Albania, North Macedonia, and more.',
  },
  {
    type: 'commercial',
    slug: 'commercial',
    title: 'Commercial Property for Sale in the Balkans',
    description:
      'Browse commercial real estate across the Balkans. Office space, retail properties, hotels, and business premises.',
  },
];

// ─── Regional / Pan-Balkan Keywords ──────────────────────────────────────────

export const REGIONAL_KEYWORDS = [
  'real estate Balkans',
  'Balkan property investment',
  'cheap property Balkans',
  'cheapest European country buy property',
  'buy property in balkans',
  'balkan real estate investment',
  'cheapest property in europe',
  'best country to buy property in balkans',
  'retirement property balkans',
  'digital nomad property balkans',
  'EU property for non-EU citizens',
  'ski property balkans',
];

// ─── Helper Functions ────────────────────────────────────────────────────────

/** Find SEO data for a country by name or slug */
export function getCountrySEO(countryName: string): CountrySEO | undefined {
  const normalized = countryName.toLowerCase().trim();
  return COUNTRIES_SEO.find(
    (c) =>
      c.name.toLowerCase() === normalized ||
      c.slug.toLowerCase() === normalized
  );
}

/** Find SEO data for a city within a country */
export function getCitySEO(cityName: string, countryName?: string): CitySEO | undefined {
  const normalized = cityName.toLowerCase().trim();
  const countries = countryName
    ? COUNTRIES_SEO.filter((c) => c.name.toLowerCase() === countryName.toLowerCase() || c.slug.toLowerCase() === countryName.toLowerCase())
    : COUNTRIES_SEO;

  for (const country of countries) {
    const city = country.cities.find((c) => c.name.toLowerCase() === normalized || c.slug.toLowerCase() === normalized);
    if (city) return city;
  }
  return undefined;
}

/** Find SEO data for a property type */
export function getPropertyTypeSEO(type: string): PropertyTypeSEO | undefined {
  return PROPERTY_TYPES_SEO.find((t) => t.type.toLowerCase() === type.toLowerCase() || t.slug.toLowerCase() === type.toLowerCase());
}

/**
 * Generate an optimized SEO title for search pages based on active filters.
 * Targets the exact keyword phrases competitors rank for.
 */
export function generateSearchSEOTitle(filters: {
  country?: string;
  city?: string;
  propertyType?: string;
  query?: string;
}, t?: (key: string, defaultValue: string, options?: Record<string, unknown>) => string): string {
  const { country, city, propertyType, query } = filters;
  const translate = t || ((_k: string, d: string) => d);

  // City + country specific (most specific, highest intent)
  if (city && city !== 'all') {
    const citySeo = getCitySEO(city, country);
    if (citySeo) return citySeo.title;

    const typeLabel = propertyType && propertyType !== 'all' ? getTypeLabel(propertyType) : translate('search:seo.property', 'Property');
    return translate('search:seo.cityTitle', `${typeLabel} for Sale in ${city} - Real Estate Listings`, { type: typeLabel, city } as any);
  }

  // Country specific with property type
  if (country && country !== 'all' && propertyType && propertyType !== 'all') {
    const typeLabel = getTypeLabel(propertyType);
    return translate('search:seo.countryTypeTitle', `${typeLabel} for Sale in ${country} - Browse ${typeLabel} Listings`, { type: typeLabel, country } as any);
  }

  // Country specific
  if (country && country !== 'all') {
    const countrySeo = getCountrySEO(country);
    if (countrySeo) return countrySeo.title;
    return translate('search:seo.countryTitle', `Property for Sale in ${country} - Real Estate Listings`, { country } as any);
  }

  // Property type only
  if (propertyType && propertyType !== 'all') {
    const typeSeo = getPropertyTypeSEO(propertyType);
    if (typeSeo) return typeSeo.title;
  }

  // Free text query
  if (query) {
    return translate('search:seo.queryTitle', `Property for Sale in ${query} - Real Estate Listings`, { query } as any);
  }

  // Default
  return translate('search:seo.defaultTitle', 'Property for Sale in the Balkans - Houses, Apartments & Villas');
}

/**
 * Generate an optimized SEO description for search pages.
 */
export function generateSearchSEODescription(filters: {
  country?: string;
  city?: string;
  propertyType?: string;
  query?: string;
  minPrice?: number;
  maxPrice?: number;
  beds?: number;
}, t?: (key: string, defaultValue: string, options?: Record<string, unknown>) => string): string {
  const { country, city, propertyType, query, minPrice, maxPrice, beds } = filters;
  const translate = t || ((_k: string, d: string) => d);

  // City specific
  if (city && city !== 'all') {
    const citySeo = getCitySEO(city, country);
    if (citySeo) return citySeo.description;
  }

  // Country specific
  if (country && country !== 'all') {
    const countrySeo = getCountrySEO(country);
    if (countrySeo) return countrySeo.description;
  }

  // Property type
  if (propertyType && propertyType !== 'all') {
    const typeSeo = getPropertyTypeSEO(propertyType);
    if (typeSeo) return typeSeo.description;
  }

  // Build dynamic description
  let desc = translate('search:seo.browse', 'Browse ');
  if (beds) desc += `${beds}+ ${translate('search:seo.bedroom', 'bedroom ')}`;
  desc += translate('search:seo.typesForSale', 'houses, apartments, and villas for sale');
  if (query) {
    desc += ` ${translate('search:seo.in', 'in')} ${query}`;
  } else {
    desc += ` ${translate('search:seo.acrossBalkans', 'across the Balkans')}`;
  }
  if (minPrice || maxPrice) {
    desc += `. ${translate('search:seo.priceRange', 'Price range')}: `;
    if (minPrice) desc += `€${minPrice.toLocaleString()}`;
    if (minPrice && maxPrice) desc += ' – ';
    if (maxPrice) desc += `€${maxPrice.toLocaleString()}`;
  }
  desc += `. ${translate('search:seo.tagline', 'AI-powered property search on BalkanEstateAI — 10 countries, 10 languages.')}`;
  return desc;
}

function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    apartment: 'Apartments',
    house: 'Houses',
    villa: 'Villas',
    land: 'Land',
    commercial: 'Commercial Property',
  };
  return labels[type.toLowerCase()] || 'Property';
}
