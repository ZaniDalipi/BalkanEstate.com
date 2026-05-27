import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { getFeaturedCities } from '@/src/features/cities/api/cityApi';
import type { CityMarketData } from '@/src/shared/types';

interface PopularCitiesSectionProps {
  onNavigate: (view: string, path: string) => void;
}

const CityCardSkeleton: React.FC<{ large?: boolean }> = ({ large }) => (
  <div className={`relative overflow-hidden rounded-xl bg-slate-100 animate-pulse ${large ? 'sm:col-span-2 lg:col-span-2 aspect-[16/9]' : 'aspect-[4/3]'}`}>
    <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 space-y-2">
      <div className="h-4 bg-slate-200 rounded w-24" />
      <div className="h-3 bg-slate-200 rounded w-16" />
    </div>
  </div>
);

// Static seed cities for Balkan countries that may have no API coverage yet.
// They fill gaps so the grid always shows geographic diversity.
// listingsCount=0 so the card omits the count text; no marketTrend shown.
const STATIC_CITY_SEEDS: CityMarketData[] = [
  { _id: 'seed-bgd', city: 'Belgrade',      country: 'Serbia',           countryCode: 'RS', listingsCount: 0, marketTrend: 'stable', featured: true, displayOrder: 99, avgPricePerSqm: 0, medianPrice: 0, priceGrowthYoY: 0, priceGrowthMoM: 0, averageDaysOnMarket: 0, soldLastMonth: 0, demandScore: 0, rentalYield: 0, investmentScore: 0, topNeighborhoods: [], highlights: [], lastUpdated: '', dataSource: 'manual' },
  { _id: 'seed-nsad',city: 'Novi Sad',      country: 'Serbia',           countryCode: 'RS', listingsCount: 0, marketTrend: 'stable', featured: true, displayOrder: 99, avgPricePerSqm: 0, medianPrice: 0, priceGrowthYoY: 0, priceGrowthMoM: 0, averageDaysOnMarket: 0, soldLastMonth: 0, demandScore: 0, rentalYield: 0, investmentScore: 0, topNeighborhoods: [], highlights: [], lastUpdated: '', dataSource: 'manual' },
  { _id: 'seed-bdv', city: 'Budva',         country: 'Montenegro',       countryCode: 'ME', listingsCount: 0, marketTrend: 'rising', featured: true, displayOrder: 99, avgPricePerSqm: 0, medianPrice: 0, priceGrowthYoY: 0, priceGrowthMoM: 0, averageDaysOnMarket: 0, soldLastMonth: 0, demandScore: 0, rentalYield: 0, investmentScore: 0, topNeighborhoods: [], highlights: [], lastUpdated: '', dataSource: 'manual' },
  { _id: 'seed-ktr', city: 'Kotor',         country: 'Montenegro',       countryCode: 'ME', listingsCount: 0, marketTrend: 'rising', featured: true, displayOrder: 99, avgPricePerSqm: 0, medianPrice: 0, priceGrowthYoY: 0, priceGrowthMoM: 0, averageDaysOnMarket: 0, soldLastMonth: 0, demandScore: 0, rentalYield: 0, investmentScore: 0, topNeighborhoods: [], highlights: [], lastUpdated: '', dataSource: 'manual' },
  { _id: 'seed-pdg', city: 'Podgorica',     country: 'Montenegro',       countryCode: 'ME', listingsCount: 0, marketTrend: 'stable', featured: true, displayOrder: 99, avgPricePerSqm: 0, medianPrice: 0, priceGrowthYoY: 0, priceGrowthMoM: 0, averageDaysOnMarket: 0, soldLastMonth: 0, demandScore: 0, rentalYield: 0, investmentScore: 0, topNeighborhoods: [], highlights: [], lastUpdated: '', dataSource: 'manual' },
  { _id: 'seed-skp', city: 'Skopje',        country: 'North Macedonia',  countryCode: 'MK', listingsCount: 0, marketTrend: 'stable', featured: true, displayOrder: 99, avgPricePerSqm: 0, medianPrice: 0, priceGrowthYoY: 0, priceGrowthMoM: 0, averageDaysOnMarket: 0, soldLastMonth: 0, demandScore: 0, rentalYield: 0, investmentScore: 0, topNeighborhoods: [], highlights: [], lastUpdated: '', dataSource: 'manual' },
  { _id: 'seed-ohr', city: 'Ohrid',         country: 'North Macedonia',  countryCode: 'MK', listingsCount: 0, marketTrend: 'rising', featured: true, displayOrder: 99, avgPricePerSqm: 0, medianPrice: 0, priceGrowthYoY: 0, priceGrowthMoM: 0, averageDaysOnMarket: 0, soldLastMonth: 0, demandScore: 0, rentalYield: 0, investmentScore: 0, topNeighborhoods: [], highlights: [], lastUpdated: '', dataSource: 'manual' },
  { _id: 'seed-sjj', city: 'Sarajevo',      country: 'Bosnia',           countryCode: 'BA', listingsCount: 0, marketTrend: 'stable', featured: true, displayOrder: 99, avgPricePerSqm: 0, medianPrice: 0, priceGrowthYoY: 0, priceGrowthMoM: 0, averageDaysOnMarket: 0, soldLastMonth: 0, demandScore: 0, rentalYield: 0, investmentScore: 0, topNeighborhoods: [], highlights: [], lastUpdated: '', dataSource: 'manual' },
  { _id: 'seed-mst', city: 'Mostar',        country: 'Bosnia',           countryCode: 'BA', listingsCount: 0, marketTrend: 'stable', featured: true, displayOrder: 99, avgPricePerSqm: 0, medianPrice: 0, priceGrowthYoY: 0, priceGrowthMoM: 0, averageDaysOnMarket: 0, soldLastMonth: 0, demandScore: 0, rentalYield: 0, investmentScore: 0, topNeighborhoods: [], highlights: [], lastUpdated: '', dataSource: 'manual' },
  { _id: 'seed-zag', city: 'Zagreb',        country: 'Croatia',          countryCode: 'HR', listingsCount: 0, marketTrend: 'stable', featured: true, displayOrder: 99, avgPricePerSqm: 0, medianPrice: 0, priceGrowthYoY: 0, priceGrowthMoM: 0, averageDaysOnMarket: 0, soldLastMonth: 0, demandScore: 0, rentalYield: 0, investmentScore: 0, topNeighborhoods: [], highlights: [], lastUpdated: '', dataSource: 'manual' },
  { _id: 'seed-spl', city: 'Split',         country: 'Croatia',          countryCode: 'HR', listingsCount: 0, marketTrend: 'rising', featured: true, displayOrder: 99, avgPricePerSqm: 0, medianPrice: 0, priceGrowthYoY: 0, priceGrowthMoM: 0, averageDaysOnMarket: 0, soldLastMonth: 0, demandScore: 0, rentalYield: 0, investmentScore: 0, topNeighborhoods: [], highlights: [], lastUpdated: '', dataSource: 'manual' },
  { _id: 'seed-dbr', city: 'Dubrovnik',     country: 'Croatia',          countryCode: 'HR', listingsCount: 0, marketTrend: 'rising', featured: true, displayOrder: 99, avgPricePerSqm: 0, medianPrice: 0, priceGrowthYoY: 0, priceGrowthMoM: 0, averageDaysOnMarket: 0, soldLastMonth: 0, demandScore: 0, rentalYield: 0, investmentScore: 0, topNeighborhoods: [], highlights: [], lastUpdated: '', dataSource: 'manual' },
  { _id: 'seed-sof', city: 'Sofia',         country: 'Bulgaria',         countryCode: 'BG', listingsCount: 0, marketTrend: 'stable', featured: true, displayOrder: 99, avgPricePerSqm: 0, medianPrice: 0, priceGrowthYoY: 0, priceGrowthMoM: 0, averageDaysOnMarket: 0, soldLastMonth: 0, demandScore: 0, rentalYield: 0, investmentScore: 0, topNeighborhoods: [], highlights: [], lastUpdated: '', dataSource: 'manual' },
];

