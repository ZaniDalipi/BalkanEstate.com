import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

interface HeroSectionProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onSearch: () => void;
  onNavigate: (view: string, path: string) => void;
}

const POPULAR_CITIES = ['Tirana', 'Belgrade', 'Skopje', 'Pristina', 'Sarajevo', 'Zagreb'];

const HeroSection: React.FC<HeroSectionProps> = ({
  searchQuery,
  onSearchChange,
  onSearch,
  onNavigate,
}) => {
  const { t } = useTranslation(['home']);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') onSearch();
    },
    [onSearch]
  );

  return (
    <section className="relative bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 overflow-hidden">
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
        backgroundSize: '60px 60px'
      }} />

      {/* Gradient orbs */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-500/8 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/4" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 pt-16 pb-20 sm:pt-24 sm:pb-28">
        {/* Badge */}
        <div className="flex justify-center mb-6">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium bg-white/10 text-blue-200 border border-white/10 backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {t('home:hero.badge')}
          </span>
        </div>

        {/* Title */}
        <h1 className="text-center text-3xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-tight max-w-3xl mx-auto">
          {t('home:hero.title')}{' '}
          <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
            {t('home:hero.titleHighlight')}
          </span>
          <br className="hidden sm:block" />
          <span className="text-white/80 text-2xl sm:text-4xl lg:text-5xl font-semibold">
            {' '}{t('home:hero.titleEnd')}
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mt-5 text-center text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
          {t('home:hero.subtitle')}
        </p>

        {/* Search Bar */}
        <div className="mt-10 max-w-2xl mx-auto">
          <div className="flex items-center bg-white rounded-2xl shadow-2xl shadow-black/20 overflow-hidden">
            <div className="flex-1 flex items-center px-4 sm:px-5">
              <svg className="w-5 h-5 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('home:hero.searchPlaceholder')}
                className="flex-1 py-4 sm:py-4.5 px-3 text-sm sm:text-base text-slate-800 placeholder-slate-400 bg-transparent outline-none"
                aria-label={t('home:hero.searchPlaceholder')}
              />
            </div>
            <button
              onClick={onSearch}
              className="px-6 sm:px-8 py-4 sm:py-4.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm sm:text-base transition-colors flex-shrink-0"
              aria-label={t('home:hero.searchButton')}
            >
              {t('home:hero.searchButton')}
            </button>
          </div>

          {/* Popular searches */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs text-slate-400">{t('home:hero.popularSearches')}</span>
            {POPULAR_CITIES.map((city) => (
              <button
                key={city}
                onClick={() => {
                  onSearchChange(city);
                  onSearch();
                }}
                className="px-3 py-1 rounded-full text-xs font-medium text-slate-300 bg-white/8 hover:bg-white/15 border border-white/10 transition-colors"
              >
                {city}
              </button>
            ))}
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            onClick={() => onNavigate('search', '/search')}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-white text-slate-900 hover:bg-slate-100 transition-colors shadow-lg"
          >
            {t('home:hero.ctaBuy')}
          </button>
          <button
            onClick={() => onNavigate('rentals', '/rent')}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-white/10 text-white border border-white/20 hover:bg-white/20 transition-colors backdrop-blur-sm"
          >
            {t('home:hero.ctaRent')}
          </button>
          <button
            onClick={() => onNavigate('create-listing', '/create-listing')}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-white/10 text-white border border-white/20 hover:bg-white/20 transition-colors backdrop-blur-sm"
          >
            {t('home:hero.ctaSell')}
          </button>
        </div>

        {/* Stats Strip */}
        <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 max-w-2xl mx-auto">
          {[
            { value: '10,000+', label: t('home:stats.properties') },
            { value: '11', label: t('home:stats.countries') },
            { value: '500+', label: t('home:stats.agents') },
            { value: '10', label: t('home:stats.languages') },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-white">{stat.value}</div>
              <div className="text-xs sm:text-sm text-slate-400 mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
