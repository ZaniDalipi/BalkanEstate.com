import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { getFeaturedCities } from '@/src/features/cities/api/cityApi';
import type { CityMarketData } from '@/src/shared/types';

// Fetch city thumbnail from Wikipedia REST API (CORS-enabled)
async function fetchCityImage(cityName: string): Promise<string | null> {
  try {
    const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cityName)}`);
    if (!res.ok) return null;
    const data = await res.json();
    // Use original image for better quality, fall back to thumbnail
    return data.originalimage?.source || data.thumbnail?.source || null;
  } catch {
    return null;
  }
}

function useCityImages(cities: CityMarketData[]) {
  return useQuery({
    queryKey: ['cityImages', cities.map(c => c.city).join(',')],
    queryFn: async () => {
      const entries = await Promise.all(
        cities.map(async (c) => {
          const url = await fetchCityImage(c.city);
          return [c.city, url] as const;
        })
      );
      return Object.fromEntries(entries) as Record<string, string | null>;
    },
    enabled: cities.length > 0,
    staleTime: 24 * 60 * 60 * 1000, // Cache for 24h
    gcTime: 48 * 60 * 60 * 1000,
  });
}

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

  const { data: cities = [], isLoading, isError } = useQuery<CityMarketData[]>({
    queryKey: ['featuredCities'],
    queryFn: () => getFeaturedCities(6),
    staleTime: 10 * 60 * 1000,
    retry: 2,
  });

  const { data: cityImages = {} } = useCityImages(cities);

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
                {cityImages[city.city] ? (
                  <img
                    src={cityImages[city.city]!}
                    alt={city.city}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                ) : (
                  <div className={`w-full h-full bg-gradient-to-br ${CITY_GRADIENTS[i % CITY_GRADIENTS.length]} group-hover:scale-105 transition-transform duration-500`} />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4">
                  <h3 className="text-base sm:text-lg font-bold text-white">{city.city}</h3>
                  <p className="text-xs sm:text-sm text-white/70">{city.country}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-white/60">
                      {t('home:cities.propertiesCount', { count: city.listingsCount || 0 })}
                    </p>
                    {city.marketTrend && (
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