/**
 * Pick `count` cities ensuring maximum country diversity.
 * API cities (real listing data) are preferred; static seed cities fill
 * any countries not represented in the API response.
 */
function pickDiverseCities(apiCities: CityMarketData[], count: number): CityMarketData[] {
  const shuffle = <T,>(arr: T[]): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const shuffledApi   = shuffle(apiCities);
  const shuffledSeeds = shuffle(STATIC_CITY_SEEDS);

  const picked: CityMarketData[] = [];
  const seenCountries = new Set<string>();

  // Pass 1: one API city per country
  for (const city of shuffledApi) {
    if (picked.length >= count) break;
    if (!seenCountries.has(city.country)) {
      picked.push(city);
      seenCountries.add(city.country);
    }
  }

  // Pass 2: fill remaining slots with seeds from countries not yet shown
  for (const seed of shuffledSeeds) {
    if (picked.length >= count) break;
    if (!seenCountries.has(seed.country)) {
      picked.push(seed);
      seenCountries.add(seed.country);
    }
  }

  // Pass 3: if still short, add more API cities (multi-city from same country)
  for (const city of shuffledApi) {
    if (picked.length >= count) break;
    if (!picked.includes(city)) picked.push(city);
  }

  return picked;
}

const CITY_GRADIENTS = [
  'from-blue-700 via-blue-600 to-cyan-600',
  'from-violet-700 via-purple-600 to-indigo-600',
  'from-emerald-700 via-teal-600 to-cyan-600',
  'from-amber-700 via-orange-600 to-rose-600',
  'from-slate-700 via-slate-600 to-slate-500',
  'from-indigo-700 via-blue-600 to-sky-600',
];

