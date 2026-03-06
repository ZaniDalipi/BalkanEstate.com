import { useState, useMemo } from 'react';

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
}

const NEWS_DATA: NewsItem[] = [
  {
    id: '1',
    title: 'Albania Sees Record Foreign Investment in Coastal Properties',
    excerpt: 'International buyers are flocking to the Albanian Riviera, with property transactions up 45% year-over-year as infrastructure improvements continue along the coast.',
    country: 'Albania',
    countryCode: 'AL',
    source: 'Balkan Insight',
    sourceUrl: 'https://balkaninsight.com',
    date: '2026-03-04',
    category: 'investment',
    imageGradient: 'from-blue-600 to-cyan-500',
  },
  {
    id: '2',
    title: 'Serbia Introduces New Digital Property Registry System',
    excerpt: 'The Serbian government has launched a blockchain-based property registry, streamlining transactions and reducing fraud in the real estate sector.',
    country: 'Serbia',
    countryCode: 'RS',
    source: 'Belgrade Times',
    sourceUrl: 'https://www.b92.net',
    date: '2026-03-03',
    category: 'regulation',
    imageGradient: 'from-red-500 to-rose-400',
  },
  {
    id: '3',
    title: 'Croatia Housing Market Stabilizes After EU-Driven Price Surge',
    excerpt: 'After years of rapid growth driven by EU membership and tourism, Croatian property prices are showing signs of stabilization, offering new opportunities for buyers.',
    country: 'Croatia',
    countryCode: 'HR',
    source: 'Croatia Week',
    sourceUrl: 'https://www.croatiaweek.com',
    date: '2026-03-02',
    category: 'market',
    imageGradient: 'from-indigo-500 to-blue-400',
  },
  {
    id: '4',
    title: 'Athens: New Luxury Developments Transform the Riviera Waterfront',
    excerpt: 'A wave of high-end residential projects along the Athens Riviera is attracting global investors, with prices reaching €8,000/m² in prime locations.',
    country: 'Greece',
    countryCode: 'GR',
    source: 'Greek Reporter',
    sourceUrl: 'https://greekreporter.com',
    date: '2026-03-01',
    category: 'development',
    imageGradient: 'from-sky-500 to-blue-400',
  },
  {
    id: '5',
    title: 'Montenegro Becomes Top Destination for Digital Nomad Property Buyers',
    excerpt: 'With its new digital nomad visa and affordable coastal properties, Montenegro is emerging as a hub for remote workers seeking Mediterranean living.',
    country: 'Montenegro',
    countryCode: 'ME',
    source: 'Montenegro News',
    sourceUrl: 'https://www.gov.me',
    date: '2026-02-28',
    category: 'tourism',
    imageGradient: 'from-emerald-500 to-teal-400',
  },
  {
    id: '6',
    title: 'North Macedonia Offers Tax Incentives for Green Building Projects',
    excerpt: 'New legislation in North Macedonia provides significant tax breaks for eco-friendly construction, spurring a wave of sustainable real estate development.',
    country: 'North Macedonia',
    countryCode: 'MK',
    source: 'MIA News',
    sourceUrl: 'https://mia.mk',
    date: '2026-02-27',
    category: 'regulation',
    imageGradient: 'from-amber-500 to-orange-400',
  },
  {
    id: '7',
    title: 'Bulgarian Black Sea Resorts See 30% Price Increase',
    excerpt: 'Property values along the Bulgarian Black Sea coast have surged, driven by both domestic demand and interest from Northern European retirees.',
    country: 'Bulgaria',
    countryCode: 'BG',
    source: 'Novinite',
    sourceUrl: 'https://www.novinite.com',
    date: '2026-02-26',
    category: 'market',
    imageGradient: 'from-violet-500 to-purple-400',
  },
  {
    id: '8',
    title: 'Kosovo Capital Prishtina Booms with New Residential Towers',
    excerpt: 'Prishtina\'s skyline is rapidly changing as developers break ground on multiple high-rise residential projects catering to the growing middle class.',
    country: 'Kosovo',
    countryCode: 'XK',
    source: 'Prishtina Insight',
    sourceUrl: 'https://prishtinainsight.com',
    date: '2026-02-25',
    category: 'development',
    imageGradient: 'from-cyan-500 to-teal-400',
  },
  {
    id: '9',
    title: 'Slovenia\'s Ljubljana Ranked Among Europe\'s Best for Property ROI',
    excerpt: 'A new European real estate report ranks Ljubljana in the top 10 cities for rental yield, with average returns of 6.2% annually.',
    country: 'Slovenia',
    countryCode: 'SI',
    source: 'The Slovenia Times',
    sourceUrl: 'https://sloveniatimes.com',
    date: '2026-02-24',
    category: 'investment',
    imageGradient: 'from-green-500 to-emerald-400',
  },
  {
    id: '10',
    title: 'Bosnia & Herzegovina Attracts Gulf Investors to Sarajevo Projects',
    excerpt: 'Major investment firms from the UAE and Saudi Arabia are funding luxury residential and commercial developments in Sarajevo\'s expanding city center.',
    country: 'Bosnia & Herzegovina',
    countryCode: 'BA',
    source: 'Sarajevo Times',
    sourceUrl: 'https://www.sarajevotimes.com',
    date: '2026-02-23',
    category: 'investment',
    imageGradient: 'from-yellow-500 to-amber-400',
  },
  {
    id: '11',
    title: 'Romania\'s Bucharest Sees Surge in Co-Living Developments',
    excerpt: 'Co-living spaces are becoming the latest trend in Bucharest, with several new projects targeting young professionals and expatriates.',
    country: 'Romania',
    countryCode: 'RO',
    source: 'Romania Insider',
    sourceUrl: 'https://www.romania-insider.com',
    date: '2026-02-22',
    category: 'development',
    imageGradient: 'from-blue-500 to-indigo-400',
  },
];

const COUNTRIES = ['All', 'Albania', 'Serbia', 'Croatia', 'Greece', 'Montenegro', 'North Macedonia', 'Bulgaria', 'Kosovo', 'Slovenia', 'Bosnia & Herzegovina', 'Romania'];

export function useRealEstateNews() {
  const [selectedCountry, setSelectedCountry] = useState('All');

  const filteredNews = useMemo(() => {
    if (selectedCountry === 'All') return NEWS_DATA;
    return NEWS_DATA.filter((item) => item.country === selectedCountry);
  }, [selectedCountry]);

  return {
    news: filteredNews,
    allNews: NEWS_DATA,
    countries: COUNTRIES,
    selectedCountry,
    setSelectedCountry,
  };
}
