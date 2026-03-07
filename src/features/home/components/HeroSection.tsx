import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, useInView } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Typewriter } from '@/src/components/ui/typewriter';
import { apiRequest } from '@/src/shared/api';
import { getFeaturedCities } from '@/src/features/cities/api/cityApi';

interface HeroSectionProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onSearch: () => void;
  onNavigate: (view: string, path: string) => void;
}

interface PlatformStats {
  properties: number;
  countries: number;
  agents: number;
  languages: number;
}

/* ─── Animated number counter ─── */
const AnimatedNumber: React.FC<{ value: string; delay?: number }> = ({ value, delay = 0 }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const [display, setDisplay] = useState('0');

  const numericMatch = value.match(/^([\d,]+)(.*)$/);
  const targetNum = numericMatch ? parseInt(numericMatch[1].replace(/,/g, ''), 10) : 0;
  const suffix = numericMatch ? numericMatch[2] : value;

  React.useEffect(() => {
    if (!isInView) return;
    const timeout = setTimeout(() => {
      const duration = 1500;
      const start = Date.now();
      const tick = () => {
        const elapsed = Date.now() - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplay(Math.floor(eased * targetNum).toLocaleString());
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, delay);
    return () => clearTimeout(timeout);
  }, [isInView, targetNum, delay]);

  return <span ref={ref}>{display}{suffix}</span>;
};

/* ─── Simple fade-in variants ─── */
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const HeroSection: React.FC<HeroSectionProps> = ({
  searchQuery,
  onSearchChange,
  onSearch,
  onNavigate,
}) => {
  const { t } = useTranslation(['home']);
  const [isFocused, setIsFocused] = useState(false);

  // Fetch real stats from backend
  const { data: stats } = useQuery<PlatformStats>({
    queryKey: ['platformStats'],
    queryFn: async () => {
      try {
        const [propsRes, agentsRes] = await Promise.all([
          apiRequest<{ pagination?: { total?: number } }>('/properties?limit=1&status=active', { requiresAuth: false }),
          apiRequest<{ agents?: unknown[] }>('/agents?limit=1', { requiresAuth: false }),
        ]);
        return {
          properties: propsRes.pagination?.total || 0,
          countries: 11,
          agents: Array.isArray(agentsRes.agents) ? agentsRes.agents.length : 0,
          languages: 10,
        };
      } catch {
        return { properties: 0, countries: 11, agents: 0, languages: 10 };
      }
    },
    staleTime: 15 * 60 * 1000,
    retry: 1,
  });

  // Fetch popular cities dynamically
  const { data: popularCities = [] } = useQuery({
    queryKey: ['popularCitiesHero'],
    queryFn: async () => {
      try {
        const cities = await getFeaturedCities(6);
        return cities.map(c => c.city);
      } catch {
        return [];
      }
    },
    staleTime: 15 * 60 * 1000,
    retry: 1,
  });

  const displayCities = popularCities.length > 0 ? popularCities : ['Tirana', 'Belgrade', 'Skopje', 'Pristina', 'Sarajevo', 'Zagreb'];

  const formatStat = (value: number): string => {
    if (value >= 10000) return `${Math.floor(value / 1000)},${String(value % 1000).padStart(3, '0')}+`;
    if (value >= 1000) return `${value.toLocaleString()}+`;
    if (value > 0) return `${value}+`;
    return '—';
  };

  const statsDisplay = useMemo(() => [
    { value: stats ? formatStat(stats.properties) : '—', label: t('home:stats.properties'), delay: 200 },
    { value: stats ? String(stats.countries) : '—', label: t('home:stats.countries'), delay: 400 },
    { value: stats ? formatStat(stats.agents) : '—', label: t('home:stats.agents'), delay: 600 },
    { value: stats ? String(stats.languages) : '—', label: t('home:stats.languages'), delay: 800 },
  ], [stats, t]);

  const typewriterWords = useMemo(
    () => [
      t('home:hero.titleHighlight', 'Dream Home'),
      t('home:hero.typewriterWord2', 'Perfect Villa'),
      t('home:hero.typewriterWord3', 'Ideal Apartment'),
      t('home:hero.typewriterWord4', 'New Beginning'),
    ],
    [t]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        onSearch();
      }
    },
    [onSearch]
  );

  const handleCityClick = useCallback(
    (city: string) => {
      onSearchChange(city);
      setTimeout(() => onSearch(), 0);
    },
    [onSearchChange, onSearch]
  );

  return (
    <section className="relative bg-gradient-to-b from-slate-50 via-white to-white overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-[300px] sm:w-[400px] h-[300px] sm:h-[400px] rounded-full blur-[120px] bg-blue-100/50 -translate-y-1/4 translate-x-1/4" />
      <div className="absolute bottom-0 left-0 w-[200px] sm:w-[300px] h-[200px] sm:h-[300px] rounded-full blur-[100px] bg-indigo-100/30 translate-y-1/4 -translate-x-1/4" />

      <motion.div
        className="relative z-10 max-w-6xl mx-auto px-4 pt-12 pb-16 sm:pt-24 sm:pb-28"
        variants={stagger}
        initial="hidden"
        animate="visible"
      >
        {/* Badge */}
        <motion.div className="flex justify-center mb-4 sm:mb-6" variants={fadeUp}>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] sm:text-xs font-medium text-blue-700 border border-blue-200/60 bg-blue-50/80">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {t('home:hero.badge')}
          </span>
        </motion.div>

        {/* Title */}
        <motion.h1
          className="text-center text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 tracking-tight leading-tight max-w-3xl mx-auto"
          variants={fadeUp}
        >
          {t('home:hero.title')}{' '}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-cyan-600 to-indigo-600">
            <Typewriter
              words={typewriterWords}
              speed={80}
              delayBetweenWords={2000}
              cursor={true}
              cursorChar="|"
            />
          </span>
          <br className="hidden sm:block" />
          <span className="text-slate-600 text-xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold">
            {' '}{t('home:hero.titleEnd')}
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          className="mt-4 sm:mt-5 text-center text-sm sm:text-base md:text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed px-2"
          variants={fadeUp}
        >
          {t('home:hero.subtitle')}
        </motion.p>

        {/* Search Bar */}
        <motion.div className="mt-8 sm:mt-10 max-w-2xl mx-auto" variants={fadeUp}>
          <div
            className={`flex items-center rounded-2xl bg-white border transition-shadow duration-200 ${
              isFocused
                ? 'border-blue-300 shadow-[0_0_0_2px_rgba(59,130,246,0.2),0_8px_24px_rgba(0,0,0,0.06)]'
                : 'border-neutral-200 shadow-sm'
            }`}
          >
            <div className="pl-4 sm:pl-6 flex-shrink-0">
              <svg
                className={`w-4 h-4 sm:w-[18px] sm:h-[18px] transition-colors ${isFocused ? 'text-blue-500' : 'text-slate-400'}`}
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
            </div>

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={t('home:hero.searchPlaceholder')}
              className="flex-1 py-3.5 sm:py-5 px-3 text-sm sm:text-base text-slate-900 placeholder-slate-400 bg-transparent outline-none min-w-0"
              aria-label={t('home:hero.searchPlaceholder')}
            />

            <button
              onClick={onSearch}
              className="m-1.5 sm:m-2 px-4 sm:px-6 py-2 sm:py-3 rounded-xl text-xs sm:text-sm font-semibold text-white flex-shrink-0 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-colors"
              aria-label={t('home:hero.searchButton')}
            >
              {t('home:hero.searchButton')}
            </button>
          </div>

          {/* Popular searches */}
          <div className="mt-3 sm:mt-4 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
            <span className="text-[10px] sm:text-xs text-slate-400 font-medium">
              {t('home:hero.popularSearches')}
            </span>
            {displayCities.map((city) => (
              <button
                key={city}
                onClick={() => handleCityClick(city)}
                className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-medium text-slate-500 bg-white border border-neutral-200 hover:border-neutral-300 hover:text-slate-800 active:bg-neutral-50 transition-colors"
              >
                {city}
              </button>
            ))}
          </div>
        </motion.div>

        {/* CTA Buttons */}
        <motion.div className="mt-6 sm:mt-8 flex flex-wrap justify-center gap-2 sm:gap-3" variants={fadeUp}>
          <button
            onClick={() => onNavigate('search', '/search')}
            className="px-5 sm:px-6 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 active:bg-slate-700 transition-colors"
          >
            {t('home:hero.ctaBuy')}
          </button>
          {[
            { label: t('home:hero.ctaRent'), action: () => onNavigate('rentals', '/rent') },
            { label: t('home:hero.ctaSell'), action: () => onNavigate('create-listing', '/create-listing') },
          ].map((btn, i) => (
            <button
              key={i}
              onClick={btn.action}
              className="px-5 sm:px-6 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 border border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300 active:bg-neutral-100 transition-colors"
            >
              {btn.label}
            </button>
          ))}
        </motion.div>

        {/* Stats Strip */}
        <motion.div className="mt-10 sm:mt-14 max-w-3xl mx-auto" variants={fadeUp}>
          <div className="rounded-2xl px-4 py-4 sm:px-8 sm:py-6 bg-white border border-neutral-200/80 shadow-sm">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8">
              {statsDisplay.map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 leading-none">
                    {stat.value !== '—' ? (
                      <AnimatedNumber value={stat.value} delay={stat.delay} />
                    ) : (
                      <span className="inline-block w-12 h-6 sm:h-8 bg-slate-100 rounded animate-pulse" />
                    )}
                  </div>
                  <div className="text-[10px] sm:text-xs text-slate-400 mt-1 font-medium">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
};

export default HeroSection;
