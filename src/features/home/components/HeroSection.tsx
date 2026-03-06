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

        {/* Liquid Glass Search Bar */}
        <div className="mt-10 max-w-2xl mx-auto">
          <div
            className="relative group rounded-[20px] p-[1px]"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.15) 100%)',
            }}
          >
            {/* Inner glow */}
            <div className="absolute -inset-1 rounded-[22px] bg-blue-400/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div
              className="relative flex items-center rounded-[19px] overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.06) 100%)',
                backdropFilter: 'blur(40px) saturate(1.8)',
                WebkitBackdropFilter: 'blur(40px) saturate(1.8)',
              }}
            >
              {/* Search icon */}
              <div className="pl-5 sm:pl-6 flex-shrink-0">
                <svg className="w-[18px] h-[18px] text-white/50" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
              </div>

              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('home:hero.searchPlaceholder')}
                className="flex-1 py-4 sm:py-5 px-3 text-sm sm:text-base text-white placeholder-white/35 bg-transparent outline-none"
                aria-label={t('home:hero.searchPlaceholder')}
              />

              <button
                onClick={onSearch}
                className="m-2 px-5 sm:px-6 py-2.5 sm:py-3 rounded-[14px] text-sm font-semibold text-white flex-shrink-0 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, rgba(59,130,246,0.8) 0%, rgba(37,99,235,0.9) 100%)',
                  backdropFilter: 'blur(20px)',
                  boxShadow: '0 2px 16px rgba(59,130,246,0.3), inset 0 1px 0 rgba(255,255,255,0.15)',
                }}
                aria-label={t('home:hero.searchButton')}
              >
                {t('home:hero.searchButton')}
              </button>
            </div>
          </div>

          {/* Popular searches - glass pills */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs text-white/30 font-medium">{t('home:hero.popularSearches')}</span>
            {POPULAR_CITIES.map((city) => (
              <button
                key={city}
                onClick={() => {
                  onSearchChange(city);
                  onSearch();
                }}
                className="px-3.5 py-1.5 rounded-full text-xs font-medium text-white/60 hover:text-white/90 transition-all duration-300 hover:scale-[1.03]"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                {city}
              </button>
            ))}
          </div>
        </div>

        {/* CTA Buttons - glass style */}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            onClick={() => onNavigate('search', '/search')}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold text-slate-900 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,1)',
            }}
          >
            {t('home:hero.ctaBuy')}
          </button>
          <button
            onClick={() => onNavigate('rentals', '/rent')}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white/90 hover:text-white transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.15)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)',
            }}
          >
            {t('home:hero.ctaRent')}
          </button>
          <button
            onClick={() => onNavigate('create-listing', '/create-listing')}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white/90 hover:text-white transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.15)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)',
            }}
          >
            {t('home:hero.ctaSell')}
          </button>
        </div>

        {/* Stats Strip - Glass card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-14 max-w-3xl mx-auto"
        >
          <div
            className="rounded-2xl px-6 py-5 sm:px-8 sm:py-6"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
              backdropFilter: 'blur(40px) saturate(1.5)',
              WebkitBackdropFilter: 'blur(40px) saturate(1.5)',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.08)',
            }}
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8">
              {[
                { value: '12,500+', label: t('home:stats.properties') },
                { value: '11', label: t('home:stats.countries') },
                { value: '1,200+', label: t('home:stats.agents') },
                { value: '10', label: t('home:stats.languages') },
              ].map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-white leading-none">{stat.value}</div>
                  <div className="text-[11px] sm:text-xs text-white/40 mt-1 font-medium">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
