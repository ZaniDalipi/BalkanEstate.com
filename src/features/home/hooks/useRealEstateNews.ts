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

async function fetchNews(): Promise<NewsItem[]> {
  const res = await fetch(`${API_CONFIG.BASE_URL}/news?limit=12`);
  if (!res.ok) return [];
  const data = await res.json();
  return transformApiNews(data.articles || []);
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