const PopularCitiesSection: React.FC<PopularCitiesSectionProps> = ({ onNavigate }) => {
  const { t } = useTranslation(['home']);

  const { data: allCities = [], isLoading, isError } = useQuery<CityMarketData[]>({
    queryKey: ['featuredCities'],
    queryFn: () => getFeaturedCities(50),
    staleTime: 10 * 60 * 1000,
    retry: 2,
  });

  // Unique id per mount so cities re-shuffle every time the section appears
  const mountId = useRef(Math.random());

  // Pick 6 diverse cities, re-shuffled on every mount
  const cities = useMemo(
    () => pickDiverseCities(allCities, 6),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allCities, mountId.current]
  );

  // Wikipedia fallback images for cities without imageUrl
  const [wikiImages, setWikiImages] = useState<Record<string, string | null>>({});

  useEffect(() => {
    const fetchMissing = async () => {
      for (const city of cities) {
        if (city.imageUrl) continue;
        const key = city.city;
        if (wikiImages[key] !== undefined) continue;

        setWikiImages(prev => ({ ...prev, [key]: null }));
        const candidates = [city.city, `${city.city}, ${city.country}`, `${city.city} (city)`];
        for (const term of candidates) {
          try {
            const res = await fetch(
              `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(term)}`,
              { headers: { Accept: 'application/json' } }
            );
            if (!res.ok) continue;
            const data = await res.json();
            const src: string | undefined = data.originalimage?.source || data.thumbnail?.source;
            if (src) {
              setWikiImages(prev => ({ ...prev, [key]: src }));
              break;
            }
          } catch {
            // try next candidate
          }
        }
      }
    };
    if (cities.length > 0) fetchMissing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cities]);

  if (isError && cities.length === 0) return null;

  return (
    <section className="py-12 sm:py-16 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex items-end justify-between mb-8"
        >
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              {t('home:cities.title')}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {t('home:cities.subtitle')}
            </p>
          </div>
          <motion.button
            whileHover={{ x: 3 }}
            onClick={() => onNavigate('explore-cities', '/explore-cities')}
            className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            {t('home:cities.viewAll')}
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </motion.button>
        </motion.div>

        {/* Loading skeletons */}
        {isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <CityCardSkeleton key={i} large={i < 2} />
            ))}
          </div>
        )}

        {/* Cities grid */}
        {!isLoading && cities.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {cities.slice(0, 6).map((city, i) => (
              <motion.button
                key={city._id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ delay: i * 0.08, type: 'spring', stiffness: 300, damping: 30 }}
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onNavigate('explore-cities', `/explore-cities/${encodeURIComponent(city.city)}/${encodeURIComponent(city.country)}`)}
                className={`group relative overflow-hidden rounded-xl ${i < 2 ? 'sm:col-span-2 lg:col-span-2 aspect-[16/9]' : 'aspect-[4/3]'}`}
              >
                {(city.imageUrl || typeof wikiImages[city.city] === 'string') ? (
                  <img
                    src={(city.imageUrl || wikiImages[city.city])!}
                    alt={city.city}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="eager"
                  />
                ) : (
                  <div className={`w-full h-full bg-gradient-to-br ${CITY_GRADIENTS[i % CITY_GRADIENTS.length]} group-hover:scale-105 transition-transform duration-500`} />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4">
                  <h3 className="text-base sm:text-lg font-bold text-white">{city.city}</h3>
                  <p className="text-xs sm:text-sm text-white/70">{city.country}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {city.listingsCount > 0 && (
                      <p className="text-xs text-white/60">
                        {t('home:cities.propertiesCount', { count: city.listingsCount })}
                      </p>
                    )}
                    {city.marketTrend && city.listingsCount > 0 && (
                      <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                        city.marketTrend === 'rising' ? 'bg-emerald-500/20 text-emerald-300' :
                        city.marketTrend === 'declining' ? 'bg-red-500/20 text-red-300' :
                        'bg-white/15 text-white/70'
                      }`}>
                        {city.marketTrend === 'rising' ? '↑' : city.marketTrend === 'declining' ? '↓' : '→'}
                      </span>
                    )}
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && cities.length === 0 && !isError && (
          <div className="text-center py-12 text-slate-400 text-sm">
            {t('home:cities.noData', 'No featured cities available yet.')}
          </div>
        )}

        {/* Mobile view all */}
        <div className="mt-6 text-center sm:hidden">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onNavigate('explore-cities', '/explore-cities')}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-700 bg-neutral-100 hover:bg-neutral-200 transition-colors"
          >
            {t('home:cities.viewAll')}
          </motion.button>
        </div>
      </div>
    </section>
  );
};

export default PopularCitiesSection;
