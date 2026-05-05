import { useState, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { API_CONFIG } from '@/src/shared/constants/app.constants';

export interface NewsItem {
  id: string;
  title: string;
  excerpt: string;
  country: string;
  countryCode: string;
  source: string;
  sourceUrl: string;
  date: string;
  category: 'market' | 'investment' | 'regulation' | 'development' | 'tourism';
  imageGradient: string;
  coverImageUrl?: string;
}

// Gradient fallbacks by category when no cover image is available
const CATEGORY_GRADIENTS: Record<string, string> = {
  market: 'from-indigo-500 to-blue-400',
  investment: 'from-blue-600 to-cyan-500',
  regulation: 'from-red-500 to-rose-400',
  development: 'from-sky-500 to-blue-400',
  tourism: 'from-emerald-500 to-teal-400',
};

const COUNTRIES = ['All', 'Albania', 'Serbia', 'Croatia', 'Greece', 'Montenegro', 'North Macedonia', 'Bulgaria', 'Kosovo', 'Slovenia', 'Bosnia & Herzegovina', 'Romania'];

interface ApiNewsArticle {
  id?: string;
  _id?: string;
  title: string;
  excerpt: string;
  country: string;
  countryCode: string;
  source: string;
  sourceUrl: string;
  publishedAt: string;
  category: string;
  coverImageUrl?: string;
}

function transformApiNews(articles: ApiNewsArticle[]): NewsItem[] {
  return articles.map((a, i) => ({
    id: a.id || a._id || String(i),
    title: a.title,
    excerpt: a.excerpt,
    country: a.country,
    countryCode: a.countryCode,
    source: a.source,
    sourceUrl: a.sourceUrl,
    date: new Date(a.publishedAt).toISOString().split('T')[0],
    category: (a.category || 'market') as NewsItem['category'],
    imageGradient: CATEGORY_GRADIENTS[a.category] || 'from-slate-500 to-gray-400',
    coverImageUrl: a.coverImageUrl,
  }));
}

// Wikipedia search terms per country for representative cover images
const COUNTRY_IMAGE_TOPICS: Record<string, string> = {
  'Albania': 'Albanian Riviera',
  'Serbia': 'Belgrade',
  'Croatia': 'Dubrovnik',
  'Greece': 'Athens',
  'Montenegro': 'Kotor',
  'North Macedonia': 'Skopje',
  'Bulgaria': 'Sunny Beach',
  'Kosovo': 'Pristina',
  'Slovenia': 'Ljubljana',
  'Bosnia & Herzegovina': 'Sarajevo',
  'Romania': 'Bucharest',
};

// In-memory cache so we only fetch once per session
const thumbnailCache: Record<string, string | null> = {};

/** Fetch a small thumbnail URL for a country via Wikipedia REST API (JSON only, ~1KB) */
async function fetchCountryThumbnail(country: string): Promise<string | null> {
  if (country in thumbnailCache) return thumbnailCache[country];
  const topic = COUNTRY_IMAGE_TOPICS[country] || country;
  try {
    const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic)}`);
    if (!res.ok) { thumbnailCache[country] = null; return null; }
    const data = await res.json();
    // Prefer thumbnail (~320px) over original (can be 5000px+)
    const url = data.thumbnail?.source || null;
    thumbnailCache[country] = url;
    return url;
  } catch {
    thumbnailCache[country] = null;
    return null;
  }
}

// Fallback news shown until the first cron run populates the database
const FALLBACK_NEWS: NewsItem[] = [
  // Albania
  { id: 'f1', title: 'Albania Sees Record Foreign Investment in Coastal Properties', excerpt: 'International buyers are flocking to the Albanian Riviera, with property transactions up 45% year-over-year as infrastructure improvements continue along the coast.', country: 'Albania', countryCode: 'AL', source: 'Balkan Insight', sourceUrl: 'https://balkaninsight.com', date: '2026-03-04', category: 'investment', imageGradient: 'from-blue-600 to-cyan-500' },
  { id: 'f1b', title: 'Tirana Apartment Prices Rise as New Metro Line Announced', excerpt: 'Property values near planned metro stations in Tirana have jumped 20%, with developers racing to launch new residential projects along the route.', country: 'Albania', countryCode: 'AL', source: 'Balkan Insight', sourceUrl: 'https://balkaninsight.com', date: '2026-03-01', category: 'development', imageGradient: 'from-sky-500 to-blue-400' },
  { id: 'f1c', title: 'Albania Introduces Tax Incentives for First-Time Home Buyers', excerpt: 'The government has unveiled a new program offering reduced property taxes and subsidized mortgage rates for citizens purchasing their first home.', country: 'Albania', countryCode: 'AL', source: 'Albanian Daily News', sourceUrl: 'https://albaniandailynews.com', date: '2026-02-25', category: 'regulation', imageGradient: 'from-red-500 to-rose-400' },
  // Serbia
  { id: 'f2', title: 'Serbia Introduces New Digital Property Registry System', excerpt: 'The Serbian government has launched a blockchain-based property registry, streamlining transactions and reducing fraud in the real estate sector.', country: 'Serbia', countryCode: 'RS', source: 'Belgrade Times', sourceUrl: 'https://www.b92.net', date: '2026-03-03', category: 'regulation', imageGradient: 'from-red-500 to-rose-400' },
  { id: 'f2b', title: 'Belgrade Waterfront Nears Completion, Boosting Savamala District', excerpt: 'The Belgrade Waterfront mega-project is entering its final phase, driving a surge in residential and commercial interest in the surrounding neighborhoods.', country: 'Serbia', countryCode: 'RS', source: 'Belgrade Times', sourceUrl: 'https://www.b92.net', date: '2026-02-27', category: 'development', imageGradient: 'from-sky-500 to-blue-400' },
  { id: 'f2c', title: 'Novi Sad Emerges as Serbia\'s Second Real Estate Hotspot', excerpt: 'Following the European Capital of Culture designation, Novi Sad has seen a 35% increase in property demand from both local and international buyers.', country: 'Serbia', countryCode: 'RS', source: 'Balkan Insight', sourceUrl: 'https://balkaninsight.com', date: '2026-02-20', category: 'market', imageGradient: 'from-indigo-500 to-blue-400' },
  // Croatia
  { id: 'f3', title: 'Croatia Housing Market Stabilizes After EU-Driven Price Surge', excerpt: 'After years of rapid growth driven by EU membership and tourism, Croatian property prices are showing signs of stabilization, offering new opportunities for buyers.', country: 'Croatia', countryCode: 'HR', source: 'Croatia Week', sourceUrl: 'https://www.croatiaweek.com', date: '2026-03-02', category: 'market', imageGradient: 'from-indigo-500 to-blue-400' },
  { id: 'f3b', title: 'Split Ranks Among Top Mediterranean Cities for Property Investment', excerpt: 'A new EU report places Split in the top 10 Mediterranean cities for real estate ROI, citing strong tourism and improving infrastructure.', country: 'Croatia', countryCode: 'HR', source: 'Croatia Week', sourceUrl: 'https://www.croatiaweek.com', date: '2026-02-24', category: 'investment', imageGradient: 'from-blue-600 to-cyan-500' },
  { id: 'f3c', title: 'Croatia Tightens Short-Term Rental Regulations in Coastal Areas', excerpt: 'New regulations limit Airbnb-style rentals in historic centers of Dubrovnik and Split, potentially shifting investment toward long-term residential properties.', country: 'Croatia', countryCode: 'HR', source: 'Croatia Week', sourceUrl: 'https://www.croatiaweek.com', date: '2026-02-18', category: 'regulation', imageGradient: 'from-red-500 to-rose-400' },
  // Greece
  { id: 'f4', title: 'Athens: New Luxury Developments Transform the Riviera Waterfront', excerpt: 'A wave of high-end residential projects along the Athens Riviera is attracting global investors, with prices reaching €8,000/m² in prime locations.', country: 'Greece', countryCode: 'GR', source: 'Greek Reporter', sourceUrl: 'https://greekreporter.com', date: '2026-03-01', category: 'development', imageGradient: 'from-sky-500 to-blue-400' },
  { id: 'f4b', title: 'Greece Golden Visa Program Sees Renewed Interest After Threshold Update', excerpt: 'After adjusting the minimum investment to €500,000 in prime areas, Greece\'s golden visa program continues to attract buyers from the Middle East and Asia.', country: 'Greece', countryCode: 'GR', source: 'Greek Reporter', sourceUrl: 'https://greekreporter.com', date: '2026-02-22', category: 'investment', imageGradient: 'from-blue-600 to-cyan-500' },
  { id: 'f4c', title: 'Thessaloniki Sees Surge in Student Housing Development', excerpt: 'With multiple universities and a growing international student population, Thessaloniki is experiencing a boom in purpose-built student accommodation.', country: 'Greece', countryCode: 'GR', source: 'Greek Reporter', sourceUrl: 'https://greekreporter.com', date: '2026-02-15', category: 'development', imageGradient: 'from-sky-500 to-blue-400' },
  // Montenegro
  { id: 'f5', title: 'Montenegro Becomes Top Destination for Digital Nomad Property Buyers', excerpt: 'With its new digital nomad visa and affordable coastal properties, Montenegro is emerging as a hub for remote workers seeking Mediterranean living.', country: 'Montenegro', countryCode: 'ME', source: 'Montenegro News', sourceUrl: 'https://www.gov.me', date: '2026-02-28', category: 'tourism', imageGradient: 'from-emerald-500 to-teal-400' },
  { id: 'f5b', title: 'Porto Montenegro Expansion Drives Luxury Market Growth in Tivat', excerpt: 'The ongoing expansion of Porto Montenegro marina village is pushing property prices in Tivat to record levels, attracting ultra-high-net-worth buyers.', country: 'Montenegro', countryCode: 'ME', source: 'Montenegro News', sourceUrl: 'https://www.gov.me', date: '2026-02-21', category: 'market', imageGradient: 'from-indigo-500 to-blue-400' },
  { id: 'f5c', title: 'Montenegro Simplifies Property Purchase Process for Foreign Buyers', excerpt: 'New legislation removes several bureaucratic hurdles for non-residents buying property, making Montenegro one of the easiest Balkan markets to enter.', country: 'Montenegro', countryCode: 'ME', source: 'Montenegro News', sourceUrl: 'https://www.gov.me', date: '2026-02-14', category: 'regulation', imageGradient: 'from-red-500 to-rose-400' },
  // Bulgaria
  { id: 'f6', title: 'Bulgarian Black Sea Resorts See 30% Price Increase', excerpt: 'Property values along the Bulgarian Black Sea coast have surged, driven by both domestic demand and interest from Northern European retirees.', country: 'Bulgaria', countryCode: 'BG', source: 'Novinite', sourceUrl: 'https://www.novinite.com', date: '2026-02-26', category: 'market', imageGradient: 'from-violet-500 to-purple-400' },
  { id: 'f6b', title: 'Sofia Tech District Drives Commercial and Residential Demand', excerpt: 'Bulgaria\'s growing tech sector is fueling demand for both office space and housing in Sofia\'s emerging tech corridors, with prices up 25% year-over-year.', country: 'Bulgaria', countryCode: 'BG', source: 'Novinite', sourceUrl: 'https://www.novinite.com', date: '2026-02-19', category: 'development', imageGradient: 'from-sky-500 to-blue-400' },
  { id: 'f6c', title: 'Bulgaria Offers Lowest Property Taxes in the EU', excerpt: 'A comparative study confirms Bulgaria has the lowest property tax rates in the European Union, making it an attractive destination for budget-conscious investors.', country: 'Bulgaria', countryCode: 'BG', source: 'Novinite', sourceUrl: 'https://www.novinite.com', date: '2026-02-12', category: 'investment', imageGradient: 'from-blue-600 to-cyan-500' },
  // North Macedonia
  { id: 'f7', title: 'Skopje Urban Renewal Project Creates New Housing Opportunities', excerpt: 'A major urban renewal initiative in central Skopje is transforming former industrial zones into modern mixed-use developments with affordable housing.', country: 'North Macedonia', countryCode: 'MK', source: 'Balkan Insight', sourceUrl: 'https://balkaninsight.com', date: '2026-02-23', category: 'development', imageGradient: 'from-sky-500 to-blue-400' },
  { id: 'f7b', title: 'Lake Ohrid Properties Gain Popularity Among International Buyers', excerpt: 'The UNESCO-protected Lake Ohrid region is attracting foreign investors seeking vacation homes, with lakefront property prices rising steadily.', country: 'North Macedonia', countryCode: 'MK', source: 'Balkan Insight', sourceUrl: 'https://balkaninsight.com', date: '2026-02-16', category: 'tourism', imageGradient: 'from-emerald-500 to-teal-400' },
  { id: 'f7c', title: 'North Macedonia Launches Mortgage Subsidy Program for Young Families', excerpt: 'The government introduces subsidized mortgage rates of 2.5% for families under 35, aiming to boost homeownership among younger generations.', country: 'North Macedonia', countryCode: 'MK', source: 'Balkan Insight', sourceUrl: 'https://balkaninsight.com', date: '2026-02-10', category: 'regulation', imageGradient: 'from-red-500 to-rose-400' },
  // Kosovo
  { id: 'f8', title: 'Pristina Construction Boom: Over 2,000 New Apartments Planned', excerpt: 'Pristina is experiencing its largest construction wave in a decade, with multiple residential towers breaking ground across the expanding capital.', country: 'Kosovo', countryCode: 'XK', source: 'Kosovo Online', sourceUrl: 'https://www.gazetaexpress.com', date: '2026-02-22', category: 'development', imageGradient: 'from-sky-500 to-blue-400' },
  { id: 'f8b', title: 'Diaspora Investment Drives Kosovo Real Estate Growth', excerpt: 'Kosovo\'s large diaspora community is increasingly investing in property back home, accounting for an estimated 40% of new residential purchases.', country: 'Kosovo', countryCode: 'XK', source: 'Kosovo Online', sourceUrl: 'https://www.gazetaexpress.com', date: '2026-02-15', category: 'investment', imageGradient: 'from-blue-600 to-cyan-500' },
  { id: 'f8c', title: 'Prizren Heritage Zone Attracts Boutique Property Developers', excerpt: 'The historic city of Prizren is seeing a wave of boutique hotel and heritage property conversions as tourism numbers continue to climb.', country: 'Kosovo', countryCode: 'XK', source: 'Kosovo Online', sourceUrl: 'https://www.gazetaexpress.com', date: '2026-02-08', category: 'tourism', imageGradient: 'from-emerald-500 to-teal-400' },
  // Slovenia
  { id: 'f9', title: 'Ljubljana Named Best City for Property Investment in Southeast Europe', excerpt: 'A major European real estate index ranks Ljubljana first in the region for investment returns, citing stable governance and strong rental yields.', country: 'Slovenia', countryCode: 'SI', source: 'Slovenia Times', sourceUrl: 'https://sloveniatimes.com', date: '2026-02-20', category: 'investment', imageGradient: 'from-blue-600 to-cyan-500' },
  { id: 'f9b', title: 'Slovenia\'s Coastal Properties in Piran See Record Demand', excerpt: 'The charming Adriatic town of Piran is experiencing unprecedented interest from buyers, with available properties selling within days of listing.', country: 'Slovenia', countryCode: 'SI', source: 'Slovenia Times', sourceUrl: 'https://sloveniatimes.com', date: '2026-02-13', category: 'market', imageGradient: 'from-indigo-500 to-blue-400' },
  { id: 'f9c', title: 'Slovenia Expands Green Building Incentives for New Construction', excerpt: 'New government incentives offer up to 30% subsidies for energy-efficient construction, driving a shift toward sustainable residential development.', country: 'Slovenia', countryCode: 'SI', source: 'Slovenia Times', sourceUrl: 'https://sloveniatimes.com', date: '2026-02-06', category: 'regulation', imageGradient: 'from-red-500 to-rose-400' },
  // Bosnia & Herzegovina
  { id: 'f10', title: 'Sarajevo Real Estate Market Rebounds with Strong 2026 Outlook', excerpt: 'After years of stagnation, Sarajevo\'s property market is showing renewed vitality with rising prices and increased foreign buyer interest.', country: 'Bosnia & Herzegovina', countryCode: 'BA', source: 'Balkan Insight', sourceUrl: 'https://balkaninsight.com', date: '2026-02-19', category: 'market', imageGradient: 'from-indigo-500 to-blue-400' },
  { id: 'f10b', title: 'Mostar Bridge Area Sees Tourism-Driven Property Boom', excerpt: 'Properties near Mostar\'s iconic Old Bridge are commanding premium prices as the city cements its status as a must-visit Balkan destination.', country: 'Bosnia & Herzegovina', countryCode: 'BA', source: 'Balkan Insight', sourceUrl: 'https://balkaninsight.com', date: '2026-02-12', category: 'tourism', imageGradient: 'from-emerald-500 to-teal-400' },
  { id: 'f10c', title: 'Bosnia Streamlines Property Registration to Attract Investment', excerpt: 'Reforms to property registration processes aim to reduce transaction times from months to weeks, removing a key barrier to foreign investment.', country: 'Bosnia & Herzegovina', countryCode: 'BA', source: 'Balkan Insight', sourceUrl: 'https://balkaninsight.com', date: '2026-02-05', category: 'regulation', imageGradient: 'from-red-500 to-rose-400' },
  // Romania
  { id: 'f11', title: 'Bucharest Office-to-Residential Conversions Create New Housing Stock', excerpt: 'Developers are converting underused office buildings in central Bucharest into modern apartments, addressing the capital\'s growing housing demand.', country: 'Romania', countryCode: 'RO', source: 'Romania Insider', sourceUrl: 'https://www.romania-insider.com', date: '2026-02-18', category: 'development', imageGradient: 'from-sky-500 to-blue-400' },
  { id: 'f11b', title: 'Cluj-Napoca Overtakes Bucharest in Per-Square-Meter Prices', excerpt: 'Romania\'s tech capital Cluj-Napoca now has the highest property prices per square meter in the country, surpassing Bucharest for the first time.', country: 'Romania', countryCode: 'RO', source: 'Romania Insider', sourceUrl: 'https://www.romania-insider.com', date: '2026-02-11', category: 'market', imageGradient: 'from-indigo-500 to-blue-400' },
  { id: 'f11c', title: 'Romania\'s Black Sea Coast Attracts Retirees from Western Europe', excerpt: 'Affordable beachfront properties and a low cost of living are drawing increasing numbers of Western European retirees to Romania\'s Black Sea resorts.', country: 'Romania', countryCode: 'RO', source: 'Romania Insider', sourceUrl: 'https://www.romania-insider.com', date: '2026-02-04', category: 'tourism', imageGradient: 'from-emerald-500 to-teal-400' },
];

/** Enrich news items with small Wikipedia thumbnails (cached, ~1KB JSON per country) */
async function enrichWithThumbnails(items: NewsItem[]): Promise<NewsItem[]> {
  const countriesNeeded = [...new Set(
    items.filter(i => !i.coverImageUrl).map(i => i.country)
  )];
  // All fetches run in parallel + are cached — typically completes in <200ms
  const imageMap: Record<string, string | null> = {};
  await Promise.all(
    countriesNeeded.map(async (country) => {
      imageMap[country] = await fetchCountryThumbnail(country);
    })
  );
  return items.map(item => ({
    ...item,
    coverImageUrl: item.coverImageUrl || imageMap[item.country] || undefined,
  }));
}

async function fetchNews(): Promise<NewsItem[]> {
  let items: NewsItem[];
  try {
    const res = await fetch(`${API_CONFIG.BASE_URL}/news?limit=50`);
    if (!res.ok) {
      items = FALLBACK_NEWS;
    } else {
      const data = await res.json();
      const articles = transformApiNews(data.articles || []);
      items = articles.length > 0 ? articles : FALLBACK_NEWS;
    }
  } catch {
    items = FALLBACK_NEWS;
  }
  // Fill in missing cover images with small Wikipedia thumbnails (~320px, cached)
  return enrichWithThumbnails(items);
}

export function useRealEstateNews() {
  const [selectedCountry, setSelectedCountry] = useState('All');

  const { data: allNews = [], isPending } = useQuery<NewsItem[]>({
    queryKey: ['realEstateNews'],
    queryFn: fetchNews,
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
  });

  // Unique id per mount so news re-shuffles every time the section appears
  const mountId = useRef(Math.random());

  const filteredNews = useMemo(() => {
    const items = selectedCountry === 'All' ? allNews : allNews.filter((item) => item.country === selectedCountry);
    // Fisher-Yates shuffle so different articles appear each visit
    const shuffled = [...items];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCountry, allNews, mountId.current]);

  return {
    news: filteredNews,
    allNews,
    countries: COUNTRIES,
    selectedCountry,
    setSelectedCountry,
    isLoading: isPending,
  };
}
