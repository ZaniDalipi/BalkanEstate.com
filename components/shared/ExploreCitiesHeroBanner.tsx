import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MapPinIcon,
  BuildingOfficeIcon,
  GlobeAltIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  HomeIcon
} from '@/constants';

interface ExploreCitiesHeroBannerProps {
  totalCities: number;
  totalCountries: number;
  totalListings: number;
  avgGrowth: number;
  selectedCountry: string;
  countries: string[];
  onCountryChange: (country: string) => void;
}

const ExploreCitiesHeroBanner: React.FC<ExploreCitiesHeroBannerProps> = ({
  totalCities,
  totalCountries,
  totalListings,
  avgGrowth,
  selectedCountry,
  countries,
  onCountryChange
}) => {
  const { t } = useTranslation(['exploreCities']);

  return (
    <div className="relative overflow-hidden">
      {/* Dramatic gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-violet-900 to-purple-900" />

      {/* Animated gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-violet-500/20 via-transparent to-fuchsia-500/20 animate-pulse" style={{ animationDuration: '4s' }} />

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 opacity-10">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="explore-cities-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#explore-cities-grid)" />
        </svg>
      </div>

      {/* Floating orbs - optimized with will-change and reduced blur */}
      <div className="absolute top-10 left-[10%] w-72 h-72 bg-violet-500/20 rounded-full blur-2xl" style={{ willChange: 'opacity' }} />
      <div className="absolute bottom-10 right-[10%] w-96 h-96 bg-fuchsia-500/20 rounded-full blur-2xl" style={{ willChange: 'opacity' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-2xl" />

      {/* Floating icons - decorative (optimized with will-change) */}
      <div className="absolute top-20 left-[5%] opacity-20 hidden lg:block animate-float" style={{ willChange: 'transform' }}>
        <GlobeAltIcon className="w-16 h-16 text-white" />
      </div>
      <div className="absolute bottom-32 right-[8%] opacity-15 hidden lg:block animate-float" style={{ animationDelay: '1.5s', willChange: 'transform' }}>
        <MapPinIcon className="w-20 h-20 text-white" />
      </div>
      <div className="absolute top-40 right-[15%] opacity-10 hidden xl:block animate-float" style={{ animationDelay: '2s', willChange: 'transform' }}>
        <BuildingOfficeIcon className="w-24 h-24 text-white" />
      </div>

      {/* Main content */}
      <div className="relative z-10 px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        <div className="max-w-7xl mx-auto">
          {/* Badge */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
              <span className="text-white/90 font-semibold text-sm uppercase tracking-wider">
                {t('hero.badge', 'Market Intelligence')}
              </span>
            </div>
          </div>

          {/* Main heading */}
          <div className="text-center mb-8 sm:mb-10">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white mb-4 sm:mb-6 leading-tight">
              {t('hero.title', 'Explore Real Estate')}
              <span className="block mt-2 bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
                {t('hero.titleHighlight', 'Markets Across the Balkans')}
              </span>
            </h1>
            <p className="text-base sm:text-lg lg:text-xl text-white/70 max-w-3xl mx-auto leading-relaxed">
              {t('hero.subtitle', 'Discover emerging opportunities and market trends in {{count}} cities across the region', { count: totalCities })}
            </p>
          </div>

          {/* Stats row - Glass morphism cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 max-w-4xl mx-auto mb-8 sm:mb-10">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-violet-600 rounded-xl sm:rounded-2xl blur-lg opacity-50 group-hover:opacity-70 transition-opacity" />
              <div className="relative bg-white/10 backdrop-blur-md rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-5 border border-white/20 text-center hover:bg-white/15 transition-all">
                <div className="w-9 h-9 sm:w-10 sm:h-10 mx-auto mb-2 sm:mb-3 bg-violet-500 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/30">
                  <MapPinIcon className="w-5 h-5 sm:w-5 sm:h-5 text-white" />
                </div>
                <div className="text-xl sm:text-2xl lg:text-3xl font-black text-white mb-1">{totalCities}</div>
                <div className="text-[10px] sm:text-xs text-white/60 font-medium uppercase tracking-wide">
                  {t('stats.totalCities', 'Cities')}
                </div>
              </div>
            </div>

            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500 to-fuchsia-600 rounded-xl sm:rounded-2xl blur-lg opacity-50 group-hover:opacity-70 transition-opacity" />
              <div className="relative bg-white/10 backdrop-blur-md rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-5 border border-white/20 text-center hover:bg-white/15 transition-all">
                <div className="w-9 h-9 sm:w-10 sm:h-10 mx-auto mb-2 sm:mb-3 bg-fuchsia-500 rounded-xl flex items-center justify-center shadow-lg shadow-fuchsia-500/30">
                  <GlobeAltIcon className="w-5 h-5 sm:w-5 sm:h-5 text-white" />
                </div>
                <div className="text-xl sm:text-2xl lg:text-3xl font-black text-white mb-1">{totalCountries}</div>
                <div className="text-[10px] sm:text-xs text-white/60 font-medium uppercase tracking-wide">
                  {t('stats.countries', 'Countries')}
                </div>
              </div>
            </div>

            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl sm:rounded-2xl blur-lg opacity-50 group-hover:opacity-70 transition-opacity" />
              <div className="relative bg-white/10 backdrop-blur-md rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-5 border border-white/20 text-center hover:bg-white/15 transition-all">
                <div className="w-9 h-9 sm:w-10 sm:h-10 mx-auto mb-2 sm:mb-3 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                  <ArrowTrendingUpIcon className="w-5 h-5 sm:w-5 sm:h-5 text-white" />
                </div>
                <div className="text-xl sm:text-2xl lg:text-3xl font-black text-emerald-400 mb-1">+{avgGrowth.toFixed(1)}%</div>
                <div className="text-[10px] sm:text-xs text-white/60 font-medium uppercase tracking-wide">
                  {t('stats.avgGrowth', 'Avg Growth')}
                </div>
              </div>
            </div>

            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl sm:rounded-2xl blur-lg opacity-50 group-hover:opacity-70 transition-opacity" />
              <div className="relative bg-white/10 backdrop-blur-md rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-5 border border-white/20 text-center hover:bg-white/15 transition-all">
                <div className="w-9 h-9 sm:w-10 sm:h-10 mx-auto mb-2 sm:mb-3 bg-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-pink-500/30">
                  <HomeIcon className="w-5 h-5 sm:w-5 sm:h-5 text-white" />
                </div>
                <div className="text-xl sm:text-2xl lg:text-3xl font-black text-white mb-1">{totalListings.toLocaleString()}</div>
                <div className="text-[10px] sm:text-xs text-white/60 font-medium uppercase tracking-wide">
                  {t('stats.totalListings', 'Listings')}
                </div>
              </div>
            </div>
          </div>

          {/* Country Filter - Glass morphism */}
          <div className="max-w-3xl mx-auto">
            <div className="relative bg-white/10 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-white/20 shadow-2xl">
              <div className="text-center mb-4">
                <h2 className="text-lg sm:text-xl font-bold text-white mb-1">
                  {t('hero.filterTitle', 'Filter by Country')}
                </h2>
                <p className="text-white/60 text-xs sm:text-sm">
                  {t('hero.filterSubtitle', 'Explore markets in specific regions')}
                </p>
              </div>

              <div className="flex flex-wrap justify-center gap-2">
                <button
                  onClick={() => onCountryChange('all')}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 ${
                    selectedCountry === 'all'
                      ? 'bg-white text-slate-900 shadow-lg'
                      : 'bg-white/10 text-white/80 hover:bg-white/20 border border-white/20'
                  }`}
                >
                  {t('filters.allCountries', 'All Countries')} ({totalCities})
                </button>
                {countries.map((country) => (
                  <button
                    key={country}
                    onClick={() => onCountryChange(country)}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 ${
                      selectedCountry === country
                        ? 'bg-white text-slate-900 shadow-lg'
                        : 'bg-white/10 text-white/80 hover:bg-white/20 border border-white/20'
                    }`}
                  >
                    {country}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mt-8 sm:mt-10">
            <div className="flex items-center gap-2 text-white/50">
              <ChartBarIcon className="w-4 h-4 sm:w-5 sm:h-5 text-violet-400" />
              <span className="text-xs sm:text-sm font-medium">{t('badges.realTimeData', 'Real-Time Data')}</span>
            </div>
            <div className="hidden sm:block w-1 h-1 bg-white/30 rounded-full" />
            <div className="flex items-center gap-2 text-white/50">
              <SparklesIcon className="w-4 h-4 sm:w-5 sm:h-5 text-fuchsia-400" />
              <span className="text-xs sm:text-sm font-medium">{t('badges.aiInsights', 'AI Insights')}</span>
            </div>
            <div className="hidden sm:block w-1 h-1 bg-white/30 rounded-full" />
            <div className="flex items-center gap-2 text-white/50">
              <ArrowTrendingUpIcon className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
              <span className="text-xs sm:text-sm font-medium">{t('badges.marketTrends', 'Market Trends')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom wave decoration */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg className="w-full h-12 sm:h-16 lg:h-20" viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
          <path d="M0 80L60 74.7C120 69 240 59 360 53.3C480 48 600 48 720 53.3C840 59 960 69 1080 69.3C1200 69 1320 59 1380 53.3L1440 48V80H1380C1320 80 1200 80 1080 80C960 80 840 80 720 80C600 80 480 80 360 80C240 80 120 80 60 80H0Z" fill="white" fillOpacity="0.05"/>
          <path d="M0 80L60 77.3C120 75 240 69 360 64C480 59 600 53 720 53.3C840 53 960 59 1080 61.3C1200 64 1320 64 1380 64L1440 64V80H1380C1320 80 1200 80 1080 80C960 80 840 80 720 80C600 80 480 80 360 80C240 80 120 80 60 80H0Z" fill="#f9fafb"/>
        </svg>
      </div>

      {/* CSS for animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default memo(ExploreCitiesHeroBanner);
