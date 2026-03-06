import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

interface HeroSectionProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onSearch: () => void;
  onNavigate: (view: string, path: string) => void;
}

const POPULAR_CITIES = ['Tirana', 'Belgrade', 'Skopje', 'Pristina', 'Sarajevo', 'Zagreb'];

const AnimatedCounter: React.FC<{ value: string; label: string; icon: React.ReactNode; accent: string }> = ({
  value,
  label,
  icon,
  accent,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5 }}
    className="flex items-center gap-3 sm:gap-4"
  >
    <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl ${accent} flex items-center justify-center flex-shrink-0`}>
      {icon}
    </div>
    <div className="text-left">
      <div className="text-xl sm:text-2xl font-bold text-white leading-none">{value}</div>
      <div className="text-[11px] sm:text-xs text-slate-400 mt-0.5 leading-tight">{label}</div>
    </div>
  </motion.div>
);

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

  const stats = [
    {
      value: '12,500+',
      label: t('home:stats.properties'),
      accent: 'bg-blue-500/20',
      icon: (
        <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
      ),
    },
    {
      value: '11',
      label: t('home:stats.countries'),
      accent: 'bg-emerald-500/20',
      icon: (
        <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5a17.92 17.92 0 0 1-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
        </svg>
      ),
    },
    {
      value: '1,200+',
      label: t('home:stats.agents'),
      accent: 'bg-violet-500/20',
      icon: (
        <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
        </svg>
      ),
    },
    {
      value: '10',
      label: t('home:stats.languages'),
      accent: 'bg-amber-500/20',
      icon: (
        <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m10.5 21 5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 0 1 6-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.148 15.08 2 17.558m15.849-6.13c-1.588.894-3.296 1.613-5.094 2.128" />
        </svg>
      ),
    },
  ];

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

        {/* Stats Strip - Modern card design */}
        <div className="mt-14 max-w-3xl mx-auto">
          <div className="bg-white/[0.06] backdrop-blur-md border border-white/10 rounded-2xl px-6 py-5 sm:px-8 sm:py-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8">
              {stats.map((stat, i) => (
                <AnimatedCounter
                  key={i}
                  value={stat.value}
                  label={stat.label}
                  icon={stat.icon}
                  accent={stat.accent}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
