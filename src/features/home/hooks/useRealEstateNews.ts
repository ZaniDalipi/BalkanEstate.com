import { useState, useMemo } from 'react';
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
  _id: string;
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
  return articles.map(a => ({
    id: a._id,
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

// Fallback news shown until the first cron run populates the database
const FALLBACK_NEWS: NewsItem[] = [
  { id: 'f1', title: 'Albania Sees Record Foreign Investment in Coastal Properties', excerpt: 'International buyers are flocking to the Albanian Riviera, with property transactions up 45% year-over-year as infrastructure improvements continue along the coast.', country: 'Albania', countryCode: 'AL', source: 'Balkan Insight', sourceUrl: 'https://balkaninsight.com', date: '2026-03-04', category: 'investment', imageGradient: 'from-blue-600 to-cyan-500' },
  { id: 'f2', title: 'Serbia Introduces New Digital Property Registry System', excerpt: 'The Serbian government has launched a blockchain-based property registry, streamlining transactions and reducing fraud in the real estate sector.', country: 'Serbia', countryCode: 'RS', source: 'Belgrade Times', sourceUrl: 'https://www.b92.net', date: '2026-03-03', category: 'regulation', imageGradient: 'from-red-500 to-rose-400' },
  { id: 'f3', title: 'Croatia Housing Market Stabilizes After EU-Driven Price Surge', excerpt: 'After years of rapid growth driven by EU membership and tourism, Croatian property prices are showing signs of stabilization, offering new opportunities for buyers.', country: 'Croatia', countryCode: 'HR', source: 'Croatia Week', sourceUrl: 'https://www.croatiaweek.com', date: '2026-03-02', category: 'market', imageGradient: 'from-indigo-500 to-blue-400' },
  { id: 'f4', title: 'Athens: New Luxury Developments Transform the Riviera Waterfront', excerpt: 'A wave of high-end residential projects along the Athens Riviera is attracting global investors, with prices reaching €8,000/m² in prime locations.', country: 'Greece', countryCode: 'GR', source: 'Greek Reporter', sourceUrl: 'https://greekreporter.com', date: '2026-03-01', category: 'development', imageGradient: 'from-sky-500 to-blue-400' },
  { id: 'f5', title: 'Montenegro Becomes Top Destination for Digital Nomad Property Buyers', excerpt: 'With its new digital nomad visa and affordable coastal properties, Montenegro is emerging as a hub for remote workers seeking Mediterranean living.', country: 'Montenegro', countryCode: 'ME', source: 'Montenegro News', sourceUrl: 'https://www.gov.me', date: '2026-02-28', category: 'tourism', imageGradient: 'from-emerald-500 to-teal-400' },
  { id: 'f6', title: 'Bulgarian Black Sea Resorts See 30% Price Increase', excerpt: 'Property values along the Bulgarian Black Sea coast have surged, driven by both domestic demand and interest from Northern European retirees.', country: 'Bulgaria', countryCode: 'BG', source: 'Novinite', sourceUrl: 'https://www.novinite.com', date: '2026-02-26', category: 'market', imageGradient: 'from-violet-500 to-purple-400' },
];

async function fetchNews(): Promise<NewsItem[]> {
  try {
    const res = await fetch(`${API_CONFIG.BASE_URL}/news?limit=12`);
    if (!res.ok) return FALLBACK_NEWS;
    const data = await res.json();
    const articles = transformApiNews(data.articles || []);
    // If DB is empty (cron hasn't run yet), show fallback
    return articles.length > 0 ? articles : FALLBACK_NEWS;
  } catch {
    return FALLBACK_NEWS;
  }
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

  const filteredNews = useMemo(() => {
    if (selectedCountry === 'All') return allNews;
    return allNews.filter((item) => item.country === selectedCountry);
  }, [selectedCountry, allNews]);

  return {
    news: filteredNews,
    allNews,
    countries: COUNTRIES,
    selectedCountry,
    setSelectedCountry,
    isLoading: isPending,
  };
}
